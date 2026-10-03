import { useCallback, useMemo, useState } from 'react';
import { mockMarkers } from '../data/mockdata';
import type { MapMarker } from '../types/index.type';

export interface ObjectionFilters {
  tehsil: string;
  village: string;
  khasra: string;
  searchQuery: string;
}

export const useObjectionFilters = () => {
  // ✅ Individual states — updates isolated
  const [tehsil, setTehsilState] = useState('');
  const [village, setVillageState] = useState('');
  const [khasra, setKhasraState] = useState('');
  const [searchQuery, setSearchQueryState] = useState('');

  // ✅ filters object — derived, memoized
  const filters = useMemo<ObjectionFilters>(
    () => ({ tehsil, village, khasra, searchQuery }),
    [tehsil, village, khasra, searchQuery]
  );

  const tehsils = useMemo<string[]>(
    () => [...new Set(mockMarkers.map((m) => m.tehsil))].sort(),
    []
  );

  const villages = useMemo<string[]>(() => {
    const source = tehsil
      ? mockMarkers.filter((m) => m.tehsil === tehsil)
      : mockMarkers;
    return [...new Set(source.map((m) => m.village))].sort();
  }, [tehsil]);

  const khasraNumbers = useMemo<string[]>(() => {
    const source = mockMarkers.filter((m) => {
      const tehsilMatch = !tehsil || m.tehsil === tehsil;
      const villageMatch = !village || m.village === village;
      return tehsilMatch && villageMatch;
    });
    return [...new Set(source.map((m) => m.khasraNo))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [tehsil, village]);

  const filteredMarkers = useMemo<MapMarker[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const khasraQ = khasra.trim().toLowerCase();

    return mockMarkers.filter((m) => {
      const tehsilMatch = !tehsil || m.tehsil === tehsil;
      const villageMatch = !village || m.village === village;
      const khasraMatch = !khasraQ || m.khasraNo.toLowerCase() === khasraQ;
      const queryMatch =
        !q ||
        m.objectionId.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.khasraNo.toLowerCase().includes(q);

      return tehsilMatch && villageMatch && khasraMatch && queryMatch;
    });
  }, [tehsil, village, khasra, searchQuery]);

  // ✅ Stable setters
  const setTehsil = useCallback((v: string) => {
    setTehsilState(v);
    setVillageState('');
    setKhasraState('');
  }, []);

  const setVillage = useCallback((v: string) => {
    setVillageState(v);
    setKhasraState('');
  }, []);

  const setKhasra = useCallback((v: string) => {
    setKhasraState(v);
  }, []);

  const setSearchQuery = useCallback((v: string) => {
    setSearchQueryState(v);
  }, []);

  const resetFilters = useCallback(() => {
    setTehsilState('');
    setVillageState('');
    setKhasraState('');
    setSearchQueryState('');
  }, []);

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