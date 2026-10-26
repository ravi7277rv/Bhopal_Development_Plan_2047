/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_LOGIN_ENDPOINT: string;
  readonly VITE_FORCE_LOGOUT_ENDPOINT: string;
  readonly VITE_LOGOUT_ENDPOINT: string;
  readonly VITE_OBJECTIONHISTORY_ENDPOINT: string;
  readonly VITE_PDF_REPORT_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.geojson.gz" {
  const sourceUrl: string;
  export default sourceUrl;
}

declare module "*.geojson.gz?url" {
  const sourceUrl: string;
  export default sourceUrl;
}