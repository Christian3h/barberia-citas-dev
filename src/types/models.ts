// ============================================
// MODELOS DEL SISTEMA DE AGENDAMIENTO
// Corresponden a las hojas de Google Sheets
// ============================================

/** Estado de una cita */
export type AppointmentStatus = 'scheduled' | 'cancelled' | 'done';

/** Roles de usuario */
export type UserRole = 'client' | 'barber' | 'admin';

/**
 * Tabla: Appointments (Citas)
 * Hoja: Appointments
 */
export interface Appointment {
  id: string;                    // uuid
  created_at: string;            // ISO datetime
  date: string;                  // YYYY-MM-DD
  time: string;                  // HH:MM
  datetime_iso: string;          // ISO datetime completo
  duration_min: number;          // Duración en minutos
  customer_name: string;
  phone: string;
  email: string;
  service_name: string;
  barber_id: string;
  status: AppointmentStatus;
  notes?: string;
}

/**
 * Tabla: Users (Clientes y Barberos)
 * Hoja: Users
 */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  active: boolean;
}

/**
 * Tabla: Unavailable (Días/horarios bloqueados)
 * Hoja: Unavailable
 */
export interface Unavailable {
  id: string;
  barber_id: string;
  start_date: string;            // YYYY-MM-DD
  end_date: string;              // YYYY-MM-DD
  start_time?: string;           // HH:MM (opcional si full_day=true)
  end_time?: string;             // HH:MM (opcional si full_day=true)
  full_day: boolean;
  reason?: string;
}

/**
 * Claves de configuración del sistema
 */
export type SettingKey =
  | 'slot_interval_min'
  | 'business_start'
  | 'business_end'
  | 'timezone'
  | 'purge_after_days'
  | 'max_book_ahead_days'
  | 'min_advance_hours'
  | 'admin_pin'
  | 'business_name'
  | 'working_days';

/**
 * Tabla: Settings (Configuración)
 * Hoja: Settings (key -> value)
 */
export interface Setting {
  key: SettingKey;
  value: string | number;
}

/**
 * Settings parseados para uso en la app
 */
export interface AppSettings {
  slot_interval_min: number;     // default: 15
  business_start: string;        // default: "09:00"
  business_end: string;          // default: "20:00"
  timezone: string;              // default: "America/Bogota"
  purge_after_days: number;      // default: 7
  max_book_ahead_days: number;   // default: 30
  min_advance_hours: number;     // default: 1 - Horas mínimas de anticipación
  admin_pin?: string;            // PIN para acceso admin
  business_name?: string;        // Nombre del negocio
  working_days?: string;         // "1,2,3,4,5,6" días laborales
}

/**
 * Tabla: Archive (Citas archivadas)
 * Hoja: Archive - Mismo esquema que Appointments
 */
export type ArchivedAppointment = Appointment;

// ============================================
// TIPOS PARA SERVICIOS Y API
// ============================================

/** Servicios disponibles en la barbería */
export interface BarberService {
  id: string;
  name: string;
  duration_min: number;
  price: number;
  description?: string;
  active?: boolean;              // Estado activo/inactivo
}

/** Parámetros para obtener slots disponibles */
export interface GetSlotsParams {
  date: string;                  // YYYY-MM-DD
  barber_id: string;
  duration_min: number;
}

/** Payload para crear una cita */
export interface CreateAppointmentPayload {
  date: string;
  time: string;
  duration_min: number;
  customer_name: string;
  phone: string;
  email: string;
  service_name: string;
  barber_id: string;
  notes?: string;
}

/** Payload para crear bloqueo de horario */
export interface CreateUnavailablePayload {
  barber_id: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  full_day: boolean;
  reason?: string;
}

/** Respuesta genérica de la API */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Slot de tiempo disponible */
export interface TimeSlot {
  time: string;                  // HH:MM
  available: boolean;
}
