export type ObjectionCategory =
  | 'Residential'
  | 'Commercial'
  | 'Infrastructure'
  | 'Environment'
  | 'Traffic & Mobility'
  | 'Others';
export type ObjectionStatus = 'Open' | 'In Progress' | 'Resolved';

export interface Objection {
  id: string;
  title: string;
  category: ObjectionCategory;
  khasraNo: string;
  date: string;
  status: ObjectionStatus;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  category: ObjectionCategory;
  objectionId: string;
  title: string;
  khasraNo: string;   // ONLY the number, e.g. "245/2"
  village: string;
  tehsil: string;
  description: string;
  date: string;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_LOGIN_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}