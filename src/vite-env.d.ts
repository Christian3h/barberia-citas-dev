/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SPREADSHEET_ID: string;
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_WULSHIS_URL: string;
  readonly VITE_SHEET_APPOINTMENTS: string;
  readonly VITE_SHEET_USERS: string;
  readonly VITE_SHEET_UNAVAILABLE: string;
  readonly VITE_SHEET_SETTINGS: string;
  readonly VITE_SHEET_ARCHIVE: string;
  readonly VITE_SHEET_SERVICES: string;
  readonly VITE_APPS_SCRIPT_URL: string;
  readonly VITE_WULSHIS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
