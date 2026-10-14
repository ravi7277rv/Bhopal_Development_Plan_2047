import { apiClient } from './apiClient';
import type { MapMarker } from '../types/index.type';
import { ENV } from '../config/env';

/**
 * Payload shape expected by the backend /api/pdf/generate endpoint.
 * Aligned with the new DB schema (WKT geometry, no lat/lng/tehsil/status).
 */
export interface PdfMarkerPayload {
  id: string;
  objection_id: string;
  object_type: string;
  khasra_no?: string;
  village?: string;
  area?: number;
  bhucode?: string;
  code?: string;
  geom?: string;
  apatti_gro?: string;
  gov_kh?: string | null;
  remark?: string | null;
  upvargikar?: string | null;
  vargikaran?: string | null;
}

export interface PdfGeneratePayload {
  title: string;
  subtitle: string;
  map_image: string;                 // base64 data URL
  markers: PdfMarkerPayload[];
  selectedVillage: string;
  selectedKhasra: string;
}

/**
 * Maps a domain MapMarker to the payload shape expected by the API.
 */
const toPayloadMarker = (m: MapMarker): PdfMarkerPayload => ({
  id: m.id,
  objection_id: m.objectionId,
  object_type: m.objectType,
  khasra_no: m.khasraNo,
  village: m.village,
  area: m.area ?? 0,
  bhucode: m.bhucode ?? '',
  code: m.code ?? '',
  geom: m.geom ?? '',
  apatti_gro: m.apattiGro ?? '',
  gov_kh: m.govKh ?? null,
  remark: m.remark ?? null,
  upvargikar: m.upvargikar ?? null,
  vargikaran: m.vargikaran ?? null,
});

/**
 * Requests the PDF from the backend and triggers the browser download.
 * Returns the downloaded filename for logging / toast display.
 */
export const downloadPdfReport = async (
  payload: PdfGeneratePayload,
): Promise<string> => {
  const response = await apiClient.post(ENV.PDF_REPORT_ENDPOINT, payload, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });

  // Prefer the filename the backend sent via Content-Disposition
  const disposition =
    (response.headers?.['content-disposition'] as string | undefined) ?? '';
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const fileName =
    match?.[1] ??
    `bhopal-masterplan-${new Date().toISOString().split('T')[0]}.pdf`;

  // Trigger browser download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return fileName;
};

/**
 * High-level helper — builds the payload from markers + map image
 * and calls the API. This is what the UI layer should use.
 */
export const generateAndDownloadPdf = async (params: {
  markers: MapMarker[];
  mapImageDataUrl: string;
  title?: string;
  subtitle?: string;
  selectedVillage: string;
  selectedKhasra: string;
}): Promise<string> => {
  const payload: PdfGeneratePayload = {
    title: params.title ?? 'Bhopal Development Plan - 2047 (Draft)',
    subtitle:
      params.subtitle ??
      'Objections & Suggestions on the Draft Development Plan',
    map_image: params.mapImageDataUrl,
    markers: params.markers.map(toPayloadMarker),
    selectedVillage: params.selectedVillage,
    selectedKhasra: params.selectedKhasra,
  };

  return downloadPdfReport(payload);
};