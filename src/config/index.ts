// ============================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================

/**
 * Configuración para Google Sheets
 *
 * IMPORTANTE: Para producción, usar variables de entorno
 * y nunca exponer credenciales en el código.
 */
export const GOOGLE_SHEETS_CONFIG = {
  // ID de tu Google Spreadsheet (extraer de la URL)
  // URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
  SPREADSHEET_ID: import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || '1si-B00XnXOeqa0U8cxllij8fhqdBE8Tz3FWHe0H8wDM',

  // API Key para lectura pública (opcional pero recomendado)
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',

  // URL del Web App de Apps Script para escritura
  APPS_SCRIPT_URL: import.meta.env.VITE_APPS_SCRIPT_URL || '',

  // Nombres de las hojas (deben coincidir exactamente con Google Sheets)
  SHEETS: {
    APPOINTMENTS: import.meta.env.VITE_SHEET_APPOINTMENTS || 'Appointments',
    USERS: import.meta.env.VITE_SHEET_USERS || 'Users',
    UNAVAILABLE: import.meta.env.VITE_SHEET_UNAVAILABLE || 'Unavailable',
    SETTINGS: import.meta.env.VITE_SHEET_SETTINGS || 'Settings',
    ARCHIVE: import.meta.env.VITE_SHEET_ARCHIVE || 'Archive',
    SERVICES: import.meta.env.VITE_SHEET_SERVICES || 'Services',
  },
};

/**
 * Configuración de Wulshis (backend)
 */
export const WULSHIS_CONFIG = {
  // URL base de tu instancia Wulshis
  BASE_URL: import.meta.env.VITE_WULSHIS_URL || 'http://localhost:3001',

  // Endpoints
  ENDPOINTS: {
    SLOTS: '/api/slots',
    APPOINTMENTS: '/api/appointments',
    UNAVAILABLE: '/api/unavailable',
    SETTINGS: '/api/settings',
    USERS: '/api/users',
    SERVICES: '/api/services',
  },
};

/**
 * Configuración por defecto del negocio
 */
export const DEFAULT_SETTINGS = {
  slot_interval_min: 15,
  business_start: '09:00',
  business_end: '20:00',
  timezone: 'America/Bogota',
  purge_after_days: 7,
  max_book_ahead_days: 30,
  min_advance_hours: 1,  // Horas mínimas de anticipación para agendar
};

/**
 * Servicios predeterminados de la barbería
 */
export const DEFAULT_SERVICES = [
  { id: '1', name: 'Corte de cabello', duration_min: 30, price: 25000, description: 'Corte clásico o moderno' },
  { id: '2', name: 'Barba', duration_min: 20, price: 15000, description: 'Perfilado y afeitado de barba' },
  { id: '3', name: 'Corte + Barba', duration_min: 45, price: 35000, description: 'Combo completo' },
  { id: '4', name: 'Tinte', duration_min: 60, price: 50000, description: 'Coloración completa' },
  { id: '5', name: 'Diseño de cejas', duration_min: 15, price: 10000, description: 'Perfilado de cejas' },
];

/**
 * Estados de citas con labels
 */
export const APPOINTMENT_STATUS_LABELS = {
  scheduled: { label: 'Agendada', color: 'blue' },
  cancelled: { label: 'Cancelada', color: 'red' },
  done: { label: 'Completada', color: 'green' },
};

/**
 * Roles de usuario con labels
 */
export const USER_ROLE_LABELS = {
  client: { label: 'Cliente', color: 'gray' },
  barber: { label: 'Barbero', color: 'purple' },
  admin: { label: 'Administrador', color: 'orange' },
};
