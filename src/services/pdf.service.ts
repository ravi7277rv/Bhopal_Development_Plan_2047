import { apiClient } from './apiClient';
import type { MapMarker } from '../types/index.type';
import { ENV } from '../config/env';

/**
 * Payload shape expected by the backend /api/pdf/generate endpoint.
 */
export interface PdfMarkerPayload {
  id: string;
  objection_id: string;
  category: string;
  title?: string;
  status?: string;
  tehsil?: string;
  village?: string;
  khasra_no?: string;
  date?: string;
  description?: string;
  applicant_name?: string | null;
  mobile?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface PdfGeneratePayload {
  title: string;
  subtitle: string;
  map_image: string;   // base64 data URL
  markers: PdfMarkerPayload[];
  selectedTehsil: string;
  selectedVillage: string;
  selectedKhasra: string;
}

/**
 * Maps a domain MapMarker to the payload shape expected by the API.
 */
const toPayloadMarker = (m: MapMarker): PdfMarkerPayload => ({
  id: m.id,
  objection_id: m.objectionId,
  category: m.category,
  title: m.title,
  status: m.status,
  tehsil: m.tehsil,
  village: m.village,
  khasra_no: m.khasraNo,
  date: m.date,
  description: m.description,
  applicant_name: m.applicantName ?? null,
  mobile: m.mobile ?? null,
  lat: m.lat ?? null,
  lng: m.lng ?? null,
});

/**
 * Requests the PDF from the backend and triggers the browser download.
 * Returns the downloaded filename for logging / toast display.
 */
export const downloadPdfReport = async (
  payload: PdfGeneratePayload
): Promise<string> => {
  debugger
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
  selectedTehsil: string;
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
    selectedTehsil: params.selectedTehsil,
    selectedVillage: params.selectedVillage,
    selectedKhasra: params.selectedKhasra,
  };

  return downloadPdfReport(payload);
};