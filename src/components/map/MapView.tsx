// import React, { useEffect, useRef, useState } from 'react';
// import { Search, Close, Add, Remove, MyLocation } from '@mui/icons-material';
// import { TextField, InputAdornment, IconButton, Button } from '@mui/material';

// import 'ol/ol.css';
// import Map from 'ol/Map';
// import View from 'ol/View';
// import Overlay from 'ol/Overlay';
// import TileLayer from 'ol/layer/Tile';
// import VectorLayer from 'ol/layer/Vector';
// import VectorSource from 'ol/source/Vector';
// import OSM from 'ol/source/OSM';
// import Feature from 'ol/Feature';
// import Polygon from 'ol/geom/Polygon';
// import Point from 'ol/geom/Point';
// import { fromLonLat } from 'ol/proj';
// import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
// import type MapBrowserEvent from 'ol/MapBrowserEvent';
// import ScaleLine from 'ol/control/ScaleLine';

// import { bhopalBoundaryCoordinates, BHOPAL_CENTER } from '../../data/mockdata';
// import type { MapMarker } from '../../types/index.type';

// const markerColors: Record<string, string> = {
//     'Road': '#ef4444',        // red-500
//     'Residential': '#f59e0b', // amber-500
//     'Landuse': '#3b82f6',     // blue-500
//     'Green Zone': '#22c55e',  // green-500
// };

// interface MapViewProps {
//     markers: MapMarker[];
// }

// const MapView: React.FC<MapViewProps> = ({ markers }) => {
//     const mapRef = useRef<HTMLDivElement>(null);
//     const popupRef = useRef<HTMLDivElement>(null);
//     const mapInstanceRef = useRef<Map | null>(null);
//     const overlayRef = useRef<Overlay | null>(null);
//     const markerSourceRef = useRef<VectorSource | null>(null);
//     const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

//     // ✅ React state — drives popup content
//     const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
//     const [popupPlacement, setPopupPlacement] = useState<'above' | 'below'>('above');

//     // ---------------------------------------------------------------
//     // EFFECT #1 — Initialize map once (mount only)
//     // ---------------------------------------------------------------
//     useEffect(() => {
//         if (!mapRef.current || !popupRef.current) return;

//         // --- 1. Base Layer ---
//         const baseLayer = new TileLayer({ source: new OSM() });

//         // --- 2. Boundary Layer ---
//         // const boundaryFeature = new Feature({
//         //     geometry: new Polygon([
//         //         bhopalBoundaryCoordinates.map((c) => fromLonLat(c)),
//         //     ]),
//         // });
//         // boundaryFeature.setStyle(
//         //     new Style({
//         //         fill: new Fill({ color: 'rgba(59, 130, 246, 0.10)' }),
//         //         stroke: new Stroke({
//         //             color: '#1e40af',
//         //             width: 2.5,
//         //             lineDash: [6, 4],
//         //         }),
//         //     })
//         // );
//         // const boundaryLayer = new VectorLayer({
//         //     source: new VectorSource({ features: [boundaryFeature] }),
//         //     zIndex: 10,
//         // });

//         // --- 3. Markers Layer (persistent source, features injected later) ---
//         const markerSource = new VectorSource();
//         markerSourceRef.current = markerSource;

//         const markerLayer = new VectorLayer({
//             source: markerSource,
//             zIndex: 20,
//         });
//         markerLayerRef.current = markerLayer;

//         // --- 4. Popup Overlay ---
//         const overlay = new Overlay({
//             element: popupRef.current,
//             positioning: 'bottom-center',
//             offset: [0, -18],
//             stopEvent: true,
//             // ✅ No autoPan — we control panning/placement ourselves
//         });

//         // --- 5. Map Instance ---
//         const map = new Map({
//             target: mapRef.current,
//             layers: [baseLayer, markerLayer],
//             overlays: [overlay],
//             view: new View({
//                 center: fromLonLat(BHOPAL_CENTER),
//                 zoom: 13,
//                 minZoom: 8,
//                 maxZoom: 18,
//             }),
//             controls: [],
//         });

//         // --- 6. ScaleLine control ---
//         const scaleLineControl = new ScaleLine({
//             units: 'metric',
//             bar: false,
//             steps: 4,
//             text: false,
//             minWidth: 64,
//             className: 'ol-scale-line',
//             target: document.getElementById('scale-line-container') || undefined,
//         });
//         map.addControl(scaleLineControl);

//         mapInstanceRef.current = map;
//         overlayRef.current = overlay;

//         // --- 7. Click Handler ---
//         const handleMapClick = (evt: MapBrowserEvent) => {
//             const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
//                 hitTolerance: 6,
//                 layerFilter: (layer) => layer === markerLayer,
//             });

//             if (feature) {
//                 const markerData = feature.get('markerData') as MapMarker;
//                 const geometry = feature.getGeometry() as Point;
//                 const coordinates = geometry.getCoordinates();

//                 // ✅ Decide placement using map pixel coordinates
//                 const anchorPx = map.getPixelFromCoordinate(coordinates);
//                 const mapSize = map.getSize();
//                 const POPUP_SAFE_ZONE = 340; // approx popup height + padding

//                 const placeBelow =
//                     mapSize !== undefined && anchorPx[1] < POPUP_SAFE_ZONE;

//                 setPopupPlacement(placeBelow ? 'below' : 'above');

//                 // Apply positioning BEFORE setting position
//                 if (placeBelow) {
//                     overlay.setPositioning('top-center');
//                     overlay.setOffset([0, 18]);
//                 } else {
//                     overlay.setPositioning('bottom-center');
//                     overlay.setOffset([0, -18]);
//                 }

//                 overlay.setPosition(coordinates);
//                 setSelectedMarker(markerData);
//             } else {
//                 overlay.setPosition(undefined);
//                 setSelectedMarker(null);
//             }
//         };

//         map.on('singleclick', handleMapClick);

//         // --- 8. Hover cursor ---
//         const handlePointerMove = (evt: MapBrowserEvent) => {
//             const hit = map.hasFeatureAtPixel(evt.pixel, {
//                 layerFilter: (layer) => layer === markerLayer,
//                 hitTolerance: 6,
//             });
//             map.getTargetElement().style.cursor = hit ? 'pointer' : '';
//         };
//         map.on('pointermove', handlePointerMove);

//         // --- 9. Cleanup ---
//         return () => {
//             map.un('singleclick', handleMapClick);
//             map.un('pointermove', handlePointerMove);
//             map.setTarget(undefined);
//             mapInstanceRef.current = null;
//             overlayRef.current = null;
//             markerSourceRef.current = null;
//             markerLayerRef.current = null;
//         };
//     }, []);

//     // ---------------------------------------------------------------
//     // EFFECT #2 — Rebuild marker features when `markers` prop changes
//     // ---------------------------------------------------------------
//     useEffect(() => {
//         const source = markerSourceRef.current;
//         if (!source) return;

//         const features = markers.map((m) => {
//             const feature = new Feature({
//                 geometry: new Point(fromLonLat([m.lng, m.lat])),
//             });
//             feature.set('markerData', m);
//             feature.set('isMarker', true);

//             feature.setStyle(
//                 new Style({
//                     image: new CircleStyle({
//                         radius: 8,
//                         fill: new Fill({ color: markerColors[m.category] || '#6b7280' }),
//                         stroke: new Stroke({ color: '#ffffff', width: 2 }),
//                     }),
//                 })
//             );
//             return feature;
//         });

//         // Atomic replace — no flicker
//         source.clear();
//         source.addFeatures(features);

//         // If a popup is open for a marker that no longer exists, close it
//         if (selectedMarker && !markers.some((m) => m.id === selectedMarker.id)) {
//             overlayRef.current?.setPosition(undefined);
//             setSelectedMarker(null);
//         }
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [markers]);

//     // --- Control Handlers ---
//     const handleZoomIn = () => {
//         const view = mapInstanceRef.current?.getView();
//         if (view) view.animate({ zoom: (view.getZoom() || 11) + 1, duration: 250 });
//     };

//     const handleZoomOut = () => {
//         const view = mapInstanceRef.current?.getView();
//         if (view) view.animate({ zoom: (view.getZoom() || 11) - 1, duration: 250 });
//     };

//     const handleRecenter = () => {
//         const view = mapInstanceRef.current?.getView();
//         if (view) {
//             view.animate({
//                 center: fromLonLat(BHOPAL_CENTER),
//                 zoom: 11,
//                 duration: 600,
//             });
//         }
//     };

//     const closePopup = () => {
//         overlayRef.current?.setPosition(undefined);
//         setSelectedMarker(null);
//     };

//     return (
//         <div className="flex-1 relative bg-[#e5e3df]">
//             {/* Real OpenLayers Map */}
//             <div ref={mapRef} className="absolute inset-0 w-full h-full" />

//             {/* ✅ Popup — rendered by OpenLayers Overlay, content driven by React state */}
//             <div
//                 ref={popupRef}
//                 className={`w-80 bg-white rounded-lg shadow-xl border border-gray-200 transition-opacity duration-150 ${selectedMarker ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
//                     }`}
//             >
//                 {selectedMarker && (
//                     <>
//                         <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
//                             <div className="flex items-center gap-2">
//                                 <span
//                                     className="w-2.5 h-2.5 rounded-full"
//                                     style={{ backgroundColor: markerColors[selectedMarker.category] }}
//                                 />
//                                 <span className="font-bold text-sm text-gray-800">
//                                     {selectedMarker.objectionId}
//                                 </span>
//                             </div>
//                             <Close
//                                 className="text-gray-400 cursor-pointer text-sm hover:text-gray-700"
//                                 onClick={closePopup}
//                             />
//                         </div>

//                         <div className="p-4 text-sm space-y-3">
//                             <div className="grid grid-cols-3 gap-2">
//                                 <span className="text-gray-500 col-span-1">Group</span>
//                                 <span className="col-span-2 flex items-center gap-2 text-gray-800">
//                                     {selectedMarker.category}
//                                 </span>

//                                 <span className="text-gray-500 col-span-1">Tehsil</span>
//                                 <span className="col-span-2 text-gray-800">
//                                     {selectedMarker.tehsil}
//                                 </span>
//                                 <span className="text-gray-500 col-span-1">Vilalge</span>
//                                 <span className="col-span-2 text-gray-800">
//                                     {selectedMarker.village}
//                                 </span>
//                                 <span className="text-gray-500 col-span-1">Khasra no.</span>
//                                 <span className="col-span-2 text-gray-800 break-words">
//                                     {selectedMarker.khasraNo}
//                                 </span>

//                                 <span className="text-gray-500 col-span-1">Description</span>
//                                 <span className="col-span-2 text-gray-800 line-clamp-2 break-words">
//                                     {selectedMarker.description}
//                                 </span>

//                                 <span className="text-gray-500 col-span-1">Date</span>
//                                 <span className="col-span-2 text-gray-800">
//                                     {selectedMarker.date}
//                                 </span>
//                             </div>
//                         </div>

//                         <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-lg flex justify-end">
//                             <Button
//                                 variant="contained"
//                                 size="small"
//                                 className="bg-blue-600 hover:bg-blue-700 capitalize"
//                             >
//                                 Read more...
//                             </Button>
//                         </div>
//                     </>
//                 )}

//                 {/* Popup arrow (CSS triangle) */}
//                 {
//                     popupPlacement === 'above' ? (
//                         <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0
//                   border-l-8 border-r-8 border-t-8
//                   border-l-transparent border-r-transparent border-t-white drop-shadow-md" />
//                     ) : (
//                         <div className="absolute left-1/2 -top-2 -translate-x-1/2 w-0 h-0
//                   border-l-8 border-r-8 border-b-8
//                   border-l-transparent border-r-transparent border-b-white drop-shadow-md" />
//                     )
//                 }

//             </div>

//             {/* Map Controls */}
//             <div className="absolute left-4 top-[100px] transform -translate-y-1/2 flex flex-col gap-2 z-10">
//                 <div className="bg-white rounded shadow-md flex flex-col">
//                     <IconButton size="small" className="rounded-none border-b border-gray-200" onClick={handleZoomIn}>
//                         <Add />
//                     </IconButton>
//                     <IconButton size="small" className="rounded-none" onClick={handleZoomOut}>
//                         <Remove />
//                     </IconButton>
//                 </div>
//                 <IconButton className="bg-white shadow-md rounded" onClick={handleRecenter} title="Recenter">
//                     <MyLocation />
//                 </IconButton>
//             </div>

//             {/* Legend */}
//             <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-md z-10 w-48 border border-gray-200">
//                 <h4 className="font-bold text-sm mb-3 text-gray-800">Legend</h4>
//                 <div className="space-y-2 text-xs text-gray-600">
//                     {Object.entries(markerColors).map(([key, hex]) => (
//                         <div key={key} className="flex items-center gap-2">
//                             <span className="w-3 h-3 rounded-full" style={{ backgroundColor: hex }} />
//                             <span>{key}</span>
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             {/* Real, dynamic OpenLayers ScaleLine container */}
//             <div
//                 id="scale-line-container"
//                 className="absolute bottom-4 left-4 z-10 bg-white/90 border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-sm"
//             />
//         </div>
//     );
// };

// export default MapView;

import React, { useEffect, useRef, useState } from 'react';
import { Search, Close, Add, Remove, MyLocation } from '@mui/icons-material';
import { TextField, InputAdornment, IconButton, Button } from '@mui/material';

import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import ScaleLine from 'ol/control/ScaleLine';

import { bhopalBoundaryCoordinates, BHOPAL_CENTER } from '../../data/mockdata';
import type { MapMarker } from '../../types/index.type';

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

    // Popup state (compact popup)
    const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
    const [popupPlacement, setPopupPlacement] = useState<'above' | 'below'>('above');

    // ✅ Detail panel state (right-side expanded view)
    const [detailMarker, setDetailMarker] = useState<MapMarker | null>(null);

    // ---------------------------------------------------------------
    // EFFECT #1 — Init map once
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
            positioning: 'bottom-center',
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
            units: 'metric',
            bar: false,
            steps: 4,
            text: false,
            minWidth: 64,
            className: 'ol-scale-line',
            target: document.getElementById('scale-line-container') || undefined,
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
                const markerData = feature.get('markerData') as MapMarker;
                const geometry = feature.getGeometry() as Point;
                const coordinates = geometry.getCoordinates();

                const anchorPx = map.getPixelFromCoordinate(coordinates);
                const mapSize = map.getSize();
                const POPUP_SAFE_ZONE = 340;

                const placeBelow =
                    mapSize !== undefined && anchorPx[1] < POPUP_SAFE_ZONE;

                setPopupPlacement(placeBelow ? 'below' : 'above');

                if (placeBelow) {
                    overlay.setPositioning('top-center');
                    overlay.setOffset([0, 18]);
                } else {
                    overlay.setPositioning('bottom-center');
                    overlay.setOffset([0, -18]);
                }

                overlay.setPosition(coordinates);
                setSelectedMarker(markerData);
            } else {
                overlay.setPosition(undefined);
                setSelectedMarker(null);
            }
        };

        map.on('singleclick', handleMapClick);

        const handlePointerMove = (evt: MapBrowserEvent) => {
            const hit = map.hasFeatureAtPixel(evt.pixel, {
                layerFilter: (layer) => layer === markerLayer,
                hitTolerance: 6,
            });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        };
        map.on('pointermove', handlePointerMove);

        return () => {
            map.un('singleclick', handleMapClick);
            map.un('pointermove', handlePointerMove);
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
            feature.set('markerData', m);
            feature.set('isMarker', true);

            feature.setStyle(
                new Style({
                    image: new CircleStyle({
                        radius: 8,
                        fill: new Fill({ color: markerColors[m.category] || '#6b7280' }),
                        stroke: new Stroke({ color: '#ffffff', width: 2 }),
                    }),
                })
            );
            return feature;
        });

        source.clear();
        source.addFeatures(features);

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
            // closePopup(); // hide the compact popup so panel gets focus
        }
    };

    const closeDetail = () => setDetailMarker(null);

    return (
        <div className="flex-1 relative bg-[#e5e3df]">
            {/* Map */}
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />

            {/* ======================================================
                Compact popup (attached to marker via OL Overlay)
            ====================================================== */}
            <div
                ref={popupRef}
                className={`w-80 bg-white rounded-lg shadow-xl border border-gray-200 transition-opacity duration-150 ${selectedMarker ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
            >
                {selectedMarker && (
                    <>
                        <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: markerColors[selectedMarker.category] }}
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
                            {/* Group */}
                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Group</span>
                                <span className="text-gray-800 font-medium">
                                    {detailMarker.category}
                                </span>
                            </div>

                            {/* Tehsil */}
                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Tehsil</span>
                                <span className="text-gray-800 font-medium">
                                    {detailMarker.tehsil}
                                </span>
                            </div>

                            {/* Village */}
                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Village</span>
                                <span className="text-gray-800 font-medium">
                                    {detailMarker.village}
                                </span>
                            </div>

                            {/* Khasra */}
                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Khasra No.</span>
                                <span className="text-gray-800 font-medium break-words">
                                    {detailMarker.khasraNo}
                                </span>
                            </div>

                            {/* Status */}
                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Status</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    {detailMarker.status}
                                </span>
                            </div>

                            {/* Date */}
                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 w-24 shrink-0">Date</span>
                                <span className="text-gray-800 font-medium">
                                    {detailMarker.date}
                                </span>
                            </div>

                            {/* Applicant (if available) */}
                            {detailMarker.applicantName && (
                                <div className="flex items-start gap-3">
                                    <span className="text-gray-500 w-24 shrink-0">Applicant</span>
                                    <span className="text-gray-800 font-medium">
                                        {detailMarker.applicantName}
                                    </span>
                                </div>
                            )}

                            {/* Mobile (if available) */}
                            {detailMarker.mobile && (
                                <div className="flex items-start gap-3">
                                    <span className="text-gray-500 w-24 shrink-0">Mobile</span>
                                    <span className="text-gray-800 font-medium">
                                        {detailMarker.mobile}
                                    </span>
                                </div>
                            )}

                            {/* Description — full, wrapped */}
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-gray-500 mb-2">Description</p>
                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                                    {detailMarker.description}
                                </p>
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
            <div className="absolute left-4 top-[100px] transform -translate-y-1/2 flex flex-col gap-2 z-10">
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