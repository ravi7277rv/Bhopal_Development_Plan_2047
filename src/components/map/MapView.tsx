import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Search,
  Close,
  Add,
  Remove,
  MyLocation,
  LocationOn,
  CalendarToday,
  Fullscreen,
  FullscreenExit,
  AltRoute,
  Home,
  Map as MapIcon,
  Park,
} from "@mui/icons-material";
import { IconButton, Button } from "@mui/material";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import Overlay from "ol/Overlay";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Style, Icon } from "ol/style";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import ScaleLine from "ol/control/ScaleLine";

import { BHOPAL_CENTER } from "../../data/mockdata";
import type { MapMarker } from "../../types/index.type";
import HomePin from "../../assets/mapLocation/Home.svg";
import LandusePin from "../../assets/mapLocation/Landuse.svg";
import ParkPin from "../../assets/mapLocation/Park.svg";
import RoadPin from "../../assets/mapLocation/Road.svg";

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

interface MapViewProps {
    markers: MapMarker[];
}

const MapView: React.FC<MapViewProps> = ({ markers }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<Map | null>(null);
    const overlayRef = useRef<Overlay | null>(null);
    const markerSourceRef = useRef<VectorSource | null>(null);
    const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

    // ✅ Popup state
    const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
    const [popupPlacement, setPopupPlacement] = useState<"above" | "below">("above");
    const [detailMarker, setDetailMarker] = useState<MapMarker | null>(null);

    // ============ SEARCH STATE ============
    const [searchValue, setSearchValue] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchHighlight, setSearchHighlight] = useState(-1);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ✅ Debounce — 150ms
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchValue), 150);
        return () => clearTimeout(t);
    }, [searchValue]);

    // ✅ Search results — multi-field
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
    const handleResultClick = (m: MapMarker) => {
        const map = mapInstanceRef.current;
        const overlay = overlayRef.current;
        if (!map || !overlay) return;

        const coords = fromLonLat([m.lng, m.lat]);

        map.getView().animate({
            center: coords,
            zoom: Math.max(map.getView().getZoom() || 13, 16),
            duration: 600,
        });

        setTimeout(() => {
            const anchorPx = map.getPixelFromCoordinate(coords);
            const mapSize = map.getSize();
            const POPUP_SAFE_ZONE = 340;
            const placeBelow = mapSize !== undefined && anchorPx[1] < POPUP_SAFE_ZONE;

            if (placeBelow) {
                overlay.setPositioning("top-center");
                overlay.setOffset([0, 18]);
                setPopupPlacement("below");
            } else {
                overlay.setPositioning("bottom-center");
                overlay.setOffset([0, -18]);
                setPopupPlacement("above");
            }

            overlay.setPosition(coords);
            setSelectedMarker(m);
        }, 620);

        setSearchValue("");
        setSearchOpen(false);
        setSearchHighlight(-1);
    };

    // ✅ Keyboard nav
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSearchOpen(true);
            setSearchHighlight((i) => Math.min(i + 1, searchResults.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSearchHighlight((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (searchHighlight >= 0 && searchResults[searchHighlight]) {
                handleResultClick(searchResults[searchHighlight]);
            } else if (searchResults[0]) {
                handleResultClick(searchResults[0]);
            }
        } else if (e.key === "Escape") {
            setSearchOpen(false);
            setSearchHighlight(-1);
        }
    };

    // ✅ Outside click close
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const container = document.querySelector(".search-container");
            if (container && !container.contains(e.target as Node)) {
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

    // ✅ Fit the view to this extent
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

    const overlay = new Overlay({
      element: popupRef.current,
      positioning: "bottom-center",
      offset: [0, -30],
      stopEvent: true,
    });

        const map = new Map({
            target: mapRef.current,
            layers: [baseLayer, markerLayer],
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
            } else {
                overlay.setPosition(undefined);
                setSelectedMarker(null);
            }
        };

        map.on("singleclick", handleMapClick);

    const handlePointerMove = (evt: MapBrowserEvent) => {
      const hit = map.hasFeatureAtPixel(evt.pixel, {
        layerFilter: (layer) => layer === markerLayer,
        hitTolerance: 10,
      });
      map.getTargetElement().style.cursor = hit ? "pointer" : "";
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

  /* ============ EFFECT #2 — Rebuild markers with custom icons ============ */
  useEffect(() => {
    const source = markerSourceRef.current;
    if (!source) return;

    const features = markers.map((m) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([m.lng, m.lat])),
      });
      feature.set("markerData", m);
      feature.set("isMarker", true);

      const svgUrl = MARKER_SVGS[m.category] || RoadPin;

      feature.setStyle(
        new Style({
          image: new Icon({
            src: svgUrl,
            anchor: [0.5, 1], // pin tip at bottom
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",
            scale: 0.4, // adjust if too big/small
          }),
        }),
      );
      return feature;
    });

        source.clear();
        source.addFeatures(features);

    if (markers.length > 0) {
      fitMapToMarkers(markers, [80, 80, 80, 80], 800);
    }

    // If popup open for filtered-out marker, close it
    if (selectedMarker && !markers.some((m) => m.id === selectedMarker.id)) {
      overlayRef.current?.setPosition(undefined);
      setSelectedMarker(null);
    }

    if (detailMarker && !markers.some((m) => m.id === detailMarker.id)) {
      setDetailMarker(null);
    }
  }, [markers]);

  /* ============ Control Handlers ============ */
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
    if (selectedMarker) setDetailMarker(selectedMarker);
  };

    const closeDetail = () => setDetailMarker(null);

    return (
        <div className="flex-1 relative bg-[#e5e3df]">
            {/* Map */}
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* ============================================================
          SEARCH BAR — top-left
          ============================================================ */}
      <div className="search-container absolute top-4 left-4 right-4 md:right-auto md:w-[420px] z-20">
        <div className="relative">
          <div
            className="flex items-center bg-white rounded-xl border transition-all duration-150"
            style={{
              height: 46,
              borderColor: searchFocused ? "#fbbf24" : "#e2e8f0",
              boxShadow: searchFocused
                ? "0 6px 24px rgba(251,191,36,0.18)"
                : "0 2px 12px rgba(15,23,42,0.08)",
            }}
          >
            <div className="pl-3.5 pr-2 flex items-center justify-center text-slate-400 flex-shrink-0">
              <Search sx={{ fontSize: 20 }} />
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
                              {m.objectionId}
                            </span>
                            <span className="text-[10.5px] text-slate-400 truncate">
                              · {m.category}
                            </span>
                          </div>
                          <div className="text-[13px] font-medium text-slate-800 leading-snug line-clamp-1 mb-1">
                            {m.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <LocationOn sx={{ fontSize: 12 }} />
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
          POPUP — attractive with icon badge
          ============================================================ */}
      <div
        ref={popupRef}
        className={`w-72 bg-white rounded-xl shadow-[0_8px_28px_rgba(15,23,42,0.16)] border border-slate-200 transition-opacity duration-150 overflow-visible ${
          selectedMarker
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {selectedMarker && (
          <>
            {/* ================= HEADER — Category ================= */}
            <div
              className="relative flex justify-between items-center px-3.5 py-2.5 rounded-t-xl"
              style={{
                background: `linear-gradient(135deg, ${
                  markerColors[selectedMarker.category]
                }14 0%, ${markerColors[selectedMarker.category]}06 100%)`,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Icon badge */}
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

                {/* Category — primary */}
                <div className="text-[14px] font-bold text-slate-800 truncate leading-tight">
                  {selectedMarker.category}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={closePopup}
                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <Close sx={{ fontSize: 15 }} />
              </button>
            </div>

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

              {/* Location */}
              <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
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
                  <div className="text-[10.5px] text-slate-500 mt-0.5">
                    {selectedMarker.tehsil} Tehsil
                  </div>
                </div>
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

            {/* ================= FOOTER ================= */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 rounded-b-xl flex justify-end">
              <Button
                variant="contained"
                size="small"
                onClick={openDetail}
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
                Read more
              </Button>
            </div>
          </>
        )}

        {/* ================= ARROW ================= */}
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
          DETAIL PANEL — bottom-right
          ============================================================ */}
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
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
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
                <div>
                  <h3 className="font-bold text-[14px] text-slate-800">
                    {detailMarker.objectionId}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {detailMarker.category}
                  </p>
                </div>
              </div>
              <IconButton size="small" onClick={closeDetail} title="Close">
                <Close fontSize="small" />
              </IconButton>
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-[13px] space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-slate-500 w-24 shrink-0 font-medium">
                  Tehsil
                </span>
                <span className="text-slate-800 font-medium">
                  {detailMarker.tehsil}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-500 w-24 shrink-0 font-medium">
                  Village
                </span>
                <span className="text-slate-800 font-medium">
                  {detailMarker.village}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-500 w-24 shrink-0 font-medium">
                  Khasra No.
                </span>
                <span className="text-slate-800 font-medium break-words">
                  {detailMarker.khasraNo}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-500 w-24 shrink-0 font-medium">
                  Status
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {detailMarker.status}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-500 w-24 shrink-0 font-medium">
                  Date
                </span>
                <span className="text-slate-800 font-medium">
                  {detailMarker.date}
                </span>
              </div>
              {detailMarker.applicantName && (
                <div className="flex items-start gap-3">
                  <span className="text-slate-500 w-24 shrink-0 font-medium">
                    Applicant
                  </span>
                  <span className="text-slate-800 font-medium">
                    {detailMarker.applicantName}
                  </span>
                </div>
              )}
              {detailMarker.mobile && (
                <div className="flex items-start gap-3">
                  <span className="text-slate-500 w-24 shrink-0 font-medium">
                    Mobile
                  </span>
                  <span className="text-slate-800 font-medium">
                    {detailMarker.mobile}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-slate-500 mb-2 font-medium">Description</p>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                  {detailMarker.description}
                </p>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button
                variant="outlined"
                size="small"
                onClick={closeDetail}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  borderColor: "#cbd5e1",
                  color: "#475569",
                  "&:hover": {
                    borderColor: "#94a3b8",
                    backgroundColor: "#f8fafc",
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
          MAP CONTROLS — right side, vertically centered
          ============================================================ */}
      <div className="absolute right-4 top-2 flex flex-col gap-2.5 z-10">
        {/* Zoom In / Zoom Out */}
        <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.10)] border border-slate-200 overflow-hidden flex flex-col">
          <IconButton
            size="small"
            onClick={handleZoomIn}
            title="Zoom In"
            sx={{
              width: 42,
              height: 42,
              borderRadius: 0,
              color: "#334155",
              borderBottom: "1px solid #f1f5f9",
              transition: "all 0.15s ease",
              "&:hover": { backgroundColor: "#f8fafc", color: "#0f2c4a" },
            }}
          >
            <Add sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleZoomOut}
            title="Zoom Out"
            sx={{
              width: 42,
              height: 42,
              borderRadius: 0,
              color: "#334155",
              transition: "all 0.15s ease",
              "&:hover": { backgroundColor: "#f8fafc", color: "#0f2c4a" },
            }}
          >
            <Remove sx={{ fontSize: 20 }} />
          </IconButton>
        </div>

        {/* Recenter */}
        <IconButton
          onClick={handleRecenter}
          title="Recenter"
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
          <MyLocation sx={{ fontSize: 20 }} />
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

      {/* ============================================================
          LEGEND — bottom-right
          ============================================================ */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] z-10 w-52 border border-slate-200 overflow-hidden">
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
          <h4 className="font-bold text-[12.5px] text-slate-800 tracking-tight">
            Objection Categories
          </h4>
        </div>
        <div className="px-3.5 py-2.5 space-y-1.5">
          {Object.entries(markerColors).map(([key, hex]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${hex}20`, color: hex }}
              >
                {getCategoryIcon(key, 12)}
              </div>
              <span className="text-[11.5px] text-slate-600 font-medium">
                {key}
              </span>
            </div>
          ))}
        </div>
      </div>

            {/* ScaleLine */}
            <div
                id="scale-line-container"
                className="absolute bottom-4 left-4 z-10 bg-white/90 border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-sm"
            />
        </div>
    );
};

export default MapView;
