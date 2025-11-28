// ============================================
// SERVICIO DE APPS SCRIPT (ESCRITURA)
// Maneja todas las operaciones de escritura via Apps Script Web App
// ============================================

import { GOOGLE_SHEETS_CONFIG } from '@/config';
import type {
  CreateAppointmentPayload,
  ApiResponse,
  BarberService,
  User,
} from '@/types';

const APPS_SCRIPT_URL = GOOGLE_SHEETS_CONFIG.APPS_SCRIPT_URL;

/**
 * Verifica si Apps Script está configurado
 */
export function isAppsScriptConfigured(): boolean {
  return Boolean(APPS_SCRIPT_URL && APPS_SCRIPT_URL.length > 0);
}

/**
 * Cliente HTTP para Apps Script
 * Usa GET con parámetros para evitar problemas CORS con POST+redirect
 */
async function fetchAppsScript<T>(
  payload: Record<string, unknown>
): Promise<ApiResponse<T>> {
  if (!isAppsScriptConfigured()) {
    return {
      success: false,
      error: 'Apps Script no está configurado. Configura VITE_APPS_SCRIPT_URL en .env.local',
    };
  }

  try {
    // Codificar payload como parámetro para evitar problemas CORS
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const url = `${APPS_SCRIPT_URL}?payload=${encodedPayload}`;

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });

    const text = await response.text();

    // Intentar parsear como JSON
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `Respuesta inválida del servidor: ${text.substring(0, 100)}`,
      };
    }

    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: result as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión con Apps Script',
    };
  }
}

// ============================================
// OPERACIONES GENÉRICAS (cualquier tabla)
// ============================================

/**
 * Inserta un registro en cualquier tabla
 */
export async function insertRecord<T>(
  sheet: string,
  data: Record<string, unknown>,
  autoId = true
): Promise<ApiResponse<{ success: boolean; id: string; data: T }>> {
  return fetchAppsScript({
    action: 'insert',
    sheet,
    data,
    autoId,
  });
}

/**
 * Actualiza un registro en cualquier tabla
 */
export async function updateRecord(
  sheet: string,
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<{ success: boolean; id: string }>> {
  return fetchAppsScript({
    action: 'update',
    sheet,
    id,
    data,
  });
}

/**
 * Elimina un registro de cualquier tabla
 */
export async function deleteRecord(
  sheet: string,
  id: string
): Promise<ApiResponse<{ success: boolean; id: string }>> {
  return fetchAppsScript({
    action: 'delete',
    sheet,
    id,
  });
}

// ============================================
// APPOINTMENTS - Citas
// ============================================

/**
 * Crea una nueva cita via Apps Script
 */
export async function createAppointment(
  payload: CreateAppointmentPayload
): Promise<ApiResponse<{ success: boolean; id: string }>> {
  return fetchAppsScript({
    action: 'createAppointment',
    ...payload,
  });
}

/**
 * Actualiza el estado de una cita
 */
export async function updateAppointmentStatus(
  id: string,
  status: 'scheduled' | 'cancelled' | 'done'
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchAppsScript({
    action: 'updateAppointmentStatus',
    id,
    status,
  });
}

/**
 * Cancela una cita
 */
export async function cancelAppointment(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  return updateAppointmentStatus(id, 'cancelled');
}

/**
 * Marca una cita como completada
 */
export async function completeAppointment(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  return updateAppointmentStatus(id, 'done');
}

// ============================================
// SERVICES - Servicios
// ============================================

/**
 * Crea un nuevo servicio
 */
export async function createService(
  data: Omit<BarberService, 'id'>
): Promise<ApiResponse<{ success: boolean; id: string }>> {
  return fetchAppsScript({
    action: 'createService',
    ...data,
  });
}

/**
 * Actualiza un servicio
 */
export async function updateService(
  id: string,
  data: Partial<BarberService>
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchAppsScript({
    action: 'updateService',
    id,
    ...data,
  });
}

/**
 * Elimina un servicio
 */
export async function deleteService(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchAppsScript({
    action: 'deleteService',
    id,
  });
}

// ============================================
// USERS - Usuarios/Barberos
// ============================================

/**
 * Crea un nuevo usuario
 */
export async function createUser(
  data: Omit<User, 'id'>
): Promise<ApiResponse<{ success: boolean; id: string }>> {
  return fetchAppsScript({
    action: 'createUser',
    ...data,
  });
}

/**
 * Actualiza un usuario
 */
export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchAppsScript({
    action: 'updateUser',
    id,
    ...data,
  });
}

/**
 * Elimina un usuario
 */
export async function deleteUser(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchAppsScript({
    action: 'deleteUser',
    id,
  });
}

// ============================================
// UNAVAILABLE - Bloqueos de horario
// ============================================

/**
 * Crea un bloqueo de horario
 */
export async function createUnavailable(
  payload: {
    barber_id: string;
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
    full_day: boolean;
    reason?: string;
  }
): Promise<ApiResponse<{ success: boolean; id: string }>> {
  return fetchAppsScript({
    action: 'createUnavailable',
    ...payload,
  });
}

/**
 * Elimina un bloqueo de horario
 */
export async function deleteUnavailable(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchAppsScript({
    action: 'deleteUnavailable',
    id,
  });
}

// ============================================
// SETTINGS - Configuración
// ============================================

/**
 * Actualiza una configuración
 */
export async function updateSetting(
  key: string,
  value: string | number
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchAppsScript({
    action: 'updateSetting',
    key,
    value,
  });
}

// ============================================
// EXPORT
// ============================================

export const appsScriptApi = {
  isConfigured: isAppsScriptConfigured,

  // Genéricos
  insertRecord,
  updateRecord,
  deleteRecord,

  // Appointments
  createAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  completeAppointment,

  // Services
  createService,
  updateService,
  deleteService,

  // Users
  createUser,
  updateUser,
  deleteUser,

  // Unavailable
  createUnavailable,
  deleteUnavailable,

  // Settings
  updateSetting,
};

export default appsScriptApi;
