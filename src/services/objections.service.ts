import { ENV } from '../config/env';
import { apiClient } from './apiClient';
import type { MapMarker, ObjectionCategory, ObjectionStatus } from '../types/index.type';

// ---------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------
export interface ApiObjection {
    id: number;
    objection_id: string | null;
    name: string | null;
    mobile: string | null;
    latitude: number | null;
    longitude: number | null;
    obj_type: string | null;
    status: string | null;
    village: string | null;
    tehsil: string | null;
    khasra_no: string | null;
    description: string | null;
    date: string | null;
    document_link: string | null;
}

export interface ApiObjectionResponse {
    count: number;
    data: ApiObjection[];
    status: string;
}

// ---------------------------------------------------------------
// Safe coercion helpers
// ---------------------------------------------------------------
/** Always returns a string, never null/undefined. */
const safeString = (v: unknown): string =>
    v === null || v === undefined ? '' : String(v);

/** Always returns a number, never null/undefined/NaN. */
const safeNumber = (v: unknown): number => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};

// ---------------------------------------------------------------
// Domain mappers
// ---------------------------------------------------------------
const mapCategory = (objType: string): ObjectionCategory => {
    const t = objType.toLowerCase();

    if (t.includes('road')) return 'Road';
    if (t.includes('residential')) return 'Residential';
    if (t.includes('agriculture') || t.includes('green zone')) return 'Green Zone';
    if (t.includes('landuse')) return 'Landuse';
    return 'Landuse'; // everything else
};

const mapStatus = (status: string): ObjectionStatus => {
    const s = status.toLowerCase();
    if (s === 'resolved' || s === 'closed') return 'Resolved';
    if (s === 'in progress' || s === 'in-progress' || s === 'pending')
        return 'In Progress';
    return 'Open';
};

const formatDate = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

// ---------------------------------------------------------------
// Adapter — every field is defensive against null
// ---------------------------------------------------------------
export const toMapMarker = (obj: ApiObjection): MapMarker => {
    const objType = safeString(obj.obj_type);
    const khasraNo = safeString(obj.khasra_no);
    const village = safeString(obj.village);
    const tehsil = safeString(obj.tehsil);
    const description = safeString(obj.description);

    return {
        id: String(obj.id),
        lat: safeNumber(obj.latitude),
        lng: safeNumber(obj.longitude),
        category: mapCategory(objType),
        objectionId: safeString(obj.objection_id),
        title: objType || 'Untitled',
        khasraNo: khasraNo || '—',
        village: village || 'Unknown',
        tehsil: tehsil || 'Unknown',
        description: description || 'No description provided.',
        date: formatDate(safeString(obj.date)),
        status: mapStatus(safeString(obj.status)),
        applicantName: safeString(obj.name),
        mobile: safeString(obj.mobile),
        documentLink: obj.document_link ?? null,
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

    // Filter out entries that don't have valid coordinates (can't plot on map)
    const plottable = raw.filter(
        (r) =>
            typeof r.latitude === 'number' &&
            typeof r.longitude === 'number' &&
            r.latitude !== 0 &&
            r.longitude !== 0
    );

    return plottable.map(toMapMarker);
};