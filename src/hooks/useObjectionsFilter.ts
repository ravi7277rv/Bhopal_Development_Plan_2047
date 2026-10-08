import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchObjectionMarkers } from '../services/objections.service';
import type { MapMarker } from '../types/index.type';
import { useAuth } from '../context/AuthContext';

export interface ObjectionFilters {
  tehsil: string;
  village: string;
  khasra: string;
  searchQuery: string;
}

const EMPTY_FILTERS: ObjectionFilters = {
  tehsil: '',
  village: '',
  khasra: '',
  searchQuery: '',
};

export const useObjectionFilters = () => {
    const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<ObjectionFilters>(EMPTY_FILTERS);

  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch once on mount
  useEffect(() => {
    if (!isAuthenticated) return; 
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchObjectionMarkers();
        if (!cancelled) setMarkers(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load objections'
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ✅ All unique tehsils — derived from fetched data
  const tehsils = useMemo<string[]>(
    () => [...new Set(markers.map((m) => m.tehsil))].sort(),
    [markers]
  );

  // ✅ Villages — cascaded by tehsil
  const villages = useMemo<string[]>(() => {
    const source = filters.tehsil
      ? markers.filter((m) => m.tehsil === filters.tehsil)
      : markers;
    return [...new Set(source.map((m) => m.village))].sort();
  }, [markers, filters.tehsil]);

  // ✅ Khasra numbers — cascaded by tehsil + village
  const khasraNumbers = useMemo<string[]>(() => {
    const source = markers.filter((m) => {
      const tehsilMatch = !filters.tehsil || m.tehsil === filters.tehsil;
      const villageMatch = !filters.village || m.village === filters.village;
      return tehsilMatch && villageMatch;
    });

    return [...new Set(source.map((m) => m.khasraNo))]
      .filter((k) => !!k)                      // ✅ remove empty/undefined
      .sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      );
  }, [markers, filters.tehsil, filters.village]);

  // ✅ Final filtered markers
  // const filteredMarkers = useMemo<MapMarker[]>(() => {
  //   const q = filters.searchQuery.trim().toLowerCase();
  //   const khasraQ = filters.khasra.trim().toLowerCase();

  //   return markers.filter((m) => {
  //     const tehsilMatch = !filters.tehsil || m.tehsil === filters.tehsil;
  //     const villageMatch = !filters.village || m.village === filters.village;
  //     const khasraMatch = !khasraQ || m.khasraNo.toLowerCase() === khasraQ;
  //     const queryMatch =
  //       !q ||
  //       m.objectionId.toLowerCase().includes(q) ||
  //       m.title.toLowerCase().includes(q) ||
  //       m.description.toLowerCase().includes(q) ||
  //       m.khasraNo.toLowerCase().includes(q);

  //     return tehsilMatch && villageMatch && khasraMatch && queryMatch;
  //   });
  // }, [markers, filters]);




  const filteredMarkers = useMemo<MapMarker[]>(() => {
  const q = filters.searchQuery.trim().toLowerCase();
  const khasraQ = filters.khasra.trim().toLowerCase();

  return markers
    .filter((m) => {
      const tehsilMatch = !filters.tehsil || m.tehsil === filters.tehsil;
      const villageMatch = !filters.village || m.village === filters.village;
      const khasraMatch = !khasraQ || m.khasraNo.toLowerCase() === khasraQ;
      if (!tehsilMatch || !villageMatch || !khasraMatch) return false;

      if (!q) return true;

      // ✅ Search across ALL text fields — including description
      return (
        m.objectionId.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.khasraNo.toLowerCase().includes(q) ||
        m.village.toLowerCase().includes(q) ||
        m.tehsil.toLowerCase().includes(q) ||
        m.applicantName?.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)   // ← description search
      );
    })
    .sort((a, b) => {
      // ✅ Optional: rank rows where description matches higher
      if (!q) return 0;
      const aDesc = a.description.toLowerCase().includes(q) ? 1 : 0;
      const bDesc = b.description.toLowerCase().includes(q) ? 1 : 0;
      return bDesc - aDesc;
    });
}, [markers, filters]);




  // --- Setters with cascade resets ---
  const setTehsil = useCallback(
    (tehsil: string) =>
      setFilters((f) => ({ ...f, tehsil, village: '', khasra: '' })),
    []
  );

  const setVillage = useCallback(
    (village: string) => setFilters((f) => ({ ...f, village, khasra: '' })),
    []
  );

  const setKhasra = useCallback(
    (khasra: string) => setFilters((f) => ({ ...f, khasra })),
    []
  );

  const setSearchQuery = useCallback(
    (searchQuery: string) => setFilters((f) => ({ ...f, searchQuery })),
    []
  );

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);
 const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchObjectionMarkers();
      setMarkers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load objections'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // data state
    markers,
    isLoading,
    error,
reload,
    // derived filter lists
    filters,
    tehsils,
    villages,
    khasraNumbers,
    filteredMarkers,

    // setters
    setTehsil,
    setVillage,
    setKhasra,
    setSearchQuery,
    resetFilters,
  };
};