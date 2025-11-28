// ============================================
// SERVICIO DE API (WULSHIS BACKEND)
// Maneja todas las operaciones CRUD
// ============================================

import { WULSHIS_CONFIG } from '@/config';
import type {
  Appointment,
  User,
  Unavailable,
  AppSettings,
  BarberService,
  CreateAppointmentPayload,
  CreateUnavailablePayload,
  ApiResponse,
  GetSlotsParams,
} from '@/types';

const { BASE_URL, ENDPOINTS } = WULSHIS_CONFIG;

/**
 * Cliente HTTP base
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || 'Error en la solicitud',
      };
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

// ============================================
// SLOTS - Horarios disponibles
// ============================================

/**
 * GET /slots
 * Obtiene slots disponibles para una fecha, barbero y duración
 */
export async function getAvailableSlots(
  params: GetSlotsParams
): Promise<ApiResponse<string[]>> {
  const query = new URLSearchParams({
    date: params.date,
    barber_id: params.barber_id,
    duration_min: params.duration_min.toString(),
  });

  return fetchApi<string[]>(`${ENDPOINTS.SLOTS}?${query}`);
}

// ============================================
// APPOINTMENTS - Citas
// ============================================

/**
 * GET /appointments
 * Obtiene todas las citas o filtra por parámetros
 */
export async function getAppointments(filters?: {
  date?: string;
  barber_id?: string;
  status?: string;
}): Promise<ApiResponse<Appointment[]>> {
  let endpoint = ENDPOINTS.APPOINTMENTS;

  if (filters) {
    const query = new URLSearchParams();
    if (filters.date) query.set('date', filters.date);
    if (filters.barber_id) query.set('barber_id', filters.barber_id);
    if (filters.status) query.set('status', filters.status);

    if (query.toString()) {
      endpoint += `?${query}`;
    }
  }

  return fetchApi<Appointment[]>(endpoint);
}

/**
 * GET /appointments/:id
 * Obtiene una cita por ID
 */
export async function getAppointmentById(
  id: string
): Promise<ApiResponse<Appointment>> {
  return fetchApi<Appointment>(`${ENDPOINTS.APPOINTMENTS}/${id}`);
}

/**
 * POST /appointments
 * Crea una nueva cita
 */
export async function createAppointment(
  payload: CreateAppointmentPayload
): Promise<ApiResponse<Appointment>> {
  return fetchApi<Appointment>(ENDPOINTS.APPOINTMENTS, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * PATCH /appointments/:id
 * Actualiza una cita existente
 */
export async function updateAppointment(
  id: string,
  payload: Partial<Appointment>
): Promise<ApiResponse<Appointment>> {
  return fetchApi<Appointment>(`${ENDPOINTS.APPOINTMENTS}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * DELETE /appointments/:id
 * Cancela/elimina una cita
 */
export async function deleteAppointment(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchApi<{ success: boolean }>(`${ENDPOINTS.APPOINTMENTS}/${id}`, {
    method: 'DELETE',
  });
}

/**
 * PATCH /appointments/:id/cancel
 * Cambia el estado de una cita a cancelada
 */
export async function cancelAppointment(
  id: string
): Promise<ApiResponse<Appointment>> {
  return updateAppointment(id, { status: 'cancelled' });
}

/**
 * PATCH /appointments/:id/complete
 * Cambia el estado de una cita a completada
 */
export async function completeAppointment(
  id: string
): Promise<ApiResponse<Appointment>> {
  return updateAppointment(id, { status: 'done' });
}

// ============================================
// UNAVAILABLE - Bloqueos de horario
// ============================================

/**
 * GET /unavailable
 * Obtiene todos los bloqueos de horario
 */
export async function getUnavailable(filters?: {
  barber_id?: string;
}): Promise<ApiResponse<Unavailable[]>> {
  let endpoint = ENDPOINTS.UNAVAILABLE;

  if (filters?.barber_id) {
    endpoint += `?barber_id=${filters.barber_id}`;
  }

  return fetchApi<Unavailable[]>(endpoint);
}

/**
 * POST /unavailable
 * Crea un nuevo bloqueo de horario
 */
export async function createUnavailable(
  payload: CreateUnavailablePayload
): Promise<ApiResponse<Unavailable>> {
  return fetchApi<Unavailable>(ENDPOINTS.UNAVAILABLE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * DELETE /unavailable/:id
 * Elimina un bloqueo de horario
 */
export async function deleteUnavailable(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchApi<{ success: boolean }>(`${ENDPOINTS.UNAVAILABLE}/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// SETTINGS - Configuración
// ============================================

/**
 * GET /settings
 * Obtiene la configuración del sistema
 */
export async function getSettings(): Promise<ApiResponse<AppSettings>> {
  return fetchApi<AppSettings>(ENDPOINTS.SETTINGS);
}

/**
 * PATCH /settings
 * Actualiza la configuración del sistema
 */
export async function updateSettings(
  payload: Partial<AppSettings>
): Promise<ApiResponse<AppSettings>> {
  return fetchApi<AppSettings>(ENDPOINTS.SETTINGS, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ============================================
// USERS - Usuarios
// ============================================

/**
 * GET /users
 * Obtiene todos los usuarios
 */
export async function getUsers(filters?: {
  role?: string;
  active?: boolean;
}): Promise<ApiResponse<User[]>> {
  let endpoint = ENDPOINTS.USERS;

  if (filters) {
    const query = new URLSearchParams();
    if (filters.role) query.set('role', filters.role);
    if (filters.active !== undefined) query.set('active', String(filters.active));

    if (query.toString()) {
      endpoint += `?${query}`;
    }
  }

  return fetchApi<User[]>(endpoint);
}

/**
 * GET /users/barbers
 * Obtiene solo barberos activos
 */
export async function getBarbers(): Promise<ApiResponse<User[]>> {
  return getUsers({ role: 'barber', active: true });
}

// ============================================
// SERVICES - Servicios de la barbería
// ============================================

/**
 * GET /services
 * Obtiene los servicios disponibles
 */
export async function getServices(): Promise<ApiResponse<BarberService[]>> {
  return fetchApi<BarberService[]>(ENDPOINTS.SERVICES);
}

// ============================================
// EXPORT
// ============================================

export const api = {
  // Slots
  getAvailableSlots,

  // Appointments
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  cancelAppointment,
  completeAppointment,

  // Unavailable
  getUnavailable,
  createUnavailable,
  deleteUnavailable,

  // Settings
  getSettings,
  updateSettings,

  // Users
  getUsers,
  getBarbers,

  // Services
  getServices,
};

export default api;
