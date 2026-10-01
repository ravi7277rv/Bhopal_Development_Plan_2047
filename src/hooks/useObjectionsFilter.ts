import { useMemo, useState } from 'react';
import { mockMarkers } from '../data/mockdata';
import type { MapMarker } from '../types/index.type';

export interface ObjectionFilters {
  tehsil: string;
  village: string;
  khasra: string;
  searchQuery: string; // Free-text search (objectionId, title, description)
}

export const useObjectionFilters = () => {
  const [filters, setFilters] = useState<ObjectionFilters>({
    tehsil: '',
    village: '',
    khasra: '',
    searchQuery: '',
  });

  /** All unique tehsils — computed once */
  const tehsils = useMemo<string[]>(
    () => [...new Set(mockMarkers.map((m) => m.tehsil))].sort(),
    []
  );

  /** Villages — cascaded by selected tehsil */
  const villages = useMemo<string[]>(() => {
    const source = filters.tehsil
      ? mockMarkers.filter((m) => m.tehsil === filters.tehsil)
      : mockMarkers;
    return [...new Set(source.map((m) => m.village))].sort();
  }, [filters.tehsil]);

  /** Khasra numbers — cascaded by tehsil + village */
  const khasraNumbers = useMemo<string[]>(() => {
    const source = mockMarkers.filter((m) => {
      const tehsilMatch = !filters.tehsil || m.tehsil === filters.tehsil;
      const villageMatch = !filters.village || m.village === filters.village;
      return tehsilMatch && villageMatch;
    });
    return [...new Set(source.map((m) => m.khasraNo))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [filters.tehsil, filters.village]);

  /** Final filtered markers — the list that drives Sidebar + MapView */
  const filteredMarkers = useMemo<MapMarker[]>(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    const khasraQ = filters.khasra.trim().toLowerCase();

    return mockMarkers.filter((m) => {
      debugger
      const tehsilMatch = !filters.tehsil || m.tehsil === filters.tehsil;
      const villageMatch = !filters.village || m.village === filters.village;
      const khasraMatch = !khasraQ || m.khasraNo.toLowerCase() === khasraQ;
      const queryMatch =
        !q ||
        m.objectionId.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.khasraNo.toLowerCase().includes(q);

      return tehsilMatch && villageMatch && khasraMatch && queryMatch;
    });
  }, [filters]);

  // --- Setters with cascade resets ---
  const setTehsil = (tehsil: string) =>
    setFilters((f) => ({ ...f, tehsil, village: '', khasra: '' }));

  const setVillage = (village: string) =>
    setFilters((f) => ({ ...f, village, khasra: '' }));

  const setKhasra = (khasra: string) =>
    setFilters((f) => ({ ...f, khasra }));

  const setSearchQuery = (searchQuery: string) =>
    setFilters((f) => ({ ...f, searchQuery }));

  const resetFilters = () =>
    setFilters({ tehsil: '', village: '', khasra: '', searchQuery: '' });

  return {
    filters,
    tehsils,
    villages,
    khasraNumbers,
    filteredMarkers,
    setTehsil,
    setVillage,
    setKhasra,
    setSearchQuery,
    resetFilters,
  };
};