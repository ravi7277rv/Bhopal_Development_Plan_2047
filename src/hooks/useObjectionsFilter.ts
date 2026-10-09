import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchObjectionMarkers } from '../services/objections.service';
import type { MapMarker } from '../types/index.type';
import { useAuth } from '../context/AuthContext';

export interface ObjectionFilters {
  village: string;
  khasra: string;
  searchQuery: string;
}

const EMPTY_FILTERS: ObjectionFilters = {
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
        console.log('Fetched objections:', data);
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

  // ✅ Unique villages — derived from fetched data
  const villages = useMemo<string[]>(
    () => [...new Set(markers.map((m) => m.village))].filter(Boolean).sort(),
    [markers]
  );

  // ✅ Khasra numbers — cascaded by village
  const khasraNumbers = useMemo<string[]>(() => {
    const source = markers.filter((m) => {
      const villageMatch = !filters.village || m.village === filters.village;
      return villageMatch;
    });

    return [...new Set(source.map((m) => m.khasraNo))]
      .filter((k) => !!k)
      .sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      );
  }, [markers, filters.village]);

  // ✅ Filtered markers — village → khasra → search
  const filteredMarkers = useMemo<MapMarker[]>(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    const khasraQ = filters.khasra.trim().toLowerCase();

    return markers.filter((m) => {
      const villageMatch = !filters.village || m.village === filters.village;
      const khasraMatch =
        !khasraQ || String(m.khasraNo ?? '').toLowerCase() === khasraQ;

      if (!villageMatch || !khasraMatch) return false;
      if (!q) return true;

      // ✅ Search across all relevant text fields
      const haystack = [
        m.objectionId,
        m.khasraNo,
        m.village,
        m.objectType,
        m.bhucode,
        m.code,
        m.remark,
        m.upvargikar,
        m.vargikaran,
        m.apattiGro,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [markers, filters]);

  // --- Setters with cascade resets ---
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
    villages,
    khasraNumbers,
    filteredMarkers,

    // setters
    setVillage,
    setKhasra,
    setSearchQuery,
    resetFilters,
  };
};