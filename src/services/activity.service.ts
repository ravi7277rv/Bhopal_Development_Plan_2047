import { ENV } from '../config/env';
import { apiClient } from './apiClient';
import type { MapMarker } from '../types/index.type';

interface ActivityLogOptions {
  source: 'map' | 'sidebar' | 'search' | 'khasra filter';
  searchType?: string;
  searchInput?: string;
}

/** Log opening a khasra detail popup. Logging failures must not block map use. */
export const logKhasraDetailOpened = (
  marker: MapMarker,
  { source, searchType, searchInput }: ActivityLogOptions,
): void => {
  const search = searchInput?.trim();
  const details = [
    `clicked from ${source}`,
    `village: ${marker.village}`,
    `khasra: ${marker.khasraNo}`,
    searchType ? `search_type: ${searchType}` : '',
    search ? `search_input: ${search}` : '',
  ].filter(Boolean).join('; ');

  void apiClient.post(ENV.ACTIVITY_LOG_ENDPOINT, {
    tab: 'Objection',
    activity: searchType && search
      ? `Searched ${searchType}: ${search}; opened khasra detail`
      : 'Opened khasra detail',
    tehsil: 'Huzur',
    village: marker.village,
    khasra_no: marker.khasraNo,
    detail_view: 'true',
    pop_feature: marker.khasraNo,
    details,
  }).catch((error) => {
    console.error('Failed to log khasra detail activity:', error);
  });
};

export const logObjectionFilterSelected = (filters: {
  village: string;
  khasra: string;
  selected: 'village' | 'khasra';
}): void => {
  const { village, khasra, selected } = filters;
  const field = selected === 'village' ? 'village' : 'khasra';
  const value = selected === 'village' ? village : khasra;
  void apiClient.post(ENV.ACTIVITY_LOG_ENDPOINT, {
    tab: 'Objection',
    activity: `Filtered by ${field}: ${value}`,
    tehsil: 'Huzur',
    village,
    khasra_no: khasra,
    detail_view: 'false',
    pop_feature: khasra || 'false',
    details: `map filter selected; village: ${village || 'all'}; khasra: ${khasra || 'all'}`,
  }).catch((error) => {
    console.error('Failed to log objection filter activity:', error);
  });
};
