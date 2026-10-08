import { useCallback, useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MapView from './components/map/MapView';
import { useObjectionFilters } from './hooks/useObjectionsFilter';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CircularProgress } from '@mui/material';
import type { MapMarker } from './types/index.type';

function App() {

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [hoveredVillage, setHoveredVillage] = useState<MapMarker | null>(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState<MapMarker | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const {
    filters,
    markers,
    tehsils,
    villages,
    khasraNumbers,
    filteredMarkers,
    setTehsil,
    setVillage,
    setKhasra,
    setSearchQuery,
    resetFilters,

  } = useObjectionFilters();

  const selectMapLocation = useCallback((marker: MapMarker) => {
    setTehsil(marker.tehsil);
    setVillage(marker.village);
    setSelectedMapLocation(marker);
  }, [setTehsil, setVillage]);

  const clearAll = useCallback(() => {
    resetFilters();
    setHoveredVillage(null);
    setSelectedMapLocation(null);
    setResetKey((key) => key + 1);
  }, [resetFilters]);




  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
      <ProtectedRoute>
        <Header
          tehsils={tehsils}
          villages={villages}
          khasraNumbers={khasraNumbers}
          selectedTehsil={filters.tehsil}
          selectedVillage={filters.village}
          selectedKhasra={filters.khasra}
          onTehsilChange={setTehsil}
          onVillageChange={setVillage}
          onKhasraChange={setKhasra}
        />
        {/* ✅ Row respects header height — sidebar never overlaps header */}
        <div className="flex flex-1 relative overflow-hidden h-[calc(100%-80px)]">
          <main className="flex-1 relative flex">
            <MapView markers={filteredMarkers} searchQuery={filters.searchQuery} boundaryMarkers={markers} selectedTehsil={filters.tehsil} selectedVillage={filters.village} focusMarker={hoveredVillage ?? selectedMapLocation} onLocationSelect={selectMapLocation} resetKey={resetKey} />
          </main>

          <Sidebar
            objections={filteredMarkers}
            searchQuery={filters.searchQuery}
            onSearchChange={setSearchQuery}
            onClearAll={clearAll}
            resetKey={resetKey}
            onVillageHover={setHoveredVillage}
            onVillageSelect={selectMapLocation}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((prev) => !prev)}
          />
        </div>
      </ProtectedRoute>
    </div>
  );
}

export default App;
