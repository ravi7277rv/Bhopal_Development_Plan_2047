import React, { useEffect, useRef, useState, useMemo } from "react";
import html2canvas from "html2canvas";
import { Download } from "@mui/icons-material";
import {
  Search,
  Close,
  Add,
  Remove,
  MyLocation,
  LocationOn,
  AltRoute,
  Home,
  Map as MapIcon,
  Park,
  CropSquare,
} from "@mui/icons-material";
import { IconButton, Button } from "@mui/material";
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
import Feature from "ol/Feature";
import { fromLonLat } from "ol/proj";
import { Style, Fill, Stroke, Icon } from "ol/style";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import ScaleLine from "ol/control/ScaleLine";
import { BHOPAL_CENTER } from "../../data/mockdata";
import type { MapMarker } from "../../types/index.type";
import HomePin from "../../assets/mapLocation/Home.svg";
import LandusePin from "../../assets/mapLocation/Landuse.svg";
import ParkPin from "../../assets/mapLocation/Park.svg";
import RoadPin from "../../assets/mapLocation/Road.svg";
import { DescriptionRenderer } from "../common/DescriptionsReader";
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
  onLocationSelect: (marker: MapMarker) => void;
  searchQuery?: string;
  resetKey: number;
  selectedKhasra: string;
  activeChip: string;
}

const MapView: React.FC<MapViewProps> = ({
  markers,
  boundaryMarkers,
  selectedVillage,
  focusMarker,
  onLocationSelect,
  searchQuery = "",
  resetKey,
  selectedKhasra,
  setVillage
  activeChip
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const markerSourceRef = useRef<VectorSource | null>(null);
  const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const boundaryLayersRef = useRef<{
    village: VectorLayer<VectorSource>;
  } | null>(null);
  const boundaryFeaturesRef = useRef<{ village: Feature[] }>({ village: [] });
  const [boundariesReady, setBoundariesReady] = useState(false);
  const [villageLayerOn] = useState(true);
  const [selectedSearchText, setSelectedSearchText] = useState("");
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  // ✅ Popup state
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [popupPlacement, setPopupPlacement] = useState<"above" | "below">(
    "above",
  );
  const [detailMarker, setDetailMarker] = useState<MapMarker | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // ============ SEARCH STATE ============
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState(-1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Scale + export state
  const [selectedScale, setSelectedScale] = useState<number | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [pendingExportScale, setPendingExportScale] = useState<number | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);

  const [searchType, setSearchType] = useState("classification");

  const searchOptions = [
    // { label: "All Fields", value: "all" },
    { label: "Village", value: "village" },
    { label: "Khasra No.", value: "khasraNo" },
    { label: "Aapatti No.", value: "aapattiNo" },
    { label: "Classification", value: "classification" },
    { label: "Objection ID", value: "objectionId" },
  ];

  /* ============ DEBOUNCE ============ */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchValue), 150);
    return () => clearTimeout(t);
  }, [searchValue]);

  /* ============ SEARCH RESULTS ============ */
  // const searchResults = useMemo(() => {
  //   const q = debouncedSearch.trim().toLowerCase();
  //   if (!q) return [];
  //   return markers
  //     .filter((m) => {
  //       const haystack = [
  //         m.objectionId,
  //         m.objectType,
  //         m.remark,
  //         m.khasraNo,
  //         m.village,
  //         m.bhucode,
  //         m.code,
  //         m.apattiGro,
  //         m.upvargikar,
  //         m.vargikaran,
  //       ]
  //         .filter(Boolean)
  //         .join(" ")
  //         .toLowerCase();
  //       return haystack.includes(q);
  //     })
  //     .slice(0, 20);
  // }, [debouncedSearch, markers]);

  const searchResults = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    if (!q) return [];

    const getValue = (value: unknown) => String(value ?? "").toLowerCase();

    return markers
      .filter((m) => {
        // Search only in the selected field
        switch (searchType) {
          case "village":
            return getValue(m.village).includes(q);

          case "khasraNo":
            return getValue(m.khasraNo).includes(q);

          case "aapattiNo":
            return getValue(m.apattiGro).includes(q);

          case "classification":
            return getValue(m.objectType).includes(q);

          case "objectionId":
            // Match individual IDs, including comma-separated IDs
            return String(m.objectionId ?? "")
              .split(",")
              .some((id) => id.trim().toLowerCase().includes(q));

          default: {
            // const haystack = [
            //   m.objectionId,
            //   m.objectType,
            //   m.remark,
            //   m.khasraNo,
            //   m.village,
            //   m.bhucode,
            //   m.code,
            //   m.apattiGro,
            //   m.upvargikar,
            //   m.vargikaran,
            // ]
            //   .filter(Boolean)
            //   .join(" ")
            //   .toLowerCase();

            // return haystack.includes(q);
            return false;
          }
        }
      })
      .slice(0, 20);
  }, [debouncedSearch, markers, searchType]);

  const getHighlightText = (m: MapMarker): string => {
    switch (searchType) {
      case "village":
        return String(m.village ?? "");

      case "khasraNo":
        return String(m.khasraNo ?? "");

      case "aapattiNo":
        return String(m.apattiGro ?? "");

      case "classification":
        return String(m.objectType ?? "");

      case "objectionId":
        return String(m.objectionId ?? "");

      default:
        return "";
    }
  };

  const handleResultClick = (m: MapMarker) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const geom = wktToGeometry(m.geom);
    const anchor = getGeometryAnchor(geom);
    if (!anchor) return;

    setSelectedSearchText(searchValue.trim() || searchQuery.trim());
    onLocationSelect(m);
    setHighlightedIds(new Set([m.id]));

    map.getView().animate({
      center: anchor,
      zoom: Math.max(map.getView().getZoom() || 13, 16),
      duration: 250,
    });

    setSearchOpen(false);
    setSearchHighlight(-1);
  };

  useEffect(() => {
    setHighlightedIds(focusMarker ? new Set([focusMarker.id]) : new Set());
  }, [focusMarker]);

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
      const pick = searchResults[searchHighlight] ?? searchResults[0];
      if (pick) handleResultClick(pick);
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

    const baseLayer = new TileLayer({ source: new OSM() });

    const markerSource = new VectorSource();
    markerSourceRef.current = markerSource;

    const markerLayer = new VectorLayer({
      source: markerSource,
      zIndex: 20,
    });
    markerLayerRef.current = markerLayer;

    // Village boundary layer only (no tehsil)
    const villageSource = new VectorSource();
    const villageLayer = new VectorLayer({
      source: villageSource,
      style: new Style({
        fill: new Fill({ color: "rgba(245, 158, 11, 0.12)" }),
        stroke: new Stroke({ color: "#d97706", width: 2.5 }),
      }),
      zIndex: 11,
      visible: true,
    });
    boundaryLayersRef.current = { village: villageLayer };

    const geojson = new GeoJSON();
    fetch("/village.geojson")
      .then((response) => {
        if (!response.ok) throw new Error("Village boundaries unavailable");
        return response.json();
      })
      .then((villages) => {
        villageSource.addFeatures(
          geojson.readFeatures(villages, { featureProjection: "EPSG:3857" }),
        );
        boundaryFeaturesRef.current = {
          village: villageSource.getFeatures(),
        };
        setBoundariesReady(true);
        map.render();
      })
      .catch((error) =>
        console.error("Could not load village boundary layer", error),
      );

    const overlay = new Overlay({
      element: popupRef.current,
      positioning: "bottom-center",
      offset: [0, -30],
      stopEvent: true,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer, villageLayer, markerLayer],
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

    const handleMapClick = (evt: MapBrowserEvent) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        hitTolerance: 10,
        layerFilter: (layer) => layer === markerLayer,
      });

      if (feature) {
        const markerData = feature.get("markerData") as MapMarker;
        onLocationSelect(markerData);

        const geom: any = feature.getGeometry();
        const anchor = getGeometryAnchor(geom);
        if (!anchor) return;

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
        setSelectedMarker(markerData);
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
  }, [selectedVillage, villageLayerOn, boundariesReady, boundaryMarkers]);

  /* ============================================================
     Filter markers by active chip (apattiGro match)
     ============================================================ */
  const visibleMarkers = useMemo(() => {
    // "All" → every marker already filtered by the parent
    if (activeChip === 'All') return markers;

    // "UN" → markers with empty / null apattiGro
    if (activeChip === 'UN') {
      return markers.filter((m) => !m.apattiGro || m.apattiGro.trim() === '');
    }

    // numeric chip → match apattiGro
    return markers.filter((m) => m.apattiGro === activeChip);
  }, [markers, activeChip]);

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
              width: isHovered ? 3 : isSearchMatch || isHighlighted ? 2.5 : 1.5,
            }),
            image: new Icon({
              src: svgUrl,
              anchor: [0.5, 1],
              anchorXUnits: "fraction",
              anchorYUnits: "fraction",
              scale: isHovered
                ? 0.7
                : isSearchMatch
                  ? 0.6
                  : isHighlighted
                    ? 0.55
                    : 0.45,
            }),
            zIndex: isHovered ? 9999 : isSearchMatch ? 100 : isHighlighted ? 50 : 1,
          }),
        );

        return feature;
      })
      .filter(Boolean) as Feature[];

    source.clear();
    source.addFeatures(features);

    if (visibleMarkers.length > 0) {
      fitMapToMarkers(visibleMarkers, [80, 80, 80, 80], 800);
    }

    // Close popup / detail if their marker is no longer visible
    if (selectedMarker && !visibleMarkers.some((m) => m.id === selectedMarker.id)) {
      overlayRef.current?.setPosition(undefined);
      setSelectedMarker(null);
    }
    if (detailMarker && !visibleMarkers.some((m) => m.id === detailMarker.id)) {
      setDetailMarker(null);
    }
  }, [
    visibleMarkers,
    highlightedIds,
    debouncedSearch,
    searchResults,
    hoveredMarkerId,
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
    setSelectedMarker(null);
  };
  const openDetail = () => {
    if (selectedMarker) {
      setDetailMarker(selectedMarker);
      overlayRef.current?.setPosition(undefined);
      setSelectedMarker(null);
    }
  };
  const closeDetail = () => setDetailMarker(null);

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
                      setSearchType("classification");

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
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              backgroundColor: `${markerColors[cat]}20`,
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
                                  getHighlightText(m),
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
          className={`w-72 bg-white rounded-xl shadow-[0_8px_28px_rgba(15,23,42,0.16)] border border-slate-200 transition-opacity duration-150 overflow-visible z-40 ${selectedMarker
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
            }`}
        >
          {selectedMarker &&
            (() => {
              const cat = normalizeCategory(selectedMarker.objectType);
              return (
                <>
                  <div
                    className="relative flex justify-between items-center px-3.5 py-2.5 rounded-t-xl"
                    style={{
                      background: `linear-gradient(135deg, ${markerColors[cat]}20 0%, ${markerColors[cat]}10 100%)`,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                        style={{
                          backgroundColor: markerColors[cat] || "#6b7280",
                          color: "#ffffff",
                        }}
                      >
                        {getCategoryIcon(cat, 17)}
                      </div>
                      <div className="text-[14px] font-bold text-slate-800 truncate leading-tight">
                        {selectedMarker.objectType}
                      </div>
                    </div>

                    <button
                      onClick={closePopup}
                      className="w-6 h-6 ml-3 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors flex-shrink-0"
                      aria-label="Close"
                    >
                      <Close sx={{ fontSize: 15 }} />
                    </button>
                  </div>

                  <div className="px-3.5 py-2.5 space-y-2.5">
                    <span className="inline-block text-[12px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-full">
                      {selectedMarker.objectionId}
                    </span>

                    <div className="flex items-start gap-2 pt-2">
                      <LocationOn
                        sx={{
                          fontSize: 14,
                          color: "#94a3b8",
                          marginTop: "2px",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                          Location
                        </div>
                        <div className="text-[12px] text-slate-800 font-medium leading-snug">
                          Khasra {selectedMarker.khasraNo},{" "}
                          {selectedMarker.village}
                        </div>
                      </div>
                    </div>

                    {selectedMarker.area !== undefined &&
                      selectedMarker.area > 0 && (
                        <div className="flex items-start gap-2 pt-2">
                          <CropSquare
                            sx={{
                              fontSize: 13,
                              color: "#94a3b8",
                              marginTop: "2px",
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                              Area
                            </div>
                            <div className="text-[12px] text-slate-800 font-medium">
                              {selectedMarker.area.toFixed(4)} sq.m
                            </div>
                          </div>
                        </div>
                      )}

                    <div className="pt-2">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={openDetail}
                        fullWidth
                        sx={{
                          textTransform: "none",
                          fontSize: 11.5,
                          fontWeight: 600,
                          backgroundColor: "#0f2c4a",
                          boxShadow: "none",
                          paddingTop: "6px",
                          paddingBottom: "6px",
                          borderRadius: "7px",
                          "&:hover": {
                            backgroundColor: "#1a4a75",
                            boxShadow: "0 3px 10px rgba(15,44,74,0.22)",
                          },
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  {popupPlacement === "above" ? (
                    <div
                      className="absolute left-1/2 -bottom-[8px] -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white"
                      style={{
                        filter: "drop-shadow(0 2px 2px rgba(15,23,42,0.06))",
                      }}
                    />
                  ) : (
                    <div
                      className="absolute left-1/2 -top-[8px] -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white"
                      style={{
                        filter: "drop-shadow(0 -2px 2px rgba(15,23,42,0.06))",
                      }}
                    />
                  )}
                </>
              );
            })()}
        </div>

        {/* DETAIL PANEL */}
        <div
          data-html2canvas-ignore="true"
          className={`absolute bottom-4 right-4 z-40 w-[calc(100vw-24px)] sm:w-[380px] lg:w-[420px] max-h-[calc(100%-100px)] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${detailMarker
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
            }`}
        >
          {detailMarker &&
            (() => {
              const cat = normalizeCategory(detailMarker.objectType);
              return (
                <>
                  <div
                    className="relative flex justify-between items-center px-4 py-2.5 border-b border-slate-100"
                    style={{
                      background: `linear-gradient(135deg, ${markerColors[cat]}16 0%, ${markerColors[cat]}12 100%)`,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: markerColors[cat] || "#6b7280",
                          color: "#ffffff",
                        }}
                      >
                        {getCategoryIcon(cat, 18)}
                      </div>
                      <div className="text-[15px] font-bold text-slate-800 truncate leading-tight">
                        {detailMarker.objectType}
                      </div>
                    </div>

                    <button
                      onClick={closeDetail}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors flex-shrink-0"
                      aria-label="Close"
                    >
                      <Close sx={{ fontSize: 16 }} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    <span className="inline-block text-[12px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-full">
                      {detailMarker.objectionId}
                    </span>

                    <div className="flex items-start gap-2.5 pt-2">
                      <LocationOn
                        sx={{
                          fontSize: 15,
                          color: "#94a3b8",
                          marginTop: "2px",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                          Location
                        </div>
                        <div className="text-[12px] text-slate-800 font-medium leading-snug">
                          Khasra {detailMarker.khasraNo}, {detailMarker.village}
                        </div>
                      </div>
                    </div>

                    {detailMarker.area !== undefined &&
                      detailMarker.area > 0 && (
                        <div className="flex items-start gap-2.5 pt-2">
                          <CropSquare
                            sx={{
                              fontSize: 13,
                              color: "#94a3b8",
                              marginTop: "3px",
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                              Area
                            </div>
                            <div className="text-[12px] text-slate-800 font-medium">
                              {detailMarker.area.toFixed(4)} sq.m
                            </div>
                          </div>
                        </div>
                      )}

                    {detailMarker.bhucode && (
                      <div className="flex items-start gap-2.5 pt-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                            Bhu Code
                          </div>
                          <div className="text-[12px] text-slate-800 font-medium break-all">
                            {detailMarker.bhucode}
                          </div>
                        </div>
                      </div>
                    )}

                    {detailMarker.code && (
                      <div className="flex items-start gap-2.5 pt-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                            Code
                          </div>
                          <div className="text-[12px] text-slate-800 font-medium">
                            {detailMarker.code}
                          </div>
                        </div>
                      </div>
                    )}

                    {detailMarker.remark && (
                      <div className="pt-2">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">
                          Remark
                        </div>
                        <div className="text-[12px] text-slate-700 leading-relaxed">
                          <DescriptionRenderer
                            description={detailMarker.remark}
                            selectedSearchText={
                              searchQuery.trim() || selectedSearchText
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-2 bg-slate-50 rounded-b-xl flex justify-end">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={closeDetail}
                      sx={{
                        textTransform: "none",
                        fontSize: 11.5,
                        fontWeight: 600,
                        backgroundColor: "#0f2c4a",
                        boxShadow: "none",
                        paddingLeft: "14px",
                        paddingRight: "14px",
                        paddingTop: "5px",
                        paddingBottom: "5px",
                        borderRadius: "7px",
                        "&:hover": {
                          backgroundColor: "#1a4a75",
                          boxShadow: "0 3px 10px rgba(15,44,74,0.22)",
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

        {/* MAP CONTROLS */}
        <div
          data-html2canvas-ignore="true"
          className="absolute right-3 sm:right-4 top-3 sm:top-4 flex flex-col gap-2 z-30"
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

        {/* LEGEND */}
        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-30 bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] w-44 sm:w-52 border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
            <h4 className="font-bold text-[11.5px] text-slate-800 tracking-tight">
              Legend
            </h4>
          </div>
          <div className="px-3 py-2 space-y-1.5">
            {Object.entries(markerColors).map(([key, hex]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${hex}20`, color: hex }}
                >
                  {getCategoryIcon(key, 11)}
                </div>
                <span className="text-[10.5px] text-slate-600 font-medium">
                  {key}
                </span>
              </div>
            ))}
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
