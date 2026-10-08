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