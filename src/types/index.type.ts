export type ObjectionCategory =
  | 'Road'
  | 'Residential'
  | 'Landuse'
  | 'Green Zone';

export type ObjectionStatus = 'Open' | 'In Progress' | 'Resolved';

export interface MapMarker {
  id: string;
  objectionId: string;
  objectType: string;
  khasraNo: string;
  village: string;
  area?: number;                     // polygon area
  bhucode?: string;                  // Bhu-Naksha code
  code?: string;                     // category code e.g. "36-01"
  geom?: string;                     // WKT MULTIPOLYGON string
  apattiGro?: string;                // objection group
  govKh?: string | null;             // gov_kh
  exportFlag?: string | boolean | null; // export permission flag
  remark?: string | null;            // raw remark
  upvargikar?: string | null;        // sub-classification
  vargikaran?: string | null;        // classification
  officer1?: string | null;
  officer2?: string | null;
  officer3?: string | null;
  latitude?: number;                   // latitude
  longitude?: number;                  // longitude
  officer1?: string | null;
  officer2?: string | null;
  officer3?: string | null;
}

export interface Objection {
  id: string;
  title: string;
  category: ObjectionCategory;
  khasraNo: string;
  date: string;
  status: ObjectionStatus;
}
