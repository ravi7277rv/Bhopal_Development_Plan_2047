import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    Search,
    Close,
    Add,
    Remove,
    MyLocation,
    LocationOn,
} from "@mui/icons-material";
import { IconButton, Button } from "@mui/material";

import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import ScaleLine from 'ol/control/ScaleLine';

import { BHOPAL_CENTER } from '../../data/mockdata';
import type { MapMarker } from '../../types/index.type';
import { DescriptionRenderer } from "../common/DescriptionsReader";

const markerColors: Record<string, string> = {
    'Road': '#ef4444',
    'Residential': '#f59e0b',
    'Landuse': '#3b82f6',
    'Green Zone': '#22c55e',
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

    // ---------------------------------------------------------------
    // EFFECT #1 — Initialize map (mount only)
    // ---------------------------------------------------------------
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
            offset: [0, -18],
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
                hitTolerance: 6,
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
                    overlay.setOffset([0, 18]);
                } else {
                    overlay.setPositioning("bottom-center");
                    overlay.setOffset([0, -18]);
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
                hitTolerance: 6,
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

    // ---------------------------------------------------------------
    // EFFECT #2 — Rebuild markers when `markers` changes
    // ---------------------------------------------------------------
    useEffect(() => {
        const source = markerSourceRef.current;
        if (!source) return;

        const features = markers.map((m) => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([m.lng, m.lat])),
            });
            feature.set("markerData", m);
            feature.set("isMarker", true);

            feature.setStyle(
                new Style({
                    image: new CircleStyle({
                        radius: 8,
                        fill: new Fill({ color: markerColors[m.category] || "#6b7280" }),
                        stroke: new Stroke({ color: "#ffffff", width: 2 }),
                    }),
                }),
            );
            return feature;
        });

        source.clear();
        source.addFeatures(features);

        // If the popup is open for a marker that no longer exists, close it
        if (selectedMarker && !markers.some((m) => m.id === selectedMarker.id)) {
            overlayRef.current?.setPosition(undefined);
            setSelectedMarker(null);
        }

        // If the detail panel is open for a filtered-out marker, close it too
        if (detailMarker && !markers.some((m) => m.id === detailMarker.id)) {
            setDetailMarker(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markers]);

    // ---------------------------------------------------------------
    // Control handlers
    // ---------------------------------------------------------------
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

    // ✅ Open detail panel from "Read more..." button
    const openDetail = () => {
        if (selectedMarker) {
            setDetailMarker(selectedMarker);
        }
    };

    const closeDetail = () => setDetailMarker(null);

    return (
        <div className="flex-1 relative bg-[#e5e3df]">
            {/* Map */}
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />

            {/* ============================================================
        ✅ GLOBAL SEARCH BAR — top-left, over the map
        ============================================================ */}
            <div className="search-container absolute top-4 left-4 right-4 md:right-auto md:w-[420px] z-20">
                <div className="relative">
                    {/* Search input wrapper */}
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
                        {/* Search icon */}
                        <div className="pl-3.5 pr-2 flex items-center justify-center text-slate-400 flex-shrink-0">
                            <Search sx={{ fontSize: 20 }} />
                        </div>

                        {/* Input */}
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

                        {/* Clear button */}
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

                    {/* Search results dropdown */}
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
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            markerColors[m.category] || "#6b7280",
                                                    }}
                                                />

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
        ✅ POPUP — OpenLayers Overlay, content from React state
        ============================================================ */}
            <div
                ref={popupRef}
                className={`w-80 bg-white rounded-lg shadow-xl border border-gray-200 transition-opacity duration-150 ${selectedMarker
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                    }`}
            >
                {selectedMarker && (
                    <>
                        {/* Popup header */}
                        <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{
                                        backgroundColor: markerColors[selectedMarker.category],
                                    }}
                                />
                                <span className="font-bold text-sm text-gray-800">
                                    {selectedMarker.objectionId}
                                </span>
                            </div>
                            <Close
                                className="text-gray-400 cursor-pointer text-sm hover:text-gray-700"
                                onClick={closePopup}
                            />
                        </div>

                        <div className="p-4 text-sm space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-gray-500 col-span-1">Group</span>
                                <span className="col-span-2 flex items-center gap-2 text-gray-800">
                                    {selectedMarker.category}
                                </span>

                                <span className="text-gray-500 col-span-1">Tehsil</span>
                                <span className="col-span-2 text-gray-800">
                                    {selectedMarker.tehsil}
                                </span>

                                <span className="text-gray-500 col-span-1">Village</span>
                                <span className="col-span-2 text-gray-800">
                                    {selectedMarker.village}
                                </span>

                                <span className="text-gray-500 col-span-1">Khasra no.</span>
                                <span className="col-span-2 text-gray-800 break-words">
                                    {selectedMarker.khasraNo}
                                </span>

                                <span className="text-gray-500 col-span-1">Description</span>
                                <span className="col-span-2 text-gray-800 line-clamp-2 break-words">
                                    {selectedMarker.description}
                                </span>

                                <span className="text-gray-500 col-span-1">Date</span>
                                <span className="col-span-2 text-gray-800">
                                    {selectedMarker.date}
                                </span>
                            </div>
                        </div>

                        <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-lg flex justify-end">
                            <Button
                                variant="contained"
                                size="small"
                                className="bg-blue-600 hover:bg-blue-700 capitalize"
                                onClick={openDetail}
                            >
                                Read more...
                            </Button>
                        </div>
                    </>
                )}

                {popupPlacement === 'above' ? (
                    <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0
            border-l-8 border-r-8 border-t-8
            border-l-transparent border-r-transparent border-t-white drop-shadow-md" />
                ) : (
                    <div className="absolute left-1/2 -top-2 -translate-x-1/2 w-0 h-0
            border-l-8 border-r-8 border-b-8
            border-l-transparent border-r-transparent border-b-white drop-shadow-md" />
                )}
            </div>

            {/* ======================================================
        ✅ Detail panel — absolute bottom-right, no Drawer
        (now a sibling of the popup, NOT nested inside it)
      ====================================================== */}
            <div
                className={`absolute bottom-4 right-4 z-30 w-[420px] max-h-[calc(100%-100px)]
          bg-white rounded-lg shadow-2xl border border-gray-200
          flex flex-col overflow-hidden
          transition-all duration-300 ease-in-out
          ${detailMarker
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
            >
                {detailMarker && (
                    <>
                        {/* Panel header */}
                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: markerColors[detailMarker.category] }}
                                />
                                <h3 className="font-bold text-base text-gray-800">
                                    {detailMarker.objectionId}
                                </h3>
                            </div>
                            <IconButton size="small" onClick={closeDetail} title="Close">
                                <Close fontSize="small" />
                            </IconButton>
                        </div>

                        {/* Panel body — scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 text-sm space-y-4">
                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Group</span>
                                <span className="text-gray-800 font-medium">
                                    {detailMarker.category}
                                </span>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Tehsil</span>
                                <span className="text-gray-800 font-medium">
                                    {detailMarker.tehsil}
                                </span>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Village</span>
                                <span className="text-gray-800 font-medium">
                                    {detailMarker.village}
                                </span>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Khasra No.</span>
                                <span className="text-gray-800 font-medium break-words">
                                    {detailMarker.khasraNo}
                                </span>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Status</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    {detailMarker.status}
                                </span>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Date</span>
                                <span className="text-gray-800 font-medium">
                                    {detailMarker.date}
                                </span>
                            </div>

                            {detailMarker.applicantName && (
                                <div className="flex items-start gap-3">
                                    <span className="text-gray-500 w-24 shrink-0">Applicant</span>
                                    <span className="text-gray-800 font-medium">
                                        {detailMarker.applicantName}
                                    </span>
                                </div>
                            )}

                            {detailMarker.mobile && (
                                <div className="flex items-start gap-3">
                                    <span className="text-gray-500 w-24 shrink-0">Mobile</span>
                                    <span className="text-gray-800 font-medium">
                                        {detailMarker.mobile}
                                    </span>
                                </div>
                            )}

                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-gray-500 mb-3">Description</p>
                                <DescriptionRenderer description={detailMarker.description} />
                            </div>

                            {/* Document link (if available) */}
                            {/* {detailMarker.documentLink && (
                <div className="pt-2 border-t border-gray-100">
                  <a
                    href={detailMarker.documentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm font-medium"
                    aria-disabled
                  >
                    View attached document →
                  </a>
                </div>
              )} */}
                        </div>

                        {/* Panel footer */}
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <Button
                                variant="outlined"
                                size="small"
                                className="!capitalize"
                                onClick={closeDetail}
                            >
                                Close
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Map Controls */}
            <div className="absolute right-4 top-[100px] transform -translate-y-1/2 flex flex-col gap-2 z-10">
                <div className="bg-white rounded shadow-md flex flex-col">
                    <IconButton size="small" className="rounded-none border-b border-gray-200" onClick={handleZoomIn}>
                        <Add />
                    </IconButton>
                    <IconButton size="small" className="rounded-none" onClick={handleZoomOut}>
                        <Remove />
                    </IconButton>
                </div>
                <IconButton className="bg-white shadow-md rounded" onClick={handleRecenter} title="Recenter">
                    <MyLocation />
                </IconButton>
            </div>

            {/* Export Button */}
            <div className="absolute bottom-44 right-4 bg-white p-2 rounded-lg shadow-md z-10 w-48 border border-gray-200 text-center">
                    <button className="bg-blue-400 text-white text-center font-bold w-[98%] m-auto rounded-lg">Export </button>
            </div>
            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-md z-10 w-48 border border-gray-200">
                <h4 className="font-bold text-sm mb-3 text-gray-800">Legend</h4>
                <div className="space-y-2 text-xs text-gray-600">
                    {Object.entries(markerColors).map(([key, hex]) => (
                        <div key={key} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: hex }} />
                            <span>{key}</span>
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