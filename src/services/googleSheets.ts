// ============================================
// SERVICIO DE GOOGLE SHEETS
// Lectura usando Google Visualization API (público)
// ============================================

import { GOOGLE_SHEETS_CONFIG } from '@/config';
import type {
  Appointment,
  User,
  Unavailable,
  Setting,
  AppSettings,
  ArchivedAppointment,
  BarberService,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/config';

const { SPREADSHEET_ID, SHEETS } = GOOGLE_SHEETS_CONFIG;

/**
 * URL base para Google Visualization API (no requiere API Key)
 */
function getVisualizationUrl(sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

/**
 * Parsea la respuesta de Google Visualization API
 */
function parseVisualizationResponse<T>(text: string): T[] {
  try {
    // Remover el wrapper de JSONP: /*O_o*/google.visualization.Query.setResponse({...});
    const jsonStr = text.replace(/^[^{]*/, '').replace(/\);?\s*$/, '');
    const data = JSON.parse(jsonStr);

    if (!data.table || !data.table.rows || data.table.rows.length === 0) {
      return [];
    }

    const cols = data.table.cols;
    const rows = data.table.rows;

    // Obtener headers de las columnas
    const headers = cols.map((col: { label: string; id: string }) => col.label || col.id);

    // Convertir filas a objetos
    return rows.map((row: { c: Array<{ v: unknown; f?: string } | null> }) => {
      const obj: Record<string, unknown> = {};

      row.c.forEach((cell, index) => {
        const header = headers[index];
        if (!header) return;

        let value: unknown = cell?.v;

        // Manejar valores nulos
        if (value === null || value === undefined) {
          value = '';
        }
        // Manejar fechas de Google (Date(year,month,day))
        else if (typeof value === 'string' && value.startsWith('Date(')) {
          // Usar el valor formateado si existe
          value = cell?.f || value;
        }

        obj[header] = value;
      });

      return obj as T;
    });
  } catch (error) {
    console.error('Error parsing visualization response:', error);
    return [];
  }
}

/**
 * Lee datos de una hoja usando Google Visualization API
 */
async function readSheet<T>(sheetName: string): Promise<T[]> {
  try {
    const url = getVisualizationUrl(sheetName);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Error reading sheet ${sheetName}:`, response.statusText);
      return [];
    }

    const text = await response.text();
    return parseVisualizationResponse<T>(text);
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    return [];
  }
}

// ============================================
// FUNCIONES DE LECTURA
// ============================================

/**
 * Obtiene todas las citas
 */
export async function getAppointments(): Promise<Appointment[]> {
  return readSheet<Appointment>(SHEETS.APPOINTMENTS);
}

/**
 * Obtiene citas por fecha
 */
export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const appointments = await getAppointments();
  return appointments.filter((apt) => apt.date === date);
}

/**
 * Obtiene citas por barbero
 */
export async function getAppointmentsByBarber(barberId: string): Promise<Appointment[]> {
  const appointments = await getAppointments();
  return appointments.filter((apt) => apt.barber_id === barberId);
}

/**
 * Obtiene citas agendadas (no canceladas ni completadas)
 */
export async function getScheduledAppointments(): Promise<Appointment[]> {
  const appointments = await getAppointments();
  return appointments.filter((apt) => apt.status === 'scheduled');
}

/**
 * Obtiene una cita por ID
 */
export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const appointments = await getAppointments();
  return appointments.find((apt) => apt.id === id) || null;
}

/**
 * Obtiene todos los usuarios
 */
export async function getUsers(): Promise<User[]> {
  return readSheet<User>(SHEETS.USERS);
}

/**
 * Obtiene barberos activos
 */
export async function getBarbers(): Promise<User[]> {
  const users = await getUsers();
  return users.filter((user) => user.role === 'barber' && user.active);
}

/**
 * Obtiene un usuario por ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((user) => user.id === id) || null;
}

/**
 * Obtiene todos los bloqueos de horario
 */
export async function getUnavailable(): Promise<Unavailable[]> {
  return readSheet<Unavailable>(SHEETS.UNAVAILABLE);
}

/**
 * Obtiene bloqueos por barbero
 */
export async function getUnavailableByBarber(barberId: string): Promise<Unavailable[]> {
  const unavailable = await getUnavailable();
  return unavailable.filter((u) => u.barber_id === barberId);
}

/**
 * Convierte un valor de hora de Google Sheets a formato HH:MM
 * Google Sheets almacena horas como decimales (0.375 = 9:00, 0.833 = 20:00)
 */
function parseTimeValue(value: unknown): string {
  if (typeof value === 'string') {
    // Ya es string, verificar formato
    if (/^\d{1,2}:\d{2}$/.test(value)) {
      return value.padStart(5, '0'); // Asegurar formato HH:MM
    }
    return value;
  }

  if (typeof value === 'number') {
    // Convertir decimal a HH:MM
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  return '';
}

/**
 * Obtiene la configuración del sistema
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const settings = await readSheet<Setting>(SHEETS.SETTINGS);

    if (settings.length === 0) {
      return DEFAULT_SETTINGS;
    }

    const result = { ...DEFAULT_SETTINGS };

    settings.forEach((setting) => {
      const key = setting.key;
      const value = setting.value;

      switch (key) {
        case 'slot_interval_min':
        case 'purge_after_days':
        case 'max_book_ahead_days':
          result[key] = typeof value === 'number' ? value : (parseInt(String(value), 10) || result[key]);
          break;
        case 'business_start':
        case 'business_end':
          result[key] = parseTimeValue(value) || result[key];
          break;
        case 'timezone':
          result[key] = String(value) || result[key];
          break;
      }
    });

    return result;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Obtiene servicios disponibles
 */
export async function getServices(): Promise<BarberService[]> {
  const services = await readSheet<BarberService>(SHEETS.SERVICES);
  return services;
}

/**
 * Obtiene citas archivadas
 */
export async function getArchivedAppointments(): Promise<ArchivedAppointment[]> {
  return readSheet<ArchivedAppointment>(SHEETS.ARCHIVE);
}

// ============================================
// NOTA SOBRE ESCRITURA
// ============================================
/**
 * La escritura directa a Google Sheets desde el frontend
 * requiere autenticación OAuth2 o Service Account.
 *
 * Para este proyecto, la escritura se maneja a través de Wulshis
 * que actúa como backend intermediario.
 *
 * Ver: src/services/api.ts para las funciones de escritura
 */

export const googleSheetsService = {
  // Lectura
  getAppointments,
  getAppointmentsByDate,
  getAppointmentsByBarber,
  getScheduledAppointments,
  getAppointmentById,
  getUsers,
  getBarbers,
  getUserById,
  getUnavailable,
  getUnavailableByBarber,
  getSettings,
  getServices,
  getArchivedAppointments,
};

export default googleSheetsService;
