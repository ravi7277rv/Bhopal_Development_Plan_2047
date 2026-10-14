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
import GeoJSON from "ol/format/GeoJSON";
import WKT from "ol/format/WKT";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import Feature from "ol/Feature";
import { fromLonLat } from "ol/proj";
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
  searchQuery = "",
  resetKey,
  selectedKhasra,
  setVillage,
  onMapSearchResultsChange,
  activeChip,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const markerSourceRef = useRef<VectorSource | null>(null);
  const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const [showGoogleMap, setShowGoogleMap] = useState(false);
  const boundaryLayersRef = useRef<{
    village: VectorLayer<VectorSource>;
  } | null>(null);
  const boundaryFeaturesRef = useRef<{ village: Feature[] }>({ village: [] });
  const [boundariesReady, setBoundariesReady] = useState(false);
  const [villageLayerOn] = useState(true);
  const [selectedSearchText, setSelectedSearchText] = useState("");
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

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

  const [selectedScale, setSelectedScale] = useState<number | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [pendingExportScale, setPendingExportScale] = useState<number | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);

  const [legendOpen, setLegendOpen] = useState(false);

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
    const popupEl = popupRef.current;
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
    { label: "Khasra No.", value: "khasraNo" },
    { label: "Aapatti No.", value: "aapattiNo" },
    // { label: "Classification", value: "classification" },
    { label: "Objection ID", value: "objectionId" },
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

    const selectedValue = getHighlightText(m).toLowerCase();

    const matchingMarkers = boundaryMarkers.filter(
      (item) => getHighlightText(item).toLowerCase() === selectedValue,
    );

    if (!matchingMarkers.length) return;

    setHighlightedIds(new Set(matchingMarkers.map((item) => item.id)));

    setSelectedSearchText(searchValue.trim() || searchQuery.trim());

    onLocationSelect(matchingMarkers[0]);

    fitMapToMarkers(matchingMarkers, [80, 80, 80, 80], 500);

    setSearchOpen(false);
    setSearchHighlight(-1);

    overlayRef.current?.setPosition(anchor);
    setSelectedMarker(m);
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
    setDetailMarker(null);
    setSelectedMarker(marker);
  }, [sidebarSelection]);

  useEffect(() => {
    setSearchValue("");
    setDebouncedSearch("");
    setSearchOpen(false);
    setSearchHighlight(-1);
    setSelectedSearchText("");
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
        setHighlightedIds(new Set(matchingMarkers.map((marker) => marker.id)));
        setSelectedSearchText(searchValue.trim());
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
        fill: new Fill({ color: "rgba(0, 0, 0, 1)" }),
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
      cadastreLayer.setVisible(zoom >= 16);
    };

    // Run once initially
    updateCadastreVisibility();

    // Run on every zoom change
    map.getView().on("change:resolution", updateCadastreVisibility);

    const handleMapClick = (evt: MapBrowserEvent) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        hitTolerance: 10,
        layerFilter: (layer) => layer === markerLayer,
      });

      if (feature) {
        const markerData = feature.get("markerData") as MapMarker;
        onLocationSelect(markerData);
        debugger;
        const geom: any = feature.getGeometry();
        const anchor = getGeometryAnchor(geom);
        if (!anchor) return;

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
      }
    };

    map.on("singleclick", handleMapClick);

    const handlePointerMove = (evt: MapBrowserEvent) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        layerFilter: (layer) => layer === markerLayer,
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
  // useEffect(() => {
  //   const layers = boundaryLayersRef.current;
  //   if (!layers) return;

  //   const normalize = (value: unknown) =>
  //     String(value ?? "")
  //       .normalize("NFKD")
  //       .replace(/[\u0300-\u036f]/g, "")
  //       .toLocaleLowerCase()
  //       .replace(/[^a-z0-9]/g, "");

  //   const villageName = normalize(selectedVillage);
  //   const villageFeatures = boundaryFeaturesRef.current.village;

  //   layers.village.getSource()?.clear();

  //   if (selectedVillage) {
  //     const nameMatches = villageFeatures.filter(
  //       (feature) => normalize(feature.get("NAME")) === villageName,
  //     );
  //     layers.village.getSource()?.addFeatures(nameMatches);
  //   }

  //   layers.village.setVisible(Boolean(selectedVillage) && villageLayerOn);
  // }, [selectedVillage, villageLayerOn, boundariesReady, boundaryMarkers]);

  /* ============================================================
     Filter markers by active chip (apattiGro match)
     ============================================================ */
  const visibleMarkers = useMemo(() => {
    // An active map search temporarily shows every matching record, regardless
    // of the header filters or active chip.
    const query = debouncedSearch.trim().toLowerCase();
    if (query) {
      return boundaryMarkers.filter((marker) =>
        getHighlightText(marker).trim().toLowerCase().includes(query),
      );
    }

    // "All" → every marker already filtered by the parent
    if (activeChip === "All") return markers;

    // "UN" → markers with empty / null apattiGro
    if (activeChip === "UN") {
      return markers.filter((m) => !m.apattiGro || m.apattiGro.trim() === "");
    }

    // numeric chip → match apattiGro
    return markers.filter((m) => m.apattiGro === activeChip);
  }, [markers, boundaryMarkers, activeChip, debouncedSearch, searchType]);

  useEffect(() => {
    onMapSearchResultsChange(debouncedSearch.trim() ? visibleMarkers : null);
  }, [debouncedSearch, visibleMarkers, onMapSearchResultsChange]);

  /* ============ BUILD MARKER FEATURES (POLYGONS) ============ */
  // useEffect(() => {
  //   const source = markerSourceRef.current;
  //   if (!source) return;

  //   const features = markers
  //     .map((m) => {
  //       const geom = wktToGeometry(m.geom);
  //       if (!geom) return null;

  //       const feature = new Feature({ geometry: geom });
  //       feature.set("markerData", m);
  //       feature.set("isMarker", true);

  //       const cat = normalizeCategory(m.objectType);
  //       const isHighlighted = highlightedIds.has(m.id);
  //       const isSearchMatch =
  //         debouncedSearch.trim() !== "" &&
  //         searchResults.some((item) => item.id === m.id);
  //       const isHovered = hoveredMarkerId === m.id;

  //       const baseColor = markerColors[cat] || "#6b7280";
  //       const svgUrl = MARKER_SVGS[cat] || RoadPin;

  //       feature.setStyle(
  //         new Style({
  //           fill: new Fill({
  //             color: isHovered
  //               ? `${baseColor}66`
  //               : isSearchMatch || isHighlighted
  //                 ? `${baseColor}40`
  //                 : `${baseColor}20`,
  //           }),
  //           stroke: new Stroke({
  //             color: baseColor,
  //             width: isHovered ? 3 : isSearchMatch || isHighlighted ? 2.5 : 1.5,
  //           }),
  //           image: new Icon({
  //             src: svgUrl,
  //             anchor: [0.5, 1],
  //             anchorXUnits: "fraction",
  //             anchorYUnits: "fraction",
  //             scale: isHovered
  //               ? 0.7
  //               : isSearchMatch
  //                 ? 0.6
  //                 : isHighlighted
  //                   ? 0.55
  //                   : 0.45,
  //           }),
  //           zIndex: isHovered
  //             ? 9999
  //             : isSearchMatch
  //               ? 100
  //               : isHighlighted
  //                 ? 50
  //                 : 1,
  //         }),
  //       );

  //       return feature;
  //     })
  //     .filter(Boolean) as Feature[];

  //   source.clear();
  //   source.addFeatures(features);

  //   if (markers.length > 0) {
  //     fitMapToMarkers(markers, [80, 80, 80, 80], 800);
  //   }

  //   if (selectedMarker && !markers.some((m) => m.id === selectedMarker.id)) {
  //     overlayRef.current?.setPosition(undefined);
  //     setSelectedMarker(null);
  //   }
  //   if (detailMarker && !markers.some((m) => m.id === detailMarker.id)) {
  //     setDetailMarker(null);
  //   }
  // }, [markers, highlightedIds, debouncedSearch, searchResults, hoveredMarkerId]);
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
        const isSearchMatch =
          debouncedSearch.trim() !== "" &&
          searchResults.some((item) => item.id === m.id);
        const isHovered = hoveredMarkerId === m.id;

        const baseColor = markerColors[cat] || "#6b7280";
        const svgUrl = MARKER_SVGS[cat] || RoadPin;

        feature.setStyle(
          new Style({
            fill: new Fill({
              color: isHovered
                ? `${baseColor}66`
                : isSearchMatch || isHighlighted
                  ? `${baseColor}40`
                  : `${baseColor}20`,
            }),
            stroke: new Stroke({
              color: baseColor,
              width: isHovered ? 5 : isSearchMatch || isHighlighted ? 2.5 : 1.5,
            }),
            image: new Icon({
              src: svgUrl,
              anchor: [0.5, 1],
              anchorXUnits: "fraction",
              anchorYUnits: "fraction",
              scale: isHovered
                ? 10
                : isSearchMatch
                  ? 0.6
                  : isHighlighted
                    ? 0.55
                    : 0.45,
            }),
            zIndex: isHovered
              ? 9999
              : isSearchMatch
                ? 100
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
  ]);

  // To prevent auto zoom on mannual interaction, we only fit map to markers when the visibleMarkers list changes.
  useEffect(() => {
    if (visibleMarkers.length > 0) {
      fitMapToMarkers(visibleMarkers, [80, 80, 80, 80], 800);
    }
  }, [visibleMarkers]);

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
    setSelectedMarker(null);
  };

  // const zoomToSelectedParcel = () => {
  //   if (!selectedMarker) return;
  //   fitMapToMarkers([selectedMarker], [120, 120, 120, 120], 500);
  // };

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
                  setSearchHighlight(-1);
                  setSearchOpen(true);
                }}
                className="shrink-0 bg-transparent border-r border-gray-300 outline-none text-sm pr-2 py-1 cursor-pointer"
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
                  padding: 0,
                  margin: "10px",
                }}
              />

              {searchValue && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchValue("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear"
                  className="flex items-center justify-center flex-shrink-0 rounded-md transition-colors hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  style={{ width: 28, height: 28, marginRight: 6 }}
                >
                  <Close
                    sx={{ fontSize: 16 }}
                    onClick={() => {
                      // Clear search input
                      setSearchValue("");
                      setDebouncedSearch("");
                      setSearchOpen(false);
                      setSearchHighlight(-1);

                      // Reset dropdown to default
                      setSearchType("village");

                      // Clear search highlights
                      setHighlightedIds(new Set());
                      setSelectedSearchText("");
                      setVillage("");

                      // Clear selected marker and detail popup
                      setSelectedMarker(null);
                      setDetailMarker(null);
                      overlayRef.current?.setPosition(undefined);

                      // Clear village and khasra filters
                      // Use the actual parent state setters for these two values.
                      searchInputRef.current?.focus();
                    }}
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
          className={`w-[min(92vw,680px)] bg-white rounded-lg
    shadow-[0_12px_32px_rgba(15,23,42,0.20)]
    border border-blue-100 overflow-visible z-40
    ${
      selectedMarker
        ? "opacity-100 pointer-events-auto"
        : "opacity-0 pointer-events-none"
    } ${isDragging ? "" : "transition-opacity duration-150"}`}
          style={{
            transform: `translate(${popupOffset.x}px, ${popupOffset.y}px)`,
            zIndex: 100000,
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
                  icon: <Assignment sx={{ fontSize: 19 }} />,
                  color: "#f97316",
                },
                {
                  label: "Apatti Group",
                  value: groupKey,
                  icon: <Groups sx={{ fontSize: 20 }} />,
                  color: "#06b6d4",
                },
                {
                  label: "Vargikaran",
                  value: fieldValue(selectedMarker.vargikaran),
                  icon: <AltRoute sx={{ fontSize: 20 }} />,
                  color: "#f59e0b",
                },
                {
                  label: "Upvargikaran",
                  value: fieldValue(selectedMarker.upvargikar),
                  icon: <Layers sx={{ fontSize: 20 }} />,
                  color: "#ef476f",
                },
                {
                  label: "Remarks",
                  value: fieldValue(selectedMarker.remark),
                  icon: <Notes sx={{ fontSize: 19 }} />,
                  color: "#64748b",
                },
              ];

              return (
                <>
                  {/* Compact Header */}
                  <div
                    onMouseDown={handleDragStart}
                    className={`relative flex justify-between items-center
              px-4 sm:px-5 py-3 rounded-t-lg select-none
              bg-[#0d4574]
              ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 text-white">
                      <div
                        className="w-9 h-9 rounded-full bg-white text-[#0d4574]
                  flex items-center justify-center flex-shrink-0 shadow-sm"
                      >
                        <Info sx={{ fontSize: 23 }} />
                      </div>

                      <div className="text-xl sm:text-2xl font-semibold leading-tight truncate">
                        Apatti Information
                      </div>
                    </div>

                    <button
                      onClick={closePopup}
                      className="w-8 h-8 ml-3 rounded-md flex items-center
                justify-center text-white/90 hover:text-white
                hover:bg-white/10 transition-colors flex-shrink-0"
                      aria-label="Close"
                    >
                      <Close sx={{ fontSize: 24 }} />
                    </button>
                  </div>

                  {/* Summary Section */}
                  <div className="bg-white/95">
                    <div className="px-4 sm:px-5 pt-3 pb-2">
                      <div
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2
                  bg-[#f7fbff] border border-blue-50
                  px-3 sm:px-4 py-3 rounded-md"
                      >
                        {/* Village */}
                        <div className="flex items-center gap-2 min-w-0">
                          <LocationOn sx={{ fontSize: 28, color: "#16a34a" }} />
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-slate-500">
                              Village
                            </div>
                            <div className="text-base sm:text-lg font-semibold text-[#08274a] truncate">
                              {fieldValue(selectedMarker.village)}
                            </div>
                          </div>
                        </div>

                        {/* Khasra */}
                        <div
                          className="flex items-center gap-2 min-w-0
                    sm:border-l sm:border-slate-200 sm:pl-3"
                        >
                          <Straighten sx={{ fontSize: 27, color: "#1d6aa3" }} />
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-slate-500">
                              Khasra
                            </div>
                            <div className="text-base sm:text-lg font-semibold text-[#08274a] truncate">
                              {fieldValue(selectedMarker.khasraNo)}
                            </div>
                          </div>
                        </div>

                        {/* Area */}
                        <div
                          className="flex items-center gap-2 min-w-0
                    sm:border-l sm:border-slate-200 sm:pl-3"
                        >
                          <CropSquare sx={{ fontSize: 27, color: "#1d6aa3" }} />
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-slate-500">
                              Area
                            </div>
                            <div className="text-base sm:text-lg font-semibold text-[#08274a] truncate">
                              {areaValue}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Information Rows */}
                    <div className="px-4 sm:px-5 pb-3">
                      <div className="rounded-md border border-[#d7e7f4] overflow-hidden">
                        {infoRows.map((row, index) => (
                          <div
                            key={row.label}
                            className={`grid grid-cols-[24px_minmax(95px,135px)_10px_1fr]
                      gap-2 px-3 py-2 items-start
                      ${index === 0 ? "" : "border-t border-slate-200"}`}
                          >
                            <div
                              className="flex items-center justify-center pt-0.5"
                              style={{ color: row.color }}
                            >
                              {row.icon}
                            </div>

                            <div className="text-sm font-medium text-slate-500">
                              {row.label}
                            </div>

                            <div className="text-sm font-semibold text-[#08274a]">
                              :
                            </div>

                            <div className="text-sm font-medium leading-snug text-[#08274a] break-words">
                              {row.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Compact Footer */}
                    <div
                      className="flex items-center justify-between gap-2
                px-4 sm:px-5 py-2 border-t border-blue-100
                bg-[#f4fbff] rounded-b-lg"
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<LocationOn />}
                        onClick={zoomToSelectedParcel}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          borderColor: "#bfdbfe",
                          color: "#0f5f9f",
                          backgroundColor: "#eaf6ff",
                          borderRadius: "6px",
                          paddingX: 1.5,
                          "&:hover": {
                            borderColor: "#93c5fd",
                            backgroundColor: "#dff0ff",
                          },
                        }}
                      >
                        Zoom to Location
                      </Button>

                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Close />}
                        onClick={closePopup}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          backgroundColor: "#0d5f9f",
                          borderRadius: "6px",
                          paddingX: 1.5,
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
                  </div>

                  {/* Popup Pointer */}
                  {popupPlacement === "above" ? (
                    <div
                      className="absolute left-1/2 -bottom-[8px]
                -translate-x-1/2 w-0 h-0
                border-l-[8px] border-r-[8px] border-t-[8px]
                border-l-transparent border-r-transparent
                border-t-[#f4fbff]"
                      style={{
                        filter: "drop-shadow(0 2px 2px rgba(15,23,42,0.06))",
                      }}
                    />
                  ) : (
                    <div
                      className="absolute left-1/2 -top-[8px]
                -translate-x-1/2 w-0 h-0
                border-l-[8px] border-r-[8px] border-b-[8px]
                border-l-transparent border-r-transparent
                border-b-white"
                      style={{
                        filter: "drop-shadow(0 -2px 2px rgba(15,23,42,0.06))",
                      }}
                    />
                  )}
                </>
              );
            })()}
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
                )},${Number(selectedMarker.longitude)}&z=19&output=embed`}
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
              width: 42,
              height: 42,
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
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

        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-30 bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.12)] w-[340px] sm:w-[420px] max-w-[calc(100vw-24px)] border border-slate-200 overflow-hidden transition-all duration-200">
          {/* Header — clickable toggle */}
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer"
            aria-expanded={legendOpen}
            aria-label={legendOpen ? "Collapse legend" : "Expand legend"}
          >
            <h4 className="font-bold text-sm text-slate-800 tracking-tight">
              Legend
            </h4>

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

          {/* Body — collapses smoothly */}
          <div
            className={`transition-all duration-200 ease-in-out overflow-hidden ${
              legendOpen ? "max-h-[75vh] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-4 py-4 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* LULC Legend */}
              <div>
                <h5 className="text-sm font-bold text-slate-800 mb-3">LULC</h5>

                {[
                  {
                    code: "RG-I",
                    description: "Residential General-I",
                    color: "#FFFF00",
                  },
                  {
                    code: "RG-II",
                    description: "Residential General-II",
                    color: "#FFB000",
                  },
                  {
                    code: "RG-III",
                    description: "Residential General-III",
                    color: "#D9825B",
                  },
                  {
                    code: "RG-IV",
                    description: "Residential General-IV",
                    color: "#FF8000",
                  },
                  {
                    code: "RG-V",
                    description: "Residential General-V",
                    color: "#F5D08A",
                  },
                  {
                    code: "GC",
                    description: "Growth Corridor",
                    color: "#FFF0C2",
                  },
                  {
                    code: "TOD",
                    description: "Transit Oriented Development",
                    color: "#FFFFFF",
                    pattern: "checker",
                  },
                  { code: "OC", description: "Old City", color: "#FF7777" },
                  {
                    code: "CMU-I",
                    description: "Commercial Mixed Use Center-I",
                    color: "#0878F9",
                  },
                  {
                    code: "CMU-II",
                    description: "Commercial Mixed Use Center-II",
                    color: "#0050A8",
                  },
                  {
                    code: "CMU-III",
                    description: "Commercial Mixed Use Center-III",
                    color: "#72AEF5",
                  },
                  {
                    code: "SPZ1",
                    description: "Special Planning Zone-1",
                    color: "#FFFFFF",
                    pattern: "diagonal",
                  },
                  {
                    code: "I-1",
                    description: "Industries -1",
                    color: "#A900E8",
                  },
                  {
                    code: "I-2",
                    description: "Industries -2",
                    color: "#D783F0",
                  },
                  {
                    code: "PUF",
                    description: "Public Utilities & Facilities",
                    color: "#783000",
                  },
                  {
                    code: "PSP",
                    description: "Public & Semi Public",
                    color: "#E00000",
                  },
                  {
                    code: "LW",
                    description: "Logistics, Wholesale and Warehousing",
                    color: "#008B9B",
                  },
                  {
                    code: "G1",
                    description: "Gardens and Parks",
                    color: "#39FF14",
                  },
                  {
                    code: "G2",
                    description: "Playfield / Stadium / Exhibition Ground",
                    color: "#91C832",
                  },
                  {
                    code: "G3",
                    description: "Zoological / Botanical Garden",
                    color: "#319B18",
                  },
                  {
                    code: "G4",
                    description: "Lake Front",
                    color: "#FFFFFF",
                    pattern: "vertical",
                  },
                  {
                    code: "G5",
                    description: "City Forest / Afforestation",
                    color: "#006B54",
                  },
                  {
                    code: "ESZ",
                    description: "Eco-Sensitive Zone",
                    color: "#FFFFFF",
                    pattern: "diagonalGreen",
                  },
                  {
                    code: "BIZ0",
                    description: "Bhojtal Influence Zone-0",
                    color: "#FFFFFF",
                    pattern: "diagonalBlue",
                  },
                  {
                    code: "BIZ1",
                    description: "Bhojtal Influence Zone-1",
                    color: "#00A887",
                  },
                  {
                    code: "BIZ2",
                    description: "Bhojtal Influence Zone-2",
                    color: "#F1F7C0",
                  },
                  {
                    code: "V",
                    description: "Village / Gramin Abadi",
                    color: "#FFFF66",
                  },
                  { code: "W", description: "Waterbodies", color: "#00B9E8" },
                  {
                    code: "WB",
                    description: "Waterbodies Buffer",
                    color: "#A4B500",
                  },
                  { code: "AG", description: "Agriculture", color: "#D9F8CC" },
                ].map((item) => (
                  <div
                    key={item.code}
                    className="grid grid-cols-[64px_64px_minmax(0,1fr)] gap-x-3 items-center py-1.5"
                  >
                    {/* Color symbol */}
                    <div
                      className="h-5 border border-slate-400 rounded-[2px] w-full"
                      style={{
                        backgroundColor: item.color,
                        backgroundImage:
                          item.pattern === "diagonal"
                            ? "repeating-linear-gradient(130deg, #ff6b00 0px, #ff6b00 2px, #fff 2px, #fff 4px)"
                            : item.pattern === "checker"
                              ? "repeating-conic-gradient(#222 0% 25%, #fff 0% 50%) 0 / 4px 4px"
                              : item.pattern === "vertical"
                                ? "repeating-linear-gradient(90deg, #008b62 0px, #008b62 2px, #fff 2px, #fff 4px)"
                                : item.pattern === "diagonalGreen"
                                  ? "repeating-linear-gradient(130deg, #009900 0px, #009900 2px, #fff 2px, #fff 4px)"
                                  : item.pattern === "diagonalBlue"
                                    ? "repeating-linear-gradient(130deg, #168bff 0px, #168bff 2px, #fff 2px, #fff 4px)"
                                    : "none",
                      }}
                    />

                    {/* Code */}
                    <span className="text-xs font-semibold text-slate-700">
                      {item.code}
                    </span>

                    {/* Description */}
                    <span className="text-xs text-slate-600 leading-snug break-words">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>

              {/* Transportation Legend */}
              <div>
                <h5 className="text-sm font-bold text-slate-800 mb-3">
                  Transportation
                </h5>

                {[
                  { label: "Existing Road", style: "solid" },
                  { label: "Proposed Road", style: "dashed" },
                  { label: "Railway Line", style: "railway" },
                  { label: "Bridge", style: "bridge" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-4 py-1.5"
                  >
                    <div className="w-16 flex-shrink-0 flex items-center">
                      {item.style === "solid" && (
                        <div className="border-t-2 border-slate-600 w-full" />
                      )}

                      {item.style === "dashed" && (
                        <div className="border-t-2 border-dashed border-slate-600 w-full" />
                      )}

                      {item.style === "railway" && (
                        <div className="relative border-t-2 border-slate-800 w-full">
                          <div className="absolute inset-x-0 -top-[5px] flex justify-between">
                            {Array.from({ length: 9 }).map((_, i) => (
                              <span
                                key={i}
                                className="h-2.5 border-l-2 border-slate-800"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {item.style === "bridge" && (
                        <div className="h-4 border-y-2 border-slate-700 relative w-full">
                          <div className="absolute left-0 right-0 top-1/2 border-t-2 border-slate-500" />
                        </div>
                      )}
                    </div>

                    <span className="text-xs text-slate-700 font-medium">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Boundary Legend */}
              <div>
                <h5 className="text-sm font-bold text-slate-800 mb-3">
                  Boundary
                </h5>

                {[
                  { label: "Planning Area", style: "planning" },
                  { label: "Village", style: "village" },
                  { label: "Municipal", style: "municipal" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-4 py-1.5"
                  >
                    <div
                      className={`w-16 h-5 flex-shrink-0 border-2 ${
                        item.style === "planning"
                          ? "border-slate-800"
                          : item.style === "village"
                            ? "border-fuchsia-500 border-dashed border-x-4 border-y-4"
                            : "border-red-800 border-dashed border-x-4 border-y-4"
                      }`}
                    >
                      {item.style === "planning" && (
                        <div className="border-t border-slate-800 mt-1.5" />
                      )}
                    </div>

                    <span className="text-xs text-slate-700 font-medium">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
