import { useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MapView from './components/map/MapView';
import { useObjectionFilters } from './hooks/useObjectionsFilter';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const {
    filters,
    tehsils,
    villages,
    khasraNumbers,
    filteredMarkers,
    setTehsil,
    setVillage,
    setKhasra,
    setSearchQuery,
  } = useObjectionFilters();

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
            <MapView markers={filteredMarkers} />
          </main>

          <Sidebar
            objections={filteredMarkers}
            searchQuery={filters.searchQuery}
            onSearchChange={setSearchQuery}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((prev) => !prev)}
          />
        </div>
      </ProtectedRoute>
    </div>
  );
}

export default App;