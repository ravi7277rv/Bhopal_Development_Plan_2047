import { ENV } from '../config/env';
import { apiClient } from './apiClient';
import type { MapMarker } from '../types/index.type';

interface ActivityLogOptions {
  source: 'map' | 'sidebar' | 'search' | 'khasra filter';
  searchType?: string;
  searchInput?: string;
}

export interface ActivityLogEntry {
  id: number;
  activity: string;
  village: string;
  khasraNo: string;
  createdAt: string;
  username?: string;
}

const activityEntries: ActivityLogEntry[] = [];
let activitySnapshot: readonly ActivityLogEntry[] = activityEntries;
const activityListeners = new Set<() => void>();
let nextActivityId = 1;

const rememberActivity = (entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>) => {
  activityEntries.unshift({
    ...entry,
    id: nextActivityId++,
    createdAt: new Date().toISOString(),
  });
  activityEntries.splice(100);
  activitySnapshot = [...activityEntries];
  activityListeners.forEach((listener) => listener());
};

export const getActivityLog = (): readonly ActivityLogEntry[] => activitySnapshot;

export const subscribeToActivityLog = (listener: () => void): (() => void) => {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
};

const postActivity = (payload: Record<string, string>, errorLabel: string) => {
  void apiClient.post(ENV.ACTIVITY_LOG_ENDPOINT, payload).catch((error) => {
    console.error(`Failed to log ${errorLabel} activity:`, error);
  });
};

export const logSidebarChipSelected = (chip: string): void => {
  const activity = `Selected sidebar chip: ${chip}`;
  rememberActivity({ activity, village: '', khasraNo: '' });
  postActivity({
    tab: '', activity,  village: '', khasra_no: '',
    detail_view: 'false', pop_feature: 'false', details: 'sidebar chip selected',
  }, 'sidebar chip');
};

export const logUserLogin = (user: { username: string; name?: string; role?: string }): void => {
  const activity = `User logged in: ${user.name || user.username}`;
  rememberActivity({ activity, village: '', khasraNo: '', username: user.username });
  postActivity({
    tab: 'Login', activity, village: '', khasra_no: '',
    detail_view: 'false', pop_feature: 'false',
    details: `username: ${user.username}; role: ${user.role || ''}`,
  }, 'login');
};

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
  const activity = searchType && search
    ? `Searched ${searchType}: ${search}; opened khasra detail`
    : 'Opened khasra detail';

  rememberActivity({ activity, village: marker.village, khasraNo: marker.khasraNo });

  postActivity({
    tab: 'Objection',
    activity,
    tehsil: 'Huzur',
    village: marker.village,
    khasra_no: marker.khasraNo,
    detail_view: 'true',
    pop_feature: marker.khasraNo,
    details,
  }, 'khasra detail');
};

export const logObjectionFilterSelected = (filters: {
  village: string;
  khasra: string;
  selected: 'village' | 'khasra';
}): void => {
  const { village, khasra, selected } = filters;
  const field = selected === 'village' ? 'village' : 'khasra';
  const value = selected === 'village' ? village : khasra;
  const activity = `Filtered by ${field}: ${value}`;
  rememberActivity({ activity, village, khasraNo: khasra });
  postActivity({
    tab: 'Objection',
    activity,
    tehsil: 'Huzur',
    village,
    khasra_no: khasra,
    detail_view: 'false',
    pop_feature: khasra || 'false',
    details: `map filter selected; village: ${village || 'all'}; khasra: ${khasra || 'all'}`,
  }, 'objection filter');
};
