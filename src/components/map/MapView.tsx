import React, { useEffect, useRef, useState, useMemo } from "react";
import html2canvas from "html2canvas";
import { CropSquare, Download } from "@mui/icons-material";
import {
  Search,
  Close,
  Add,
  Remove,
  MyLocation,
  LocationOn,
  Info,
  Assignment,
  Groups,
  Layers,
  Notes,
  Straighten,
  AltRoute,
  Home,
  Map as MapIcon,
  Park,
  // CropSquare,
} from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import Overlay from "ol/Overlay";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import WKT from "ol/format/WKT";
import XYZ from "ol/source/XYZ";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import Feature from "ol/Feature";
import { fromLonLat, toLonLat } from "ol/proj";
import { easeOut } from "ol/easing";
import { Style, Fill, Stroke, Icon } from "ol/style";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import ScaleLine from "ol/control/ScaleLine";
import { BHOPAL_CENTER } from "../../data/mockdata";
import type { MapMarker } from "../../types/index.type";
import HomePin from "../../assets/mapLocation/Home.svg";
import LandusePin from "../../assets/mapLocation/Landuse.svg";
import ParkPin from "../../assets/mapLocation/Park.svg";
import RoadPin from "../../assets/mapLocation/Road.svg";
// import { DescriptionRenderer } from "../common/DescriptionsReader";
import { generateAndDownloadPdf } from "../../services/pdf.service";
import { SCALE_OPTIONS, scaleToResolution } from "../../utils/mapScale";
import ExportScaleModal from "./ExportScaleModal";
import Legend from "../../assets/legend.png";

/* ============ CATEGORY COLORS ============ */
const markerColors: Record<string, string> = {
  Road: "#ef4444",
  Residential: "#f59e0b",
  Landuse: "#3b82f6",
  "Green Zone": "#22c55e",
};

const MARKER_SVGS: Record<string, string> = {
  Residential: HomePin,
  Landuse: LandusePin,
  "Green Zone": ParkPin,
  Road: RoadPin,
};

/* ============ CATEGORY NORMALIZER (from raw obj_type) ============ */
const normalizeCategory = (objType: string): string => {
  const t = (objType || "").toLowerCase();
  if (t.includes("road")) return "Road";
  if (t.includes("residential")) return "Residential";
  if (t.includes("agriculture") || t.includes("green zone"))
    return "Green Zone";
  if (t.includes("landuse")) return "Landuse";
  return "Landuse";
};

/* ============ CATEGORY → ICON ============ */
const getCategoryIcon = (
  category: string,
  size: number = 14,
): React.ReactNode => {
  const iconProps = { sx: { fontSize: size } };
  switch (category) {
    case "Road":
      return <AltRoute {...iconProps} />;
    case "Residential":
      return <Home {...iconProps} />;
    case "Landuse":
      return <MapIcon {...iconProps} />;
    case "Green Zone":
      return <Park {...iconProps} />;
    default:
      return <LocationOn {...iconProps} />;
  }
};

/* ============ HIGHLIGHT HELPER ============ */
const highlightFullText = (
  text: string | undefined,
  query: string,
): React.ReactNode => {
  if (!text) return null;
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(
    new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
  );
  return parts.map((part, index) => {
    const isMatch = part.toLowerCase() === q.toLowerCase();
    return isMatch ? (
      <mark key={index} className="bg-yellow-200 text-slate-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    );
  });
};

/* ============ WKT HELPERS ============ */
const wktFormat = new WKT();

/** Parse WKT geometry into an OL feature geometry (EPSG:3857). */
const wktToGeometry = (wkt: string | undefined) => {
  if (!wkt) return null;
  try {
    return wktFormat.readGeometry(wkt, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });
  } catch (err) {
    console.warn("Failed to parse WKT:", err);
    return null;
  }
};

/** Get interior point (centroid) in EPSG:3857 for popup anchoring. */
const getGeometryAnchor = (geom: any): [number, number] | null => {
  if (!geom) return null;
  try {
    const interior = geom.getInteriorPoint?.();
    if (interior) {
      const c = interior.getCoordinates();
      return [c[0], c[1]];
    }
    const ext = geom.getExtent?.();
    if (ext) return [(ext[0] + ext[2]) / 2, (ext[1] + ext[3]) / 2];
  } catch {
    /* ignore */
  }
  return null;
};

interface MapViewProps {
  markers: MapMarker[];
  boundaryMarkers: MapMarker[];
  selectedVillage: string;
  focusMarker: MapMarker | null;
  sidebarSelection: { marker: MapMarker; requestId: number } | null;
  onLocationSelect: (marker: MapMarker) => void;
  searchQuery?: string;
  resetKey: number;
  selectedKhasra: string;
  activeChip: string;
  setVillage: (value: string) => void;
  setKhasra: (value: string) => void;
  onSearchTypeChange: () => void;
  onSidebarHover?: (marker: MapMarker | null) => void;
  onMapSearchResultsChange: (results: MapMarker[] | null) => void;
}

const MapView: React.FC<MapViewProps> = ({
  markers,
  boundaryMarkers,
  selectedVillage,
  focusMarker,
  sidebarSelection,
  onLocationSelect,
  resetKey,
  selectedKhasra,
  setVillage,
  setKhasra,
  onSearchTypeChange,
  onMapSearchResultsChange,
  activeChip,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupContentRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const markerSourceRef = useRef<VectorSource | null>(null);
  const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const [showGoogleMap, setShowGoogleMap] = useState(false);
  const boundaryLayersRef = useRef<{
    village: VectorLayer<VectorSource>;
  } | null>(null);
  const boundaryFeaturesRef = useRef<{ village: Feature[] }>({ village: [] });
  const [villageLayerOn] = useState(true);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const selectedKhasraRef = useRef(selectedKhasra);
  useEffect(() => {
    selectedKhasraRef.current = selectedKhasra;
  }, [selectedKhasra]);

  //  Popup state
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [popupPlacement, setPopupPlacement] = useState<"above" | "below">(
    "above",
  );
  const [detailMarker, setDetailMarker] = useState<MapMarker | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState(-1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedSearchText, setSelectedSearchText] = useState<string>("");

  const [selectedScale, setSelectedScale] = useState<number | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [pendingExportScale, setPendingExportScale] = useState<number | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);

  const [legendOpen, setLegendOpen] = useState(false);

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );

  // Popup drag state
  const [popupOffset, setPopupOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startOffsetX: number;
    startOffsetY: number;
    minOffsetX: number;
    maxOffsetX: number;
    minOffsetY: number;
    maxOffsetY: number;
  } | null>(null);

  /* ============================================================
   POPUP DRAG HANDLERS
   ============================================================ */
  /* ============================================================
   POPUP DRAG HANDLERS (corrected)
   ============================================================ */
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const mapEl = mapRef.current;
    const popupEl = popupContentRef.current;
    if (!mapEl || !popupEl) return;

    // --- Measure ONCE at drag start ---
    const mapRect = mapEl.getBoundingClientRect();
    const popupRect = popupEl.getBoundingClientRect();

    // The popup's current top-left on screen (before any transform).
    // popupRect.left/top already includes the current transform,
    // so subtract it to get the un-transformed anchor position.
    const anchorViewportX = popupRect.left - popupOffset.x;
    const anchorViewportY = popupRect.top - popupOffset.y;

    const popupW = popupRect.width;
    const popupH = popupRect.height;

    const PAD = 6; // keeps a small gap from map edges

    // Compute the allowed offset range so the popup stays inside the map.
    // offset is added to the anchor to get the visible position.
    const minOffsetX = mapRect.left - anchorViewportX + PAD;
    const maxOffsetX = mapRect.right - anchorViewportX - popupW - PAD;
    const minOffsetY = mapRect.top - anchorViewportY + PAD;
    const maxOffsetY = mapRect.bottom - anchorViewportY - popupH - PAD;

    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startOffsetX: popupOffset.x,
      startOffsetY: popupOffset.y,
      minOffsetX,
      maxOffsetX,
      minOffsetY,
      maxOffsetY,
    };

    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;

      // ✅ Only clamp against the pre-computed range — no re-measuring
      const rawX = drag.startOffsetX + dx;
      const rawY = drag.startOffsetY + dy;

      const nextX = Math.max(drag.minOffsetX, Math.min(rawX, drag.maxOffsetX));
      const nextY = Math.max(drag.minOffsetY, Math.min(rawY, drag.maxOffsetY));

      setPopupOffset({ x: nextX, y: nextY });
    };

    const handleUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  // Village is the first visible option, so keep the controlled value aligned
  // with what the select displays on initial render.
  const [searchType, setSearchType] = useState("village");

  const searchOptions = [
    // { label: "All Fields", value: "all" },
    { label: "Village", value: "village" },
    { label: "Khasra", value: "khasraNo" },
    { label: "Aapatti Group", value: "aapattiNo" },
    // { label: "Classification", value: "classification" },
    { label: "Aapatti No.", value: "objectionId" },
  ];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchValue), 150);
    return () => clearTimeout(t);
  }, [searchValue]);

  const getHighlightText = (m: MapMarker): string => {
    switch (searchType) {
      case "village":
        return String(m.village ?? "").trim();

      case "khasraNo":
        return String(m.khasraNo ?? "").trim();

      case "aapattiNo":
        return String(m.apattiGro ?? "").trim();

      case "classification":
        return String(m.objectType ?? "").trim();

      case "objectionId":
        return String(m.objectionId ?? "").trim();

      default:
        return "";
    }
  };

  const searchResults = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    if (!q) return [];

    const filtered = boundaryMarkers.filter((m) =>
      getHighlightText(m).trim().toLowerCase().includes(q),
    );

    const uniqueResults: MapMarker[] = [];

    filtered.forEach((m) => {
      const value = getHighlightText(m).trim().toLowerCase();

      const alreadyExists = uniqueResults.some(
        (item) => getHighlightText(item).trim().toLowerCase() === value,
      );

      if (value && !alreadyExists) {
        uniqueResults.push(m);
      }
    });

    return uniqueResults;
  }, [debouncedSearch, boundaryMarkers, searchType]);

  const handleResultClick = (m: MapMarker) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const selectedValue = getHighlightText(m).trim();
    const normalizedSelectedValue = selectedValue.toLowerCase();

    const matchingMarkers = boundaryMarkers.filter(
      (item) =>
        item.village === m.village &&
        getHighlightText(item).trim().toLowerCase() === normalizedSelectedValue,
    );

    if (!matchingMarkers.length) return;

    const selectedMarker = matchingMarkers[0];

    setSelectedFeatureId(String(selectedMarker.id));
    setHighlightedIds(new Set(matchingMarkers.map((item) => item.id)));
    setSearchValue(selectedValue);
    setDebouncedSearch(selectedValue);
    setSelectedSearchText(selectedValue);
    onLocationSelect(selectedMarker);
    const selectedKhasraValue = String(selectedMarker.khasraNo ?? "");
    setKhasra(selectedKhasraValue);

    fitMapToMarkers(matchingMarkers, [80, 80, 80, 80], 500);

    setSearchOpen(false);
    setSearchHighlight(-1);

    const geometry = wktToGeometry(m.geom);
    const anchor = getGeometryAnchor(geometry);
    if (!anchor) return;
    overlayRef.current?.setPosition(undefined);
    setShowGoogleMap(false);
    setSelectedMarker(null);
    setPopupOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    setHighlightedIds(focusMarker ? new Set([focusMarker.id]) : new Set());
    setHoveredMarkerId(focusMarker?.id ?? null);

    if (focusMarker) {
      const map = mapInstanceRef.current;
      const geometry = wktToGeometry(focusMarker.geom);
      if (map && geometry) {
        const view = map.getView();
        const extent = geometry.getExtent();
        const [minX, minY, maxX, maxY] = extent;
        const currentZoom = view.getZoom() ?? 13;

        if (minX === maxX && minY === maxY) {
          const anchor = getGeometryAnchor(geometry);
          if (anchor) {
            view.animate({
              center: anchor,
              zoom: Math.max(currentZoom, 16),
              duration: 700,
              easing: easeOut,
            });
          }
        } else {
          const size = map.getSize();
          const anchor = getGeometryAnchor(geometry);
          if (!size || !anchor) return;

          const fitResolution = view.getResolutionForExtent(extent, [
            Math.max(1, size[0] - 180),
            Math.max(1, size[1] - 180),
          ]);
          const fitZoom =
            view.getZoomForResolution(fitResolution) ?? currentZoom;
          view.animate({
            center: anchor,
            zoom: Math.max(currentZoom, Math.min(fitZoom, 17)),
            duration: 700,
            easing: easeOut,
          });
        }
      }
    }
  }, [focusMarker]);

  useEffect(() => {
    const marker = sidebarSelection?.marker;
    const map = mapInstanceRef.current;
    const overlay = overlayRef.current;
    if (!marker || !map || !overlay) return;

    setSelectedFeatureId(String(marker.id));
    setHighlightedIds(new Set([marker.id]));

    const geometry = wktToGeometry(marker.geom);
    const anchor = getGeometryAnchor(geometry);
    if (!anchor) return;

    const anchorPx = map.getPixelFromCoordinate(anchor);
    const mapSize = map.getSize();
    const placeBelow = mapSize !== undefined && anchorPx[1] < 340;
    setPopupPlacement(placeBelow ? "below" : "above");
    overlay.setPositioning(placeBelow ? "top-center" : "bottom-center");
    overlay.setOffset(placeBelow ? [0, 30] : [0, -30]);
    overlay.setPosition(anchor);
    setShowGoogleMap(false);
    setDetailMarker(null);
    setSelectedMarker(marker);
  }, [sidebarSelection]);

  useEffect(() => {
    setSearchValue("");
    setDebouncedSearch("");
    setSearchOpen(false);
    setSearchHighlight(-1);
    setShowGoogleMap(false);
    setSelectedMarker(null);
    setDetailMarker(null);
    overlayRef.current?.setPosition(undefined);
    setHighlightedIds(new Set());

    if (markers.length > 0) {
      fitMapToMarkers(markers, [80, 80, 80, 80], 800);
    } else {
      mapInstanceRef.current?.getView().animate({
        center: fromLonLat(BHOPAL_CENTER),
        zoom: 13,
        duration: 400,
      });
    }
  }, [resetKey]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchHighlight(-1);
      return;
    }
    if (!searchOpen || searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchHighlight((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchHighlight((prev) =>
        prev <= 0 ? searchResults.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();

      if (searchHighlight >= 0) {
        const pick = searchResults[searchHighlight];
        if (pick) handleResultClick(pick);
        return;
      }

      const query = searchValue.trim().toLowerCase();
      const matchingMarkers = boundaryMarkers.filter((marker) =>
        getHighlightText(marker).trim().toLowerCase().includes(query),
      );
      if (matchingMarkers.length) {
        setSelectedFeatureId(String(matchingMarkers[0].id));
        setHighlightedIds(new Set(matchingMarkers.map((marker) => marker.id)));
        fitMapToMarkers(matchingMarkers, [80, 80, 80, 80], 500);
        setSearchOpen(false);
        setSearchHighlight(-1);
      }
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchInputRef.current &&
        !searchInputRef.current.closest(".search-container")?.contains(target)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ============ FIT MAP TO MARKERS ============ */
  const fitMapToMarkers = (
    mapMarkers: MapMarker[],
    padding: number[] = [80, 80, 80, 80],
    duration: number = 800,
  ) => {
    const map = mapInstanceRef.current;
    if (!map || mapMarkers.length === 0) return;

    const view = map.getView();
    view.cancelAnimations();
    const geoms = mapMarkers.map((m) => wktToGeometry(m.geom)).filter(Boolean);

    if (geoms.length === 0) return;

    if (geoms.length === 1) {
      const anchor = getGeometryAnchor(geoms[0]);
      if (anchor) view.animate({ center: anchor, zoom: 15, duration });
      return;
    }

    // Merge extents
    let extent: [number, number, number, number] | null = null;
    geoms.forEach((g: any) => {
      const e = g.getExtent?.();
      if (!e) return;
      if (!extent) extent = [...e] as [number, number, number, number];
      else {
        extent[0] = Math.min(extent[0], e[0]);
        extent[1] = Math.min(extent[1], e[1]);
        extent[2] = Math.max(extent[2], e[2]);
        extent[3] = Math.max(extent[3], e[3]);
      }
    });

    if (extent) {
      const buffer = 50;
      view.fit(
        [
          extent[0] - buffer,
          extent[1] - buffer,
          extent[2] + buffer,
          extent[3] + buffer,
        ],
        { padding, duration, maxZoom: 16 },
      );
    }
  };

  /* ============ EFFECT #1 — Init map ============ */
  useEffect(() => {
    if (!mapRef.current || !popupRef.current) return;

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mlinfomap.com/nhflyoverapi/tiles/bhopal/{z}/{x}/{y}.png",
        minZoom: 5,
        maxZoom: 18,
        crossOrigin: "anonymous",
      }),
      visible: true,
      zIndex: 0,
    });

    // Vector tile layer (cadastre)
    const cadastreLayer = new VectorTileLayer({
      source: new VectorTileSource({
        format: new MVT(),
        url: "https://mlinfomap.com/nhflyoverapi/vtiles/cadastre/{z}/{x}/{y}.pbf",
        minZoom: 10,
        maxZoom: 18,
        transition: 0,
      }),
      // Optional: apply a style so features are visible
      // (remove this block if the tiles come pre-styled from the server)
      style: new Style({
        stroke: new Stroke({ color: "rgba(120, 120, 120, 0.6)", width: 1 }),
        fill: new Fill({ color: "rgba(200, 200, 200, 0.05)" }),
      }),
      zIndex: 5, // above baseLayer (0), below markerLayer (20)
      visible: true,
    });

    const markerSource = new VectorSource();
    markerSourceRef.current = markerSource;

    const markerLayer = new VectorLayer({
      source: markerSource,
      zIndex: 20,
    });
    markerLayerRef.current = markerLayer;

    const overlay = new Overlay({
      element: popupRef.current,
      positioning: "bottom-center",
      offset: [0, -30],
      stopEvent: true,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer, cadastreLayer, markerLayer],
      overlays: [overlay],
      view: new View({
        center: fromLonLat(BHOPAL_CENTER),
        zoom: 13,
        minZoom: 8,
        maxZoom: 18,
      }),
      controls: [],
    });

    const scaleLineControl = new ScaleLine({
      units: "metric",
      bar: false,
      steps: 4,
      text: false,
      minWidth: 64,
      className: "ol-scale-line",
      target: document.getElementById("scale-line-container") || undefined,
    });
    map.addControl(scaleLineControl);

    mapInstanceRef.current = map;
    overlayRef.current = overlay;

    // Show cadastre vector tiles only at zoom 16 or greater
    const updateCadastreVisibility = () => {
      const zoom = map.getView().getZoom() ?? 0;
      cadastreLayer.setVisible(zoom >= 14);
    };

    // Run once initially
    updateCadastreVisibility();

    // Run on every zoom change
    map.getView().on("change:resolution", updateCadastreVisibility);

    const handleMapClick = (evt: MapBrowserEvent) => {
      debugger;
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        hitTolerance: 10,
        layerFilter: (layer) =>
          layer === markerLayer || layer === cadastreLayer,
      });

      if (feature) {
        let markerData = feature.get("markerData") as MapMarker | undefined;
        setSelectedFeatureId(String(markerData.id));
        const featureGeometry = feature.getGeometry();
        let anchor = getGeometryAnchor(featureGeometry);

        // Cadastre vector tiles have no objection popup data attached. Match
        if (!markerData) {
          const properties = feature.getProperties();
          const normalizedProperties = Object.fromEntries(
            Object.entries(properties).map(([key, value]) => [
              key.toLowerCase().replace(/[^a-z0-9]/g, ""),
              String(value ?? "").trim(),
            ]),
          );
          const khasraKeys = [
            "khasra",
            "khasrano",
            "khasra_number",
            "khasra_no",
          ];
          const tileKhasra =
            Object.entries(normalizedProperties).find(
              ([key, value]) =>
                value &&
                khasraKeys.some((candidate) =>
                  key.includes(candidate.replace(/[^a-z0-9]/g, "")),
                ),
            )?.[1] || selectedKhasraRef.current.trim();
          if (tileKhasra) {
            markerData = boundaryMarkers.find(
              (marker) =>
                String(marker.khasraNo ?? "")
                  .trim()
                  .toLowerCase() === tileKhasra.toLowerCase(),
            );
          }
        }

        if (!markerData || !anchor) {
          overlay.setPosition(undefined);
          setSelectedMarker(null);
          return;
        }
        onLocationSelect(markerData);
        setShowGoogleMap(false);

        const geom: any = feature.getGeometry();
        anchor = getGeometryAnchor(geom);
        if (!anchor) return;
        // if (markerData.khasraNo) setKhasra(String(markerData.khasraNo));
        // Convert map coordinates to longitude/latitude (EPSG:4326)
        const [longitude, latitude] = toLonLat(
          anchor,
          map.getView().getProjection(),
        );

        // Add coordinates to marker data
        const updatedMarker: MapMarker = {
          ...markerData,
          latitude,
          longitude,
        };

        const anchorPx = map.getPixelFromCoordinate(anchor);
        const mapSize = map.getSize();
        const POPUP_SAFE_ZONE = 340;
        const placeBelow =
          mapSize !== undefined && anchorPx[1] < POPUP_SAFE_ZONE;

        setPopupPlacement(placeBelow ? "below" : "above");
        if (placeBelow) {
          overlay.setPositioning("top-center");
          overlay.setOffset([0, 30]);
        } else {
          overlay.setPositioning("bottom-center");
          overlay.setOffset([0, -30]);
        }

        overlay.setPosition(anchor);
        setSelectedMarker(updatedMarker);
        setPopupOffset({ x: 0, y: 0 });
        setDetailMarker(null);
      } else {
        overlay.setPosition(undefined);
        setSelectedMarker(null);
        setSelectedFeatureId(null);
      }
    };

    map.on("singleclick", handleMapClick);

    const handlePointerMove = (evt: MapBrowserEvent) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        layerFilter: (layer) =>
          layer === markerLayer || layer === cadastreLayer,
        hitTolerance: 10,
      });

      if (feature) {
        const markerData = feature.get("markerData") as MapMarker;
        setHoveredMarkerId(markerData?.id ?? null);
        map.getTargetElement().style.cursor = "pointer";
      } else {
        setHoveredMarkerId(null);
        map.getTargetElement().style.cursor = "";
      }
    };
    map.on("pointermove", handlePointerMove);

    return () => {
      map.un("singleclick", handleMapClick);
      map.un("pointermove", handlePointerMove);
      map.setTarget(undefined);
      mapInstanceRef.current = null;
      overlayRef.current = null;
      markerSourceRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  /* ============ APPLY SCALE ============ */
  const applyScale = (scaleDenominator: number | null) => {
    const view = mapInstanceRef.current?.getView();
    if (!view) return;
    setSelectedScale(scaleDenominator);

    if (scaleDenominator === null) {
      if (markers.length > 0) {
        fitMapToMarkers(markers, [80, 80, 80, 80], 500);
      }
      return;
    }

    const resolution = scaleToResolution(scaleDenominator);
    view.animate({
      resolution,
      duration: 500,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  };

  /* ============ VILLAGE BOUNDARY FILTER ============ */
  useEffect(() => {
    const layers = boundaryLayersRef.current;
    if (!layers) return;

    const normalize = (value: unknown) =>
      String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const villageName = normalize(selectedVillage);
    const villageFeatures = boundaryFeaturesRef.current.village;

    layers.village.getSource()?.clear();

    if (selectedVillage) {
      const nameMatches = villageFeatures.filter(
        (feature) => normalize(feature.get("NAME")) === villageName,
      );
      layers.village.getSource()?.addFeatures(nameMatches);
    }

    layers.village.setVisible(Boolean(selectedVillage) && villageLayerOn);
  }, [selectedVillage, villageLayerOn, boundaryMarkers]);

  /* ============================================================
     Filter markers by active chip (apattiGro match)
     ============================================================ */
  const visibleMarkers = useMemo(() => {
    // An active map search temporarily shows every matching record, regardless
    // of the header filters or active chip.
    const query = debouncedSearch.trim().toLowerCase();
    if (query) {
      return boundaryMarkers.filter((marker) => {
        const matchesQuery = getHighlightText(marker)
          .trim()
          .toLowerCase()
          .includes(query);
        const matchesSelectedVillage =
          !selectedSearchText ||
          !selectedVillage ||
          marker.village === selectedVillage;
        return matchesQuery && matchesSelectedVillage;
      });
    }

    // "All" → every marker already filtered by the parent
    if (activeChip === "All") return markers;

    // "UN" → markers with empty / null apattiGro
    if (activeChip === "UN") {
      return markers.filter((m) => !m.vargikaran || m.vargikaran.trim() === "");
      return markers.filter((m) => !m.vargikaran || m.vargikaran.trim() === "");
    }

    // numeric chip → match apattiGro
    return markers.filter((m) => m.vargikaran === activeChip);
  }, [
    markers,
    boundaryMarkers,
    activeChip,
    debouncedSearch,
    searchType,
    selectedSearchText,
    selectedVillage,
  ]);

  useEffect(() => {
    onMapSearchResultsChange(debouncedSearch.trim() ? visibleMarkers : null);
  }, [debouncedSearch, visibleMarkers, onMapSearchResultsChange]);

  useEffect(() => {
    if (visibleMarkers.length > 0 && !debouncedSearch.trim()) {
      fitMapToMarkers(visibleMarkers, [80, 80, 80, 80], 800);
    }
  }, [visibleMarkers, debouncedSearch]);

  useEffect(() => {
    const source = markerSourceRef.current;
    if (!source) return;

    const features = visibleMarkers
      .map((m) => {
        const geom = wktToGeometry(m.geom);
        if (!geom) return null;

        const feature = new Feature({ geometry: geom });
        feature.set("markerData", m);
        feature.set("isMarker", true);

        const cat = normalizeCategory(m.objectType);
        const isHighlighted = highlightedIds.has(m.id);
        const searchQuery = debouncedSearch.trim().toLowerCase();
        const isSearchMatch =
          Boolean(searchQuery) &&
          getHighlightText(m).trim().toLowerCase().includes(searchQuery);
        const isFilterMatch =
          !debouncedSearch.trim() &&
          (Boolean(selectedVillage) ||
            Boolean(selectedKhasra) ||
            activeChip !== "All");
        // const isHovered = hoveredMarkerId === m.id;

        const baseColor = markerColors[cat] || "#6b7280";
        const svgUrl = MARKER_SVGS[cat] || RoadPin;

        const isSelected =
          selectedFeatureId === String(m.id) || isSearchMatch;
        const isActiveHighlight =
          isSearchMatch || isHighlighted || isFilterMatch;

        feature.setStyle(
          new Style({
            fill: new Fill({
              // Keep the original category fill color
              color: `${baseColor}20`,
            }),

            stroke: new Stroke({
              // Pink boundary only after feature selection
              color: isSelected ? "#FF2DF1" : baseColor,
              width: isSelected ? 3.5 : isActiveHighlight ? 3.5 : 1.5,
            }),

            image: new Icon({
              src: svgUrl,
              anchor: [0.5, 1],
              anchorXUnits: "fraction",
              anchorYUnits: "fraction",
              scale:
                isSearchMatch || isFilterMatch
                  ? 0.6
                  : isHighlighted
                    ? 0.55
                    : 0.45,
            }),

            zIndex: isSelected
              ? 999
              : isSearchMatch
                ? 100
                : isFilterMatch
                  ? 75
                  : isHighlighted
                    ? 50
                    : 1,
          }),
        );

        return feature;
      })
      .filter(Boolean) as Feature[];

    source.clear();
    source.addFeatures(features);

    // Close popup / detail if their marker is no longer visible
    if (
      selectedMarker &&
      !visibleMarkers.some((m) => m.id === selectedMarker.id)
    ) {
      overlayRef.current?.setPosition(undefined);
      setSelectedMarker(null);
    }
    if (detailMarker && !visibleMarkers.some((m) => m.id === detailMarker.id)) {
      setDetailMarker(null);
    }
  }, [
    visibleMarkers,
    // markers,
    highlightedIds,
    debouncedSearch,
    searchResults,
    hoveredMarkerId,
    selectedMarker,
    detailMarker,
    selectedFeatureId,
    selectedVillage,
    selectedKhasra,
    activeChip,
  ]);

  /* ============ CONTROLS ============ */
  const handleZoomIn = () => {
    const view = mapInstanceRef.current?.getView();
    if (view) view.animate({ zoom: (view.getZoom() || 11) + 1, duration: 250 });
  };
  const handleZoomOut = () => {
    const view = mapInstanceRef.current?.getView();
    if (view) view.animate({ zoom: (view.getZoom() || 11) - 1, duration: 250 });
  };
  const handleRecenter = () => {
    const view = mapInstanceRef.current?.getView();
    if (view)
      view.animate({
        center: fromLonLat(BHOPAL_CENTER),
        zoom: 11,
        duration: 600,
      });
  };
  const closePopup = () => {
    overlayRef.current?.setPosition(undefined);
    setShowGoogleMap(false);
    setSelectedMarker(null);
  };

  // const zoomToSelectedParcel = () => {
  //   if (!selectedMarker) return;
  //   fitMapToMarkers([selectedMarker], [120, 120, 120, 120], 500);
  // };

  //Zoom to location on google map
  const zoomToSelectedParcel = () => {
    if (!selectedMarker) return;

    const lat = Number(selectedMarker.latitude);
    const lng = Number(selectedMarker.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error("Parcel coordinates are missing or invalid");
      return;
    }

    setShowGoogleMap(true);
  };

  /* ============ EXPORT ============ */
  const handleExport = () => {
    setPendingExportScale(selectedScale);
    setExportModalOpen(true);
  };

  const runExport = async (scaleToApply: number | null) => {
    const mapEl = mapRef.current?.parentElement;
    if (!mapEl) return;
    setIsExporting(true);
    try {
      if (scaleToApply !== selectedScale) {
        applyScale(scaleToApply);
        await new Promise((resolve) => setTimeout(resolve, 700));
      }

      const mapCanvas = await html2canvas(mapEl, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#e5e3df",
        scale: 2,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: mapEl.scrollWidth,
        windowHeight: mapEl.scrollHeight,
      });
      const mapImageDataUrl = mapCanvas.toDataURL("image/jpeg", 0.92);

      await generateAndDownloadPdf({
        markers,
        mapImageDataUrl,
        selectedVillage,
        selectedKhasra,
      });

      setExportModalOpen(false);
    } catch (err) {
      console.error("[runExport] Failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 relative bg-[#e5e3df]">
      <div ref={mapRef} className="absolute inset-0 w-full h-full">
        {/* SEARCH BAR */}
        <div
          data-html2canvas-ignore="true"
          className="search-container absolute top-4 left-4 right-4 md:right-auto md:w-[360px] z-20"
        >
          <div className="relative">
            <div
              className="flex items-center bg-white rounded-xl border transition-all duration-150"
              style={{
                height: 42,
                borderColor: searchFocused ? "#fbbf24" : "#e2e8f0",
                boxShadow: searchFocused
                  ? "0 6px 24px rgba(251,191,36,0.18)"
                  : "0 2px 12px rgba(15,23,42,0.08)",
              }}
            >
              <div className="pl-3 pr-2 flex items-center justify-center text-slate-400 flex-shrink-0">
                <Search sx={{ fontSize: 18 }} />
              </div>
              <select
                value={searchType}
                onChange={(e) => {
                  setSearchType(e.target.value);
                  setSearchValue("");
                  setDebouncedSearch("");
                  setSelectedSearchText("");
                  setHighlightedIds(new Set());
                  setSearchHighlight(-1);
                  setSearchOpen(true);
                  overlayRef.current?.setPosition(undefined);
                  setSelectedMarker(null);
                  setDetailMarker(null);
                  onSearchTypeChange();
                }}
                className="shrink-0 bg-transparent border-r border-gray-300 outline-none text-sm py-1 pl-1 pr-3 mr-2 cursor-pointer"
              >
                {searchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                placeholder={`Search by ${
                  searchOptions.find((option) => option.value === searchType)
                    ?.label
                }...`}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setSelectedSearchText("");
                  setSearchOpen(true);
                  setSearchHighlight(-1);
                }}
                onFocus={() => {
                  setSearchFocused(true);
                  setSearchOpen(true);
                }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={handleSearchKeyDown}
                className=" flex-1 min-w-0 bg-transparent border-none outline-none"
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#0f172a",
                  caretColor: "#0f2c4a",
                  padding: "0px",
                  margin: "0 6px",
                }}
              />

              {searchValue && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchValue("");
                    setDebouncedSearch("");
                    setSelectedSearchText("");
                    setSearchOpen(false);
                    setSearchHighlight(-1);
                    setSearchType("village");
                    setHighlightedIds(new Set());
                    setVillage("");
                    setKhasra("");
                    setSelectedMarker(null);
                    setDetailMarker(null);
                    overlayRef.current?.setPosition(undefined);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear"
                  className="flex items-center justify-center flex-shrink-0 rounded-md transition-colors hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  style={{ width: 28, height: 28, marginRight: 6 }}
                >
                  <Close
                    sx={{ fontSize: 16 }}
                  />
                </button>
              )}
            </div>

            {searchOpen && searchValue.trim() && (
              <ul
                className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 overflow-hidden"
                style={{
                  maxHeight: 380,
                  overflowY: "auto",
                  boxShadow: "0 12px 40px rgba(15,23,42,0.14)",
                  listStyle: "none",
                  padding: "6px 0",
                  margin: 0,
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {searchResults.length === 0 ? (
                  <li className="px-4 py-3 text-[13px] text-slate-400 italic">
                    No results for "{searchValue}"
                  </li>
                ) : (
                  searchResults.map((m, idx) => {
                    const cat = normalizeCategory(m.objectType);
                    const isHighlighted = idx === searchHighlight;
                    return (
                      <li
                        key={m.id}
                        onMouseEnter={() => setSearchHighlight(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleResultClick(m);
                        }}
                        className="cursor-pointer transition-colors"
                        style={{
                          padding: "10px 14px",
                          background: isHighlighted ? "#eff6ff" : "transparent",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {searchType === "village" ? (
                            // Village search: show only village name
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-medium text-slate-700">
                                {highlightFullText(
                                  m.village ?? "",
                                  debouncedSearch,
                                )}
                              </span>
                            </div>
                          ) : searchType === "khasraNo" ? (
                            // Village search: show only village name
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-medium text-slate-700">
                                {highlightFullText(
                                  m.khasraNo ?? "",
                                  debouncedSearch,
                                )}
                              </span>
                            </div>
                          ) : searchType === "classification" ? (
                            // Village search: show only village name
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-medium text-slate-700">
                                {highlightFullText(
                                  m.objectType ?? "",
                                  debouncedSearch,
                                )}
                              </span>
                            </div>
                          ) : searchType === "aapattiNo" ? (
                            // Village search: show only village name
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-medium text-slate-700">
                                {highlightFullText(
                                  m.apattiGro ?? "",
                                  debouncedSearch,
                                )}
                              </span>
                            </div>
                          ) : searchType === "objectionId" ? (
                            // Village search: show only village name
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-medium text-slate-700">
                                {highlightFullText(
                                  m.objectionId ?? "",
                                  debouncedSearch,
                                )}
                              </span>
                            </div>
                          ) : (
                            // Other search types: keep existing suggestion UI
                            <>
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{
                                  backgroundColor: `${markerColors[cat] || "#6b7280"}20`,
                                  color: markerColors[cat] || "#6b7280",
                                }}
                              >
                                {getCategoryIcon(cat, 14)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[12px] font-semibold text-slate-700">
                                    {highlightFullText(
                                      m.objectionId,
                                      // getHighlightText(m),
                                      debouncedSearch,
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-400 truncate">
                                    · {m.objectType}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 leading-snug line-clamp-1 mb-1">
                                  {highlightFullText(
                                    m.remark ?? "",
                                    debouncedSearch,
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-[10.5px] text-slate-500">
                                  <LocationOn sx={{ fontSize: 11 }} />
                                  <span className="truncate">
                                    Khasra {m.khasraNo}, {m.village}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
        </div>

        {/* POPUP */}

        <div
          data-html2canvas-ignore="true"
          ref={popupRef}
          className={`absolute ${selectedMarker ? "pointer-events-auto" : "pointer-events-none"}`}
          style={{ zIndex: 100000, position: "absolute" }}
        >
          <div
            ref={popupContentRef}
            className={`relative w-[min(92vw,420px)] md:w-[min(70vw,480px)] rounded-lg
      bg-white shadow-[0_12px_32px_rgba(15,23,42,0.20)]
      border border-blue-100
      ${selectedMarker ? "opacity-100" : "opacity-0"}
      ${isDragging ? "" : "transition-opacity duration-150"}`}
            style={{
              transform: `translate(${popupOffset.x}px, ${popupOffset.y}px)`,
              userSelect: isDragging ? "none" : "auto",
            }}
          >
            {selectedMarker &&
              (() => {
                const groupKey =
                  String(selectedMarker.apattiGro ?? "").trim() || "UN";

                const fieldValue = (value: unknown) => {
                  const text = String(value ?? "").trim();
                  return text || "Not available";
                };

                const areaValue =
                  selectedMarker.area !== undefined && selectedMarker.area > 0
                    ? selectedMarker.area.toFixed(1)
                    : "Not available";

                const infoRows = [
                  {
                    label: "Apatti No",
                    value: fieldValue(selectedMarker.objectionId),
                    icon: <Assignment />,
                  },
                  { label: "Apatti Group", value: groupKey, icon: <Groups /> },
                  {
                    label: "Vargikaran",
                    value: fieldValue(selectedMarker.vargikaran),
                    icon: <AltRoute />,
                  },
                  {
                    label: "Upvargikaran",
                    value: fieldValue(selectedMarker.upvargikar),
                    icon: <Layers />,
                  },
                  {
                    label: "Remarks",
                    value: fieldValue(selectedMarker.remark),
                    icon: <Notes />,
                  },
                ];

                return (
                  <>
                    {/* Header (drag handle) */}
                    <div
                      onMouseDown={handleDragStart}
                      className={`flex justify-between items-center px-3 py-2 rounded-t-lg select-none bg-[#0d4574]
                ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 text-white">
                        <div className="w-7 h-7 rounded-full bg-white text-[#0d4574] flex items-center justify-center flex-shrink-0">
                          <Info sx={{ fontSize: 18 }} />
                        </div>
                        <div className="text-sm sm:text-base font-semibold leading-tight truncate">
                          Apatti Information
                        </div>
                      </div>
                      <button
                        onClick={closePopup}
                        className="w-7 h-7 ml-2 rounded-md flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                        aria-label="Close"
                      >
                        <Close sx={{ fontSize: 20 }} />
                      </button>
                    </div>

                    {/* Scrollable body (only this part scrolls) */}
                    <div className="bg-white max-h-[min(55vh,380px)] overflow-y-auto">
                      {/* Summary */}
                      <div className="px-3 pt-2 pb-1.5">
                        <div className="grid grid-cols-3 gap-1.5 bg-[#f7fbff] border border-blue-50 px-2.5 py-2 rounded-md">
                          {[
                            {
                              label: "Village",
                              value: fieldValue(selectedMarker.village),
                              icon: (
                                <LocationOn
                                  sx={{ fontSize: 16, color: "#16a34a" }}
                                />
                              ),
                            },
                            {
                              label: "Khasra",
                              value: fieldValue(selectedMarker.khasraNo),
                              icon: (
                                <Straighten
                                  sx={{ fontSize: 16, color: "#1d6aa3" }}
                                />
                              ),
                            },
                            {
                              label: "Area",
                              value: areaValue,
                              icon: (
                                <CropSquare
                                  sx={{ fontSize: 16, color: "#1d6aa3" }}
                                />
                              ),
                            },
                          ].map((item, i) => (
                            <div
                              key={item.label}
                              className={`flex items-start gap-1.5 min-w-0 ${i > 0 ? "border-l border-slate-200 pl-2" : ""}`}
                            >
                              <span className="mt-0.5 flex-shrink-0">
                                {item.icon}
                              </span>
                              <div className="min-w-0">
                                <div className="text-[11px] font-medium text-slate-500 leading-tight">
                                  {item.label}
                                </div>
                                <div className="text-[13px] font-semibold text-[#08274a] leading-snug break-words">
                                  {item.value}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Info rows */}
                      <div className="px-3 pb-2">
                        <div className="rounded-md border border-[#d7e7f4] overflow-hidden">
                          <table className="w-full table-fixed border-collapse text-left">
                            <tbody>
                              {infoRows.map((row, index) => (
                                <tr
                                  key={row.label}
                                  className={
                                    index === 0
                                      ? ""
                                      : "border-t border-slate-200"
                                  }
                                >
                                  <td className="w-7 pl-2 py-1.5 align-top">
                                    <span className="flex items-center justify-center">
                                      {React.cloneElement(
                                        row.icon as React.ReactElement<{
                                          sx?: Record<string, unknown>;
                                        }>,
                                        {
                                          sx: {
                                            fontSize: 15,
                                            color: "#94a3b8",
                                          },
                                        },
                                      )}
                                    </span>
                                  </td>
                                  <th className="w-[30%] px-1.5 py-1.5 text-[12px] font-medium text-slate-500 align-top">
                                    {row.label}
                                  </th>
                                  <td className="w-3 py-1.5 text-[12px] text-slate-400 align-top">
                                    :
                                  </td>
                                  <td className="px-1.5 py-1.5 text-[12px] sm:text-[13px] font-medium leading-snug text-[#08274a] break-words whitespace-normal align-top">
                                    {row.value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-t border-blue-100 bg-[#f4fbff] rounded-b-lg">
                      {selectedMarker?.latitude != null &&
                        selectedMarker?.longitude != null &&
                        Number.isFinite(Number(selectedMarker.latitude)) &&
                        Number.isFinite(Number(selectedMarker.longitude)) && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LocationOn sx={{ fontSize: 16 }} />}
                            onClick={zoomToSelectedParcel}
                            sx={{
                              textTransform: "none",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              py: 0.25,
                              borderColor: "#bfdbfe",
                              color: "#0f5f9f",
                              backgroundColor: "#eaf6ff",
                              borderRadius: "6px",
                              "&:hover": {
                                borderColor: "#93c5fd",
                                backgroundColor: "#dff0ff",
                              },
                            }}
                          >
                            Location on Google Map
                          </Button>
                        )}
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Close sx={{ fontSize: 16 }} />}
                        onClick={closePopup}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          py: 0.25,
                          backgroundColor: "#0d5f9f",
                          borderRadius: "6px",
                          boxShadow: "none",
                          "&:hover": {
                            backgroundColor: "#0b4f86",
                            boxShadow: "none",
                          },
                        }}
                      >
                        Close
                      </Button>
                    </div>
                  </>
                );
              })()}
          </div>
        </div>

        {/* iframe Location popup */}
        {showGoogleMap && selectedMarker && (
          <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-[#0d4574] px-4 py-3 text-white">
                <h2 className="text-lg font-semibold">Location</h2>

                <button
                  onClick={() => setShowGoogleMap(false)}
                  className="rounded p-1 hover:bg-white/10"
                  aria-label="Close Google Maps"
                >
                  <Close />
                </button>
              </div>

              <iframe
                title="Selected parcel location"
                width="100%"
                height="500"
                loading="lazy"
                className="block border-0"
                src={`https://maps.google.com/maps?q=${Number(
                  selectedMarker.latitude,
                )},${Number(selectedMarker.longitude)}&z=15&output=embed`}
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        )}

        {/* MAP CONTROLS */}
        <div
          data-html2canvas-ignore="true"
          className="absolute right-3 sm:right-4 top-3 sm:top-4 flex flex-col gap-2 z-10"
        >
          <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.10)] border border-slate-200 overflow-hidden flex flex-col">
            <IconButton
              onClick={handleZoomIn}
              title="Zoom In"
              sx={{
                width: 38,
                height: 38,
                borderRadius: 0,
                color: "#334155",
                "&:hover": { backgroundColor: "#f8fafc", color: "#0f2c4a" },
              }}
            >
              <Add sx={{ fontSize: 18 }} />
            </IconButton>
            <div className="h-px bg-slate-200 mx-2" />
            <IconButton
              onClick={handleZoomOut}
              title="Zoom Out"
              sx={{
                width: 38,
                height: 38,
                borderRadius: 0,
                color: "#334155",
                "&:hover": { backgroundColor: "#f8fafc", color: "#0f2c4a" },
              }}
            >
              <Remove sx={{ fontSize: 18 }} />
            </IconButton>
          </div>

          <IconButton
            onClick={handleRecenter}
            title="Recenter"
            sx={{
              width: 38,
              height: 38,
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
              color: "#334155",
              "&:hover": {
                backgroundColor: "#f8fafc",
                borderColor: "#cbd5e1",
                color: "#0f2c4a",
                transform: "translateY(-1px)",
                boxShadow: "0 6px 20px rgba(15,23,42,0.14)",
              },
            }}
          >
            <MyLocation sx={{ fontSize: 18 }} />
          </IconButton>
        </div>

        {/* EXPORT BUTTON */}
        <div
          data-html2canvas-ignore="true"
          className="absolute right-[18px] top-[155px] z-10"
        >
          <IconButton
            onClick={handleExport}
            title="Export as PDF"
            sx={{
              width: 38,
              height: 38,
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
              color: "#334155",
              "&:hover": {
                backgroundColor: "#f8fafc",
                borderColor: "#cbd5e1",
                color: "#0f2c4a",
                transform: "translateY(-1px)",
                boxShadow: "0 6px 20px rgba(15,23,42,0.14)",
              },
            }}
          >
            <Download sx={{ fontSize: 20 }} />
          </IconButton>
        </div>

        {/* ============================================================
            LEGEND — collapsible
        ============================================================ */}

        <div
          className={`absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-[999] bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.12)] border border-slate-200 overflow-hidden transition-all duration-200 ${
            legendOpen
              ? "w-[340px] sm:w-[420px] max-w-[calc(100vw-24px)]"
              : "w-auto"
          }`}
        >
          {/* Header — clickable toggle */}
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            className="w-full px-4 py-2 bg-slate-50 flex items-center justify-between gap-3 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-expanded={legendOpen}
            aria-label={legendOpen ? "Collapse legend" : "Expand legend"}
          >
            <span className="font-bold text-xl  text-slate-800 tracking-tight whitespace-nowrap">
              Legend
            </span>

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-slate-500 transition-transform duration-200 ${
                legendOpen ? "" : "rotate-180"
              }`}
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>

          {/* Body — collapses smoothly, only rendered when open */}
          {legendOpen && (
            <div className="overflow-y-auto max-h-[75vh] border-t border-slate-200 p-2">
              {/* LULC Legend Image */}
              <img
                src={Legend}
                alt="LULC Legend"
                className="w-full h-auto block"
              />
            </div>
          )}
        </div>

        {/* SCALE SELECTOR */}
        <div
          data-html2canvas-ignore="true"
          className="absolute left-4 bottom-14 z-10 flex items-end gap-3"
        >
          <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.10)] border border-slate-200 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Scale
              </span>
            </div>
            <select
              value={selectedScale ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                applyScale(val === "" ? null : Number(val));
              }}
              className="w-[110px] px-3 py-2 text-[12px] font-medium text-slate-700 bg-white border-none outline-none cursor-pointer hover:bg-slate-50"
            >
              <option value="">Fit to view</option>
              {SCALE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SCALE LINE */}
        <div
          id="scale-line-container"
          className="absolute bottom-4 left-4 z-10 bg-white/90 border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-sm mb-1"
        />

        <ExportScaleModal
          open={exportModalOpen}
          currentScale={selectedScale}
          pendingScale={pendingExportScale}
          isExporting={isExporting}
          onScaleChange={setPendingExportScale}
          onCancel={() => {
            setExportModalOpen(false);
            setPendingExportScale(null);
          }}
          onConfirm={() => runExport(pendingExportScale)}
        />
      </div>
    </div>
  );
};

export default MapView;
