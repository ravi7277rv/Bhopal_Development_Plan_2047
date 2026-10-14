import { ENV } from '../config/env';
import { apiClient } from './apiClient';
import type { MapMarker } from '../types/index.type';

// ---------------------------------------------------------------
// API response shapes (NEW DB SCHEMA)
// ---------------------------------------------------------------
export interface ApiObjection {
  id: number;
  apatti_gro: string | number | null;
  area: number | null;
  bhucode: string | null;
  code: string | null;
  geom: string | null;
  gov_kh: string | null;
  khasra_no: string | null;
  obj_type: string | null;
  objection_id: string | null;
  remark: string | null;
  upvargikar: string | null;
  vargikaran: string | null;
  village: string | null;
}

export interface ApiObjectionResponse {
  count: number;
  data: ApiObjection[];
  status: string;
}

// ---------------------------------------------------------------
// Safe coercion helpers
// ---------------------------------------------------------------
const safeString = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v);

const safeNumber = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const wktCentroid = (
  wkt: string | null
): { lat: number; lng: number } | null => {
  if (!wkt) return null;

  const coordRegex = /(-?\d+\.\d+)\s+(-?\d+\.\d+)/g;
  const matches = [...wkt.matchAll(coordRegex)];

  if (matches.length === 0) return null;

  let sumLng = 0;
  let sumLat = 0;

  for (const m of matches) {
    sumLng += parseFloat(m[1]);
    sumLat += parseFloat(m[2]);
  }

  return {
    lng: sumLng / matches.length,
    lat: sumLat / matches.length,
  };
};

// ---------------------------------------------------------------
// Adapter — every field is defensive against null
// ---------------------------------------------------------------
export const toMapMarker = (obj: ApiObjection): MapMarker => {
  const objType = safeString(obj.obj_type);
  const khasraNo = safeString(obj.khasra_no);
  const village = safeString(obj.village);

  return {
    id: String(obj.id),
    objectionId: safeString(obj.objection_id),
    objectType: objType || 'Unknown',
    khasraNo: khasraNo || '—',
    village: village || 'Unknown',

    // New schema fields
    area: safeNumber(obj.area),
    bhucode: safeString(obj.bhucode),
    code: safeString(obj.code),
    geom: safeString(obj.geom),
    apattiGro: safeString(obj.apatti_gro),
    govKh: obj.gov_kh ?? null,
    remark: obj.remark ?? null,
    upvargikar: obj.upvargikar ?? null,
    vargikaran: obj.vargikaran ?? null,
  };

};

// ---------------------------------------------------------------
// Fetch + adapt
// ---------------------------------------------------------------
export const fetchObjectionMarkers = async (): Promise<MapMarker[]> => {
  const { data: envelope } = await apiClient.get<
    ApiObjectionResponse | ApiObjection[]
  >(ENV.OBJECTION_HISTOY_ENDPOINT);

  const raw = Array.isArray(envelope) ? envelope : envelope.data;

  // Only keep entries we could geolocate
  const plottable = raw.filter((r) => {
    const c = wktCentroid(r.geom);
    return c !== null && c.lat !== 0 && c.lng !== 0;
  });

  return plottable.map(toMapMarker);
};