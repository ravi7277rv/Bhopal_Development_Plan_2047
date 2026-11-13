import type { MapMarker } from "../types/index.type";

type ExcelExportOptions = {
  filename?: string;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const exportColumns: Array<{ header: string; value: (marker: MapMarker) => unknown }> = [
  { header: "Objection ID/Appati Id", value: (marker) => marker.objectionId },
  { header: "Code", value: (marker) => marker.code },
  { header: "Area", value: (marker) => marker.area },
  { header: "BHU Code", value: (marker) => marker.bhucode },
  { header: "Village", value: (marker) => marker.village },
  { header: "Khasra No", value: (marker) => marker.khasraNo },
  { header: "Government/Khasra", value: (marker) => marker.govKh },
  { header: "Object Type", value: (marker) => marker.objectType },
  { header: "Apatti Group", value: (marker) => marker.apattiGro },
  { header: "Vargikaran", value: (marker) => marker.vargikaran },
  { header: "Upvargikaran", value: (marker) => marker.upvargikar },
  { header: "Remark", value: (marker) => marker.remark },
  { header: "Officer 1", value: (marker) => marker.officer1 },
  { header: "Officer 2", value: (marker) => marker.officer2 },
  { header: "Officer 3", value: (marker) => marker.officer3 },
];

/** Exports any marker collection as an Excel-compatible .xls file. */
export const exportMarkersToExcel = (
  markers: MapMarker[],
  options: ExcelExportOptions = {},
): void => {
  if (!markers.length) return;

  const header = exportColumns
    .map(({ header: label }) => `<th>${escapeHtml(label)}</th>`)
    .join("");
  const rows = markers
    .map(
      (marker) =>
        `<tr>${exportColumns
          .map(({ value }) => `<td>${escapeHtml(value(marker))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8" /></head>
      <body><table border="1"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></body>
    </html>`;

  const blob = new Blob(["\ufeff", workbook], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.filename ?? "objections.xls";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
