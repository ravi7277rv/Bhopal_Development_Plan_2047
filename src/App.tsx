import { useCallback, useState } from "react";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import MapView from "./components/map/MapView";
import { useObjectionFilters } from "./hooks/useObjectionsFilter";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import type { MapMarker } from "./types/index.type";
import MapFilterBar from "./components/map/MapFilterBar";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [hoveredVillage, setHoveredVillage] = useState<MapMarker | null>(null);
  const [selectedMapLocation, setSelectedMapLocation] =
    useState<MapMarker | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [activeChip, setActiveChip] = useState<string>("All");
  const [mapSearchResults, setMapSearchResults] = useState<MapMarker[] | null>(
    null,
  );
  const [sidebarSelection, setSidebarSelection] = useState<{
    marker: MapMarker;
    requestId: number;
  } | null>(null);

  const {
    filters,
    markers,
    villages,
    khasraNumbers,
    filteredMarkers,
    setVillage,
    setKhasra,
    setSearchQuery,
    resetFilters,
  } = useObjectionFilters();

  //  Click on a map marker → sync filters + remember selection
  const selectMapLocation = useCallback(
    (marker: MapMarker) => {
      setVillage(marker.village);
      setSelectedMapLocation(marker);
    },
    [setVillage],
  );

  //  Click "Show village on map" from sidebar card
  const selectVillageFromCard = useCallback(
    (marker: MapMarker) => {
      setVillage(marker.village);
      setSelectedMapLocation(marker);
    },
    [setVillage],
  );

  const clearAll = useCallback(() => {
    resetFilters();
    setHoveredVillage(null);
    setSelectedMapLocation(null);
    setResetKey((key) => key + 1);
  }, [resetFilters]);

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <ProtectedRoute>
        <Header
          villages={villages}
          khasraNumbers={khasraNumbers}
          selectedVillage={filters.village}
          selectedKhasra={filters.khasra}
          onVillageChange={setVillage}
          onKhasraChange={setKhasra}
        />

        {/*  Row respects header height — sidebar never overlaps header */}
        <div className="flex flex-1 relative overflow-hidden h-[calc(100%-80px)]">

          <main className="flex-1 relative flex">
            <MapView
              markers={filteredMarkers}
              searchQuery={filters.searchQuery}
              boundaryMarkers={markers}
              selectedVillage={filters.village}
              sidebarSelection={sidebarSelection}
              selectedKhasra={filters.khasra}
              focusMarker={hoveredVillage ?? selectedMapLocation}
              onLocationSelect={selectMapLocation}
              resetKey={resetKey}
              activeChip={activeChip}
              setVillage={setVillage}
              onMapSearchResultsChange={setMapSearchResults}
            />

            {/* ============ MAP FILTER BAR — responsive ============ */}
            {/* Positioned on the top-left of the map, below the search bar (which is
                in MapView at top-4 left-4, height 42). We use top-[70px] to clear it.
                On XL screens we shift it right so search and filters sit side by side. */}
            <div
              className="
                absolute z-20
                top-[70px] left-4 right-4
                md:right-auto md:w-[320px]
                xl:top-4 xl:left-[400px] xl:right-auto xl:w-auto
                pointer-events-none
              "
            >
              <div className="pointer-events-auto">
                <MapFilterBar
                  villages={villages}
                  khasraNumbers={khasraNumbers}
                  selectedVillage={filters.village}
                  selectedKhasra={filters.khasra}
                  onVillageChange={setVillage}
                  onKhasraChange={setKhasra}
                />
              </div>
            </div>
          </main>

          <Sidebar
            objections={mapSearchResults ?? filteredMarkers}
            searchQuery={filters.searchQuery}
            onSearchChange={setSearchQuery}
            onClearAll={clearAll}
            resetKey={resetKey}
            onVillageHover={setHoveredVillage}
            onVillageSelect={selectVillageFromCard}
            onObjectionClick={(marker) =>
              setSidebarSelection((current) => ({
                marker,
                requestId: (current?.requestId ?? 0) + 1,
              }))
            }
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((prev) => !prev)}
            activeChip={activeChip}
            setActiveChip={setActiveChip}
          />
        </div>
      </ProtectedRoute>
    </div>
  );
}

export default App;
