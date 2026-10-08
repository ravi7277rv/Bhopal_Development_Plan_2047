import React, { useEffect, useRef, useState, useMemo } from "react";
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
import { Download } from "@mui/icons-material";
import {
  Search,
  Close,
  Add,
  Remove,
  MyLocation,
  LocationOn,
  Fullscreen,
  FullscreenExit,
  ImportExport,
  AltRoute,
  Home,
  Map as MapIcon,
  Park,
  CalendarToday,
} from "@mui/icons-material";
import { IconButton, Button, TextField, InputAdornment } from "@mui/material";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import Overlay from "ol/Overlay";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import OSM from "ol/source/OSM";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Style, Fill, Stroke, Circle as CircleStyle, Icon } from "ol/style";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import ScaleLine from "ol/control/ScaleLine";
import { BHOPAL_CENTER } from "../../data/mockdata";
import type { MapMarker } from "../../types/index.type";
import HomePin from "../../assets/mapLocation/Home.svg";
import LandusePin from "../../assets/mapLocation/Landuse.svg";
import ParkPin from "../../assets/mapLocation/Park.svg";
import RoadPin from "../../assets/mapLocation/Road.svg";
import { DescriptionRenderer } from "../common/DescriptionsReader";

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

/* ============ CATEGORY → ICON (used in map + popup) ============ */
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

/* ============ SVG MARKER GENERATOR (pin + inner icon) ============ */

/* ============ SVG → DATA URL ============ */
const svgToDataUrl = (svg: string): string => {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
};
//   const highlight = (
//   text: string | undefined,
//   query: string,
// ): React.ReactNode => {
//   if (!text) return null;
//   const q = query.trim();
//   if (!q) return text;

//   const idx = text.toLowerCase().indexOf(q.toLowerCase());
//   if (idx === -1) return text;

//   return (
//     <>
//       {text.slice(0, idx)}
//       <mark className="bg-yellow-200 text-slate-900 rounded px-0.5">
//         {text.slice(idx, idx + q.length)}
//       </mark>
//       {text.slice(idx + q.length)}
//     </>
//   );
// };


const highlightFullText = (
  text: string | undefined,
  query: string
): React.ReactNode => {
  if (!text) return null;

  const q = query.trim();

  if (!q) return text;

  const parts = text.split(
    new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  );

  return parts.map((part, index) => {
    const isMatch =
      part.toLowerCase() === q.toLowerCase();

    return isMatch ? (
      <mark
        key={index}
        className="bg-yellow-200 text-slate-900 rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={index}>
        {part}
      </React.Fragment>
    );
  });
};


interface MapViewProps {
  markers: MapMarker[];
  boundaryMarkers: MapMarker[];
  selectedTehsil: string;
  selectedVillage: string;
  focusMarker: MapMarker | null;
  onLocationSelect: (marker: MapMarker) => void;
  searchQuery?: string;
  resetKey: number;
}

const MapView: React.FC<MapViewProps> = ({
  markers,
  boundaryMarkers,
  selectedTehsil,
  selectedVillage,
  focusMarker,
  onLocationSelect,
  searchQuery = "",
  resetKey,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const markerSourceRef = useRef<VectorSource | null>(null);
  const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const boundaryLayersRef = useRef<{
    tehsil: VectorLayer<VectorSource>;
    village: VectorLayer<VectorSource>;
  } | null>(null);
  const boundaryFeaturesRef = useRef<{ tehsil: Feature[]; village: Feature[] }>(
    { tehsil: [], village: [] },
  );
  const [boundariesReady, setBoundariesReady] = useState(false);
  const [tehsilLayerOn, setTehsilLayerOn] = useState(true);
  const [villageLayerOn, setVillageLayerOn] = useState(true);
  const [selectedSearchText, setSelectedSearchText] = useState("");
  const [hoveredMarkerId, setHoveredMarkerId] = useState<
    string | number | null
  >(null);

  // ✅ Popup state
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  const [popupPlacement, setPopupPlacement] = useState<"above" | "below">(
    "above",
  );
  const [detailMarker, setDetailMarker] = useState<MapMarker | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string | number>>(
    new Set(),
  );

  /* ============ SEARCH STATE ============ */
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState(-1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ✅ Unified active query — Map search wins, fall back to Sidebar search */
  const activeQuery = debouncedSearch.trim() || searchQuery.trim();

  /* ============ DEBOUNCE ============ */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchValue), 150);
    return () => clearTimeout(t);
  }, [searchValue]);

  /* ============ SEARCH RESULTS — multi-field ============ */
  const searchResults = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];

    return markers
      .filter((m) => {
        const haystack = [
          m.objectionId,
          m.title,
          m.description,
          m.khasraNo,
          m.village,
          m.tehsil,
          m.category,
          (m as any).groupNumber,
          (m as any).group,
          (m as any).suggestion,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 20);
  }, [debouncedSearch, markers]);

  // ✅ Click on result → fly to marker + open popup
  // const handleResultClick = (m: MapMarker) => {
  //   const map = mapInstanceRef.current;
  //   const overlay = overlayRef.current;
  //   if (!map || !overlay) return;

  //   const coords = fromLonLat([m.lng, m.lat]);

  //   map.getView().animate({
  //     center: coords,
  //     zoom: Math.max(map.getView().getZoom() || 13, 16),
  //     duration: 600,
  //   });

  //   setTimeout(() => {
  //     const anchorPx = map.getPixelFromCoordinate(coords);
  //     const mapSize = map.getSize();
  //     const POPUP_SAFE_ZONE = 340;
  //     const placeBelow = mapSize !== undefined && anchorPx[1] < POPUP_SAFE_ZONE;

  //     if (placeBelow) {
  //       overlay.setPositioning("top-center");
  //       overlay.setOffset([0, 18]);
  //       setPopupPlacement("below");
  //     } else {
  //       overlay.setPositioning("bottom-center");
  //       overlay.setOffset([0, -18]);
  //       setPopupPlacement("above");
  //     }

  //     overlay.setPosition(coords);
  //     setSelectedMarker(m);
  //   }, 620);

  //   setSearchValue("");
  //   setSearchOpen(false);
  //   setSearchHighlight(-1);
  // };

  // const handleResultClick = (m: MapMarker) => {
  //   const map = mapInstanceRef.current;
  //   const overlay = overlayRef.current;
  //   if (!map) return;
  //   const coords = fromLonLat([m.lng, m.lat]);
  //   onLocationSelect(m);
  //   setHighlightedIds(new Set([m.id]));
  //   map.getView().animate({
  //     center: coords,
  //     zoom: Math.max(map.getView().getZoom() || 13, 16),
  //     duration: 250,
  //   });

  //   setTimeout(() => {
  //     const anchorPx = map.getPixelFromCoordinate(coords);
  //     const mapSize = map.getSize();
  //     const POPUP_SAFE_ZONE = 340;
  //     const placeBelow =
  //       mapSize !== undefined && anchorPx[1] < POPUP_SAFE_ZONE;

  //     if (placeBelow) {
  //       overlay.setPositioning("top-center");
  //       overlay.setOffset([0, 18]);
  //       setPopupPlacement("below");
  //     } else {
  //       overlay.setPositioning("bottom-center");
  //       overlay.setOffset([0, -18]);
  //       setPopupPlacement("above");
  //     }

  //     overlay.setPosition(coords);
  //     setSelectedMarker(m);
  //   }, 620);

  //   setSearchValue("");
  //   setSearchOpen(false);
  // };

  const handleResultClick = (m: MapMarker) => {
  const map = mapInstanceRef.current;
  // const overlay = overlayRef.current;

  if (!map) return;

  const coords = fromLonLat([m.lng, m.lat]);

  // Jo user ne actual search kiya tha
  setSelectedSearchText(searchValue.trim() || searchQuery.trim());

  onLocationSelect(m);

  // Only selected marker highlight
  setHighlightedIds(new Set([m.id]));

  map.getView().animate({
    center: coords,
    zoom: Math.max(map.getView().getZoom() || 13, 16),
    duration: 250,
  });

  // setTimeout(() => {
  //   if (!overlay) return;

  //   const anchorPx = map.getPixelFromCoordinate(coords);
  //   const mapSize = map.getSize();
  //   const POPUP_SAFE_ZONE = 340;

  //   const placeBelow =
  //     mapSize !== undefined && anchorPx[1] < POPUP_SAFE_ZONE;

  //   if (placeBelow) {
  //     overlay.setPositioning("top-center");
  //     overlay.setOffset([0, 18]);
  //     setPopupPlacement("below");
  //   } else {
  //     overlay.setPositioning("bottom-center");
  //     overlay.setOffset([0, -18]);
  //     setPopupPlacement("above");
  //   }

  //   overlay.setPosition(coords);
  //   setSelectedMarker(m);
  // }, 620);

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

  //  const handleSearchKeyDown = (
  //   e: React.KeyboardEvent<HTMLInputElement>,
  // ) => {
  //   if (e.key === "Escape") {
  //     setSearchOpen(false);
  //     return;
  //   }

  //   if (!searchOpen || searchResults.length === 0) return;

  //   if (e.key === "ArrowDown") {
  //     e.preventDefault();
  //     setSearchHighlight((prev) => (prev + 1) % searchResults.length);
  //   } else if (e.key === "ArrowUp") {
  //     e.preventDefault();
  //     setSearchHighlight((prev) =>
  //       prev <= 0 ? searchResults.length - 1 : prev - 1,
  //     );
  //   } else if (e.key === "Enter") {
  //     e.preventDefault();
  //     if (searchHighlight >= 0 && searchResults[searchHighlight]) {
  //       handleResultClick(searchResults[searchHighlight]);
  //     } else if (searchResults[0]) {
  //       handleResultClick(searchResults[0]);
  //     }
  //   } else if (e.key === "Escape") {
  //     setSearchOpen(false);
  //     setSearchHighlight(-1);
  //   }
  //    const pick =
  //       searchResults[searchHighlight] ?? searchResults[0];
  //     if (pick) handleResultClick(pick);
  //   };

  const handleSearchKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>
) => {
  if (e.key === "Escape") {
    setSearchOpen(false);
    setSearchHighlight(-1);
    return;
  }

  if (!searchOpen || searchResults.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();

    setSearchHighlight(
      (prev) => (prev + 1) % searchResults.length
    );

  } else if (e.key === "ArrowUp") {
    e.preventDefault();

    setSearchHighlight((prev) =>
      prev <= 0
        ? searchResults.length - 1
        : prev - 1
    );

  } else if (e.key === "Enter") {
    e.preventDefault();

    const pick =
      searchResults[searchHighlight] ??
      searchResults[0];

    if (pick) {
      handleResultClick(pick);
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

  /* ============ FULLSCREEN ============ */
  // useEffect(() => {
  //   const handleFsChange = () => {
  //     setIsFullscreen(Boolean(document.fullscreenElement));
  //   };
  //   document.addEventListener("fullscreenchange", handleFsChange);
  //   return () =>
  //     document.removeEventListener("fullscreenchange", handleFsChange);
  // }, []);

  // const handleToggleFullscreen = () => {
  //   if (!document.fullscreenElement) {
  //     document.documentElement.requestFullscreen?.();
  //   } else {
  //     document.exitFullscreen?.();
  //   }
  // };
  const fitMapToMarkers = (
    mapMarkers: MapMarker[],
    padding: number[] = [80, 80, 80, 80],
    duration: number = 800,
  ) => {
    const map = mapInstanceRef.current;
    if (!map || mapMarkers.length === 0) return;

    const view = map.getView();

    // Single marker → center on it with a nice zoom
    if (mapMarkers.length === 1) {
      const coords = fromLonLat([mapMarkers[0].lng, mapMarkers[0].lat]);
      view.animate({
        center: coords,
        zoom: 15,
        duration,
      });
      return;
    }

    // Multiple markers → compute bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    mapMarkers.forEach((m) => {
      const [x, y] = fromLonLat([m.lng, m.lat]);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    // Add a tiny buffer so markers aren't exactly on the edge
    const buffer = 50; // meters
    const extent: [number, number, number, number] = [
      minX - buffer,
      minY - buffer,
      maxX + buffer,
      maxY + buffer,
    ];

    // Fit the view to this extent
    view.fit(extent, {
      padding,
      duration,
      maxZoom: 16, // don't zoom in too much for tightly-clustered markers
    });
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

    const boundaryStyle = new Style({
      fill: new Fill({ color: "rgba(14, 116, 144, 0.12)" }),
      stroke: new Stroke({ color: "#0891b2", width: 2.5 }),
    });
    const tehsilSource = new VectorSource();
    const villageSource = new VectorSource();
    const tehsilLayer = new VectorLayer({
      source: tehsilSource,
      style: boundaryStyle,
      zIndex: 10,
      visible: false,
    });
    const villageLayer = new VectorLayer({
      source: villageSource,
      style: new Style({
        fill: new Fill({ color: "rgba(245, 158, 11, 0.18)" }),
        stroke: new Stroke({ color: "#d97706", width: 2.5 }),
      }),
      zIndex: 11,
      visible: true,
    });
    boundaryLayersRef.current = { tehsil: tehsilLayer, village: villageLayer };
    const geojson = new GeoJSON();
    Promise.all([
      fetch("/Subdistrict.geojson").then((response) => {
        if (!response.ok) throw new Error("Subdistrict boundaries unavailable");
        return response.json();
      }),
      fetch("/village.geojson").then((response) => {
        if (!response.ok) throw new Error("Village boundaries unavailable");
        return response.json();
      }),
    ])
      .then(([tehsils, villages]) => {
        tehsilSource.addFeatures(
          geojson.readFeatures(tehsils, { featureProjection: "EPSG:3857" }),
        );
        villageSource.addFeatures(
          geojson.readFeatures(villages, { featureProjection: "EPSG:3857" }),
        );
        boundaryFeaturesRef.current = {
          tehsil: tehsilSource.getFeatures(),
          village: villageSource.getFeatures(),
        };
        setBoundariesReady(true);
        map.render();
      })
      .catch((error) =>
        console.error("Could not load public boundary layers", error),
      );

    const overlay = new Overlay({
      element: popupRef.current,
      positioning: "bottom-center",
      offset: [0, -30],
      stopEvent: true,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer, tehsilLayer, villageLayer, markerLayer],
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
        const geometry = feature.getGeometry() as Point;
        const coordinates = geometry.getCoordinates();

        const anchorPx = map.getPixelFromCoordinate(coordinates);
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

        overlay.setPosition(coordinates);
        setSelectedMarker(markerData);
        setDetailMarker(null);
      } else {
        overlay.setPosition(undefined);
        setSelectedMarker(null);
      }
    };

    map.on("singleclick", handleMapClick);

    // const handlePointerMove = (evt: MapBrowserEvent) => {
    //     const hit = map.hasFeatureAtPixel(evt.pixel, {
    //         layerFilter: (layer) => layer === markerLayer,
    //         hitTolerance: 10,
    //     });
    //     map.getTargetElement().style.cursor = hit ? "pointer" : "";
    // };

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

  useEffect(() => {
    const layers = boundaryLayersRef.current;
    if (!layers) return;
    const normalize = (value: unknown) =>
      String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const tehsilName = normalize(selectedTehsil);
    const villageName = normalize(selectedVillage);
    const tehsilFeatures = boundaryFeaturesRef.current.tehsil;
    const villageFeatures = boundaryFeaturesRef.current.village;
    layers.tehsil.getSource()?.clear();
    layers.village.getSource()?.clear();
    if (selectedTehsil) {
      // Use the source feature collection held separately by the full data source below.
      const matches = tehsilFeatures.filter(
        (feature) =>
          normalize(feature.get("SUB_DIST") ?? feature.get("NAME")) ===
          tehsilName,
      );
      layers.tehsil.getSource()?.addFeatures(matches);
    }
    if (selectedVillage) {
      const inSelectedTehsil = (feature: Feature) =>
        !selectedTehsil || normalize(feature.get("SUB_DIST")) === tehsilName;
      const nameMatches = villageFeatures.filter(
        (feature) =>
          normalize(feature.get("NAME")) === villageName &&
          inSelectedTehsil(feature),
      );
      // Objection records and administrative boundary files can use different village spellings.
      // When names differ, locate the selected village polygon from its objection coordinates.
      const markerMatches = boundaryMarkers.filter(
        (marker) => normalize(marker.village) === villageName,
      );
      const spatialMatches = nameMatches.length
        ? []
        : villageFeatures.filter((feature) => {
            if (!inSelectedTehsil(feature)) return false;
            const geometry = feature.getGeometry();
            return Boolean(
              geometry &&
              markerMatches.some((marker) =>
                geometry.intersectsCoordinate(
                  fromLonLat([marker.lng, marker.lat]),
                ),
              ),
            );
          });
      layers.village
        .getSource()
        ?.addFeatures(nameMatches.length ? nameMatches : spatialMatches);
    }
    layers.tehsil.setVisible(Boolean(selectedTehsil) && tehsilLayerOn);
    layers.village.setVisible(Boolean(selectedVillage) && villageLayerOn);
  }, [
    selectedTehsil,
    selectedVillage,
    tehsilLayerOn,
    villageLayerOn,
    boundariesReady,
    boundaryMarkers,
  ]);

  // ---------------------------------------------------------------
  // EFFECT #2 — Rebuild markers when `markers` changes
  // ---------------------------------------------------------------
  // useEffect(() => {
  //   const source = markerSourceRef.current;
  //   if (!source) return;

  //   const features = markers.map((m) => {
  //     const feature = new Feature({
  //       geometry: new Point(fromLonLat([m.lng, m.lat])),
  //     });
  //     feature.set("markerData", m);
  //     feature.set("isMarker", true);

  //     feature.setStyle(
  //       new Style({
  //         image: new CircleStyle({
  //           radius: 8,
  //           fill: new Fill({ color: markerColors[m.category] || "#6b7280" }),
  //           stroke: new Stroke({ color: "#ffffff", width: 2 }),
  //         }),
  //       }),
  //     );
  //     return feature;
  //   });

  //   source.clear();
  //   source.addFeatures(features);

  //   // If the popup is open for a marker that no longer exists, close it
  //   if (selectedMarker && !markers.some((m) => m.id === selectedMarker.id)) {
  //     overlayRef.current?.setPosition(undefined);
  //     setSelectedMarker(null);
  //   }

  //   // If the detail panel is open for a filtered-out marker, close it too
  //   if (detailMarker && !markers.some((m) => m.id === detailMarker.id)) {
  //     setDetailMarker(null);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [markers]);

  // useEffect(() => {
  //   const source = markerSourceRef.current;

  //   if (!source) return;

  //   const features = markers.map((m) => {
  //     const feature = new Feature({
  //       geometry: new Point(fromLonLat([m.lng, m.lat])),
  //     });

  //     feature.set("markerData", m);
  //     feature.set("isMarker", true);

  //     const isMatched = highlightedIds.has(m.id);
  //     const svgUrl = MARKER_SVGS[m.category] || RoadPin;

  //     feature.setStyle(
  //       new Style({
  //         image: new Icon({
  //           src: svgUrl,
  //           anchor: [0.5, 1],
  //           anchorXUnits: "fraction",
  //           anchorYUnits: "fraction",
  //           scale: isMatched ? 1 : 0.4,
  //         }),
  //       }),
  //     );

  //     return feature;
  //   });

  //   source.clear();
  //   source.addFeatures(features);

  //   if (markers.length > 0) {
  //     fitMapToMarkers(markers, [80, 80, 80, 80], 800);
  //   }

  //   // If popup open for filtered-out marker, close it
  //   if (selectedMarker && !markers.some((m) => m.id === selectedMarker.id)) {
  //     overlayRef.current?.setPosition(undefined);
  //     setSelectedMarker(null);
  //   }

  //   if (detailMarker && !markers.some((m) => m.id === detailMarker.id)) {
  //     setDetailMarker(null);
  //   }
  // }, [markers, highlightedIds]);

  useEffect(() => {
    const source = markerSourceRef.current;

    if (!source) return;

    const features = markers.map((m) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([m.lng, m.lat])),
      });

      feature.set("markerData", m);
      feature.set("isMarker", true);

      const isHighlighted = highlightedIds.has(m.id);

      const isSearchMatch =
        debouncedSearch.trim() !== "" &&
        searchResults.some((item) => item.id === m.id);

      const isHovered = hoveredMarkerId === m.id;

      const svgUrl = MARKER_SVGS[m.category] || RoadPin;

      feature.setStyle(
        new Style({
          image: new Icon({
            src: svgUrl,
            anchor: [0.5, 1],
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",

            scale: isHovered
              ? 1
              : isSearchMatch
                ? 0.7
                : isHighlighted
                  ? 0.6
                  : 0.4,
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
    });

    source.clear();
    source.addFeatures(features);

    if (markers.length > 0) {
      fitMapToMarkers(markers, [80, 80, 80, 80], 800);
    }

    if (selectedMarker && !markers.some((m) => m.id === selectedMarker.id)) {
      overlayRef.current?.setPosition(undefined);
      setSelectedMarker(null);
    }

    if (detailMarker && !markers.some((m) => m.id === detailMarker.id)) {
      setDetailMarker(null);
    }
  }, [markers, highlightedIds, debouncedSearch, searchResults]);

  /* ============ Control Handlers ============ */
  const handleZoomIn = () => {
    const view = mapInstanceRef.current?.getView();
    if (view)
      view.animate({
        zoom: (view.getZoom() || 11) + 1,
        duration: 250,
      });
  };

  const handleZoomOut = () => {
    const view = mapInstanceRef.current?.getView();
    if (view)
      view.animate({
        zoom: (view.getZoom() || 11) - 1,
        duration: 250,
      });
  };

  const handleRecenter = () => {
    const view = mapInstanceRef.current?.getView();
    if (view) {
      view.animate({
        center: fromLonLat(BHOPAL_CENTER),
        zoom: 11,
        duration: 600,
      });
    }
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

  /* ============ EXPORT MAP + LEGEND TO A4 PDF (WYSIWYG) ============ */
  const handleExport = async () => {
    const mapEl = mapRef.current?.parentElement; // capture the outer wrapper, not just the OL canvas
    if (!mapEl) return;

    try {
      // 1. Capture the whole map area — includes OL canvas, popups, controls,
      //    legend, search bar, scale line, everything as the user sees it.
      const canvas = await html2canvas(mapEl, {
        useCORS: true, // OSM tiles are CORS-enabled
        allowTaint: false,
        backgroundColor: "#e5e3df",
        scale: 2, // 2x for print-quality resolution
        logging: false,
        // Ensure absolutely-positioned overlays (legend, controls) are included
        scrollX: 0,
        scrollY: 0,
        windowWidth: mapEl.scrollWidth,
        windowHeight: mapEl.scrollHeight,
      });

      // 2. A4 PDF setup
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = 210;
      const pageH = 297;
      const margin = 10;
      const headerH = 18;

      // ---- Header ----
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 39, 68);
      pdf.text("Bhopal Development Plan - 2047 (Draft)", margin, margin + 6);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Objections & Suggestions  •  Exported on ${new Date().toLocaleDateString("en-IN")}`,
        margin,
        margin + 12,
      );

      // Horizontal rule
      pdf.setDrawColor(226, 232, 240);
      pdf.line(
        margin,
        margin + headerH - 2,
        pageW - margin,
        margin + headerH - 2,
      );

      // ---- Fit the image into the available A4 area ----
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2 - headerH - 8; // 8mm for footer

      const imgAspect = canvas.width / canvas.height;
      let imgW = contentW;
      let imgH = imgW / imgAspect;

      if (imgH > contentH) {
        imgH = contentH;
        imgW = imgH * imgAspect;
      }

      // Center the image horizontally within the content area
      const xOffset = margin + (contentW - imgW) / 2;

      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      pdf.addImage(imgData, "JPEG", xOffset, margin + headerH, imgW, imgH);

      // ---- Footer ----
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        "© Bhopal Municipal Corporation — Generated from BDP Portal",
        margin,
        pageH - 6,
      );
      pdf.text("Page 1 of 1", pageW - margin, pageH - 6, { align: "right" });

      // 3. Save
      const fileName = `bhopal-masterplan-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("[handleExport] Failed to export PDF:", err);
      alert("Export failed. Please try again.");
    }
  };

  return (
    <div className="flex-1 relative bg-[#e5e3df]">
      {/* Map */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" >

      {/* ============================================================
        SEARCH BAR — responsive width
        ============================================================ */}
      <div className="search-container absolute top-4 left-4 right-4 md:right-auto md:w-[310px] z-20">
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

              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                placeholder="Search by name, khasra, objection, suggestion, group..."
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
                onBlur={() => {
                  setTimeout(() => setSearchFocused(false), 150);
                }}
                onKeyDown={handleSearchKeyDown}
                className="flex-1 min-w-0 bg-transparent border-none outline-none"
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#0f172a",
                  caretColor: "#0f2c4a",
                  padding: 0,
                  margin: 0,
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
                  <Close sx={{ fontSize: 16 }} />
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
                              backgroundColor: `${markerColors[m.category]}20`,
                              color: markerColors[m.category] || "#6b7280",
                            }}
                          >
                            {getCategoryIcon(m.category, 14)}
                          </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] font-semibold text-slate-700">
                              {highlightFullText(
                                m.objectionId,
                                debouncedSearch,
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              · {m.category}
                            </span>
                          </div>
                          <div className="text-[13px] font-medium text-slate-800 leading-snug line-clamp-1 mb-1">
                            {highlightFullText(m.title, debouncedSearch)}
                          </div>
                          <div className="text-[11px] text-slate-500 leading-snug line-clamp-1 mb-1">
                            {highlightFullText(
                              m.description,
                              debouncedSearch,
                              
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10.5px] text-slate-500">
                            <LocationOn sx={{ fontSize: 11 }} />
                            <span className="truncate">
                              Khasra {m.khasraNo}, {m.village} ({m.tehsil})
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

      {/* ============================================================
        POPUP — z-50 so it's above legend
        ============================================================ */}
      <div
        ref={popupRef}
        className={`w-72 bg-white rounded-xl shadow-[0_8px_28px_rgba(15,23,42,0.16)] border border-slate-200 transition-opacity duration-150 overflow-visible z-40 ${
          selectedMarker
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {selectedMarker && (
          <>
            {/* HEADER */}
            <div
              className="relative flex justify-between items-center px-3.5 py-2.5 rounded-t-xl"
              style={{
                background: `linear-gradient(135deg, ${
                  markerColors[selectedMarker.category]
                }14 0%, ${markerColors[selectedMarker.category]}06 100%)`,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{
                    backgroundColor:
                      markerColors[selectedMarker.category] || "#6b7280",
                    color: "#ffffff",
                  }}
                >
                  {getCategoryIcon(selectedMarker.category, 17)}
                </div>
                <div className="min-w-0">
                  
                  <div className="text-[14px] font-bold text-slate-800 truncate leading-tight">
                    {selectedMarker.category}
                  </div>
                </div>
                <button
                  onClick={closePopup}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <Close sx={{ fontSize: 15 }} />
                </button>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <LocationOn
                  sx={{ fontSize: 14, color: "#94a3b8", marginTop: "2px" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                    Location
                  </div>
                  <div className="text-[12px] text-slate-800 font-medium leading-snug">
                    Khasra {selectedMarker.khasraNo}, {selectedMarker.village}
                  </div>

                  // Close button 
                  <button
                    onClick={closePopup}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors flex-shrink-0"
                    aria-label="Close"
                  >
                    <Close sx={{ fontSize: 15 }} />
                  </button>
                </div> */}

                {/* ================= BODY ================= */}
                <div className="px-3.5 py-2.5 space-y-2.5">
                  {/* Objection ID — highlighted pill */}
                  <div className="flex items-center justify-between gap-2">
                    {/* <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                    Objection ID
                  </span> */}
                    <span className="text-[12px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                      {selectedMarker.objectionId}
                    </span>
                  </div>

              <div className="flex items-start gap-2 pt-2">
                <CalendarToday
                  sx={{ fontSize: 13, color: "#94a3b8", marginTop: "2px" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                    Date
                  </div>

                  {/* Date */}
                  <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                    <CalendarToday
                      sx={{ fontSize: 13, color: "#94a3b8", marginTop: "2px" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                        Date
                      </div>
                      <div className="text-[12px] text-slate-800 font-medium">
                        {selectedMarker.date}
                      </div>
                    </div>
                  </div>
                </div>

        {/* ARROW */}
        {popupPlacement === "above" ? (
          <div
            className="absolute left-1/2 -bottom-[8px] -translate-x-1/2 w-0 h-0
            border-l-[8px] border-r-[8px] border-t-[8px]
            border-l-transparent border-r-transparent border-t-white"
            style={{
              filter: "drop-shadow(0 2px 2px rgba(15,23,42,0.06))",
            }}
          />
        ) : (
          <div
            className="absolute left-1/2 -top-[8px] -translate-x-1/2 w-0 h-0
            border-l-[8px] border-r-[8px] border-b-[8px]
            border-l-transparent border-r-transparent border-b-white"
            style={{
              filter: "drop-shadow(0 -2px 2px rgba(15,23,42,0.06))",
            }}
          />
        )}
      </div>

      {/* ============================================================
        DETAIL PANEL — responsive width, z-40
        ============================================================ */}
      <div
        className={`absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-40 
        w-[calc(100vw-24px)] sm:w-[380px] lg:w-[420px] 
        max-h-[calc(100%-100px)]
        bg-white rounded-xl shadow-2xl border border-slate-200
        flex flex-col overflow-hidden
        transition-all duration-300 ease-in-out
        ${
          detailMarker
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {detailMarker && (
          <>
            <div
              className="absolute left-1/2 -bottom-[8px] -translate-x-1/2 w-0 h-0
        border-l-[8px] border-r-[8px] border-t-[8px]
        border-l-transparent border-r-transparent border-t-white"
              style={{
                filter: "drop-shadow(0 2px 2px rgba(15,23,42,0.06))",
              }}
            />
          ) : (
            <div
              className="absolute left-1/2 -top-[8px] -translate-x-1/2 w-0 h-0
          border-l-[8px] border-r-[8px] border-b-[8px]
          border-l-transparent border-r-transparent border-b-white"
              style={{
                filter: "drop-shadow(0 -2px 2px rgba(15,23,42,0.06))",
              }}
            />
             )}
        </div>
  

        {/* DETAIL PANEL — bottom-right*/}
       <div
          className={`absolute bottom-4 right-4 z-30 w-[420px] max-h-[calc(100%-100px)]
            bg-white rounded-xl shadow-2xl border border-slate-200
            flex flex-col overflow-hidden
            transition-all duration-300 ease-in-out
            ${
              detailMarker
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
        >
          {detailMarker && (
            <>
             <div
              className="relative flex justify-between items-center px-4 py-2.5 border-b border-slate-100"
              style={{
                background: `linear-gradient(135deg, ${
                  markerColors[detailMarker.category]
                }12 0%, ${markerColors[detailMarker.category]}05 100%)`,
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor:
                      markerColors[detailMarker.category] || "#6b7280",
                    color: "#ffffff",
                  }}
                >
                  {getCategoryIcon(detailMarker.category, 18)}
                </div>
                {/* <IconButton size="small" onClick={closeDetail} title="Close">
                  <Close fontSize="small" />
                </IconButton> */}
          

              <button
                onClick={closeDetail}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <Close sx={{ fontSize: 16 }} />
              </button>
            </div>
            

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md truncate">
                  {detailMarker.objectionId}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border flex-shrink-0 ${
                    detailMarker.status === "Open"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : detailMarker.status === "In Progress"
                        ? "bg-brandBlue-50 text-brandBlue-700 border-brandBlue-200"
                        : detailMarker.status === "Resolved"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {detailMarker.status}
                </span>
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <LocationOn
                  sx={{ fontSize: 15, color: "#94a3b8", marginTop: "2px" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                    Location
                  </div>
                  <div className="text-[12px] text-slate-800 font-medium leading-snug">
                    Khasra {detailMarker.khasraNo}, {detailMarker.village}
                  </div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">
                    {detailMarker.tehsil} Tehsil
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <CalendarToday
                  sx={{ fontSize: 13, color: "#94a3b8", marginTop: "3px" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                    Date
                  </div>
                  <div className="text-[12px] text-slate-800 font-medium">
                    {detailMarker.date}
                  </div>
                </div>
              </div>

              {(detailMarker.applicantName || detailMarker.mobile) && (
                <div className="flex items-start gap-4 pt-2">
                  {detailMarker.applicantName && (
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                        Applicant
                      </div>
                      <div className="text-[12px] text-slate-800 font-medium truncate">
                        {detailMarker.applicantName}
                      </div>
                    </div>
                  )}
                  {detailMarker.mobile && (
                    <div className="flex-shrink-0">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                        Mobile
                      </div>
                      <div className="text-[12px] text-slate-800 font-medium">
                        {detailMarker.mobile}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">
                  Description
                </div>
                <div className="text-[12px] text-slate-700 leading-relaxed">
                  <DescriptionRenderer
                    description={detailMarker.description}
                    selectedSearchText={searchQuery.trim() || selectedSearchText}
                  />
                </div>
              </div>
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
        )}
      </div>

      {/* ============================================================
        MAP CONTROLS — responsive positioning
        ============================================================ */}
      <div className="absolute right-3 sm:right-4 top-3 sm:top-4 flex flex-col gap-2 z-30">
        <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.10)] border border-slate-200 overflow-hidden flex flex-col">
          <IconButton
            onClick={handleRecenter}
            title="Recenter"
            sx={{
              width: 38,
              height: 38,
              borderRadius: 0,
              color: "#334155",
              transition: "all 0.15s ease",
              "&:hover": { backgroundColor: "#f8fafc", color: "#0f2c4a" },
            }}
          >
            <Add sx={{ fontSize: 18 }} />
          </IconButton>

          {/* Fullscreen */}
          {/* <IconButton
              onClick={handleToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              sx={{
                width: 42,
                height: 42,
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
                color: "#334155",
                transition: "all 0.15s ease",
                "&:hover": {
                  backgroundColor: "#f8fafc",
                  borderColor: "#cbd5e1",
                  color: "#0f2c4a",
                  transform: "translateY(-1px)",
                  boxShadow: "0 6px 20px rgba(15,23,42,0.14)",
                },
              }}
            >
              {isFullscreen ? (
                <FullscreenExit sx={{ fontSize: 20 }} />
              ) : (
                <Fullscreen sx={{ fontSize: 20 }} />
              )}
            </IconButton> */}
        </div>

        {/* Export Button */}
        <div className="absolute right-[18px] top-[155px] z-10">
          <IconButton
            onClick={handleExport}
            title="Export as PDF"
            sx={{
              width: 38,
              height: 38,
              borderRadius: 0,
              color: "#334155",
              transition: "all 0.15s ease",
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
            transition: "all 0.15s ease",
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

      {/* ============================================================
        LEGEND — bottom-right, lower z-index so popup can overlay
        ============================================================ */}
      <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.08)]  w-44 sm:w-52 border border-slate-200 overflow-hidden">
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

      {/* ScaleLine */}
      <div
        id="scale-line-container"
        className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-20 bg-white/90 border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-sm"
      />
    </div>
  );
};

export default MapView;
