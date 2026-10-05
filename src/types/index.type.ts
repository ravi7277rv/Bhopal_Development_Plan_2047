export type ObjectionCategory =
  | 'Road'
  | 'Residential'
  | 'Landuse'
  | 'Green Zone';

export type ObjectionStatus = 'Open' | 'In Progress' | 'Resolved';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  category: ObjectionCategory;
  objectionId: string;
  title: string;
  khasraNo: string;
  village: string;
  tehsil: string;
  description: string;
  date: string;
  status: ObjectionStatus;

  // ✅ Optional API-only fields
  applicantName?: string;
  mobile?: string;
  documentLink?: string | null;
}

export interface Objection {
  id: string;
  title: string;
  category: ObjectionCategory;
  khasraNo: string;
  date: string;
  status: ObjectionStatus;
}

