// ============================================
// SERVICIO DE APPS SCRIPT (ESCRITURA)
// Maneja todas las operaciones de escritura via Apps Script Web App
// Con invalidación automática de caché después de cada operación
// ============================================

import { GOOGLE_SHEETS_CONFIG } from '@/config';
import {
  invalidateAppointmentsCache,
  invalidateUsersCache,
  invalidateServicesCache,
  invalidateUnavailableCache,
  invalidateSettingsCache
} from './googleSheets';
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

    // Si el resultado tiene un campo 'error', es un error
    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Si el resultado tiene 'success: false', es un error
    if (result.success === false) {
      return {
        success: false,
        error: result.error || 'Error desconocido',
      };
    }

    // Si el resultado tiene 'success: true', devolver los datos directamente
    if (result.success === true) {
      return {
        success: true,
        data: result as T,
      };
    }

    // Si no tiene campo 'success', asumir que es exitoso
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
  const result = await fetchAppsScript<{ success: boolean; id: string }>({
    action: 'createAppointment',
    ...payload,
  });
  if (result.success) {
    invalidateAppointmentsCache();
  }
  return result;
}

/**
 * Actualiza el estado de una cita
 */
export async function updateAppointmentStatus(
  id: string,
  status: 'scheduled' | 'cancelled' | 'done'
): Promise<ApiResponse<{ success: boolean }>> {
  const result = await fetchAppsScript<{ success: boolean }>({
    action: 'updateAppointmentStatus',
    id,
    status,
  });
  if (result.success) {
    invalidateAppointmentsCache();
  }
  return result;
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
  const result = await fetchAppsScript<{ success: boolean; id: string }>({
    action: 'createService',
    name: data.name,
    duration_min: data.duration_min,
    price: data.price,
    description: data.description || '',
    active: data.active !== undefined ? data.active : true,
  });
  
  if (result.success) {
    invalidateServicesCache();
  }
  return result;
}

/**
 * Actualiza un servicio
 */
export async function updateService(
  id: string,
  data: Partial<BarberService>
): Promise<ApiResponse<{ success: boolean }>> {
  // Filtrar campos undefined para no enviarlos
  const payload: Record<string, unknown> = { action: 'updateService', id };
  if (data.name !== undefined) payload.name = data.name;
  if (data.duration_min !== undefined) payload.duration_min = data.duration_min;
  if (data.price !== undefined) payload.price = data.price;
  if (data.description !== undefined) payload.description = data.description;
  if (data.active !== undefined) payload.active = data.active;
  
  const result = await fetchAppsScript<{ success: boolean }>(payload);
  
  if (result.success) {
    invalidateServicesCache();
  }
  return result;
}

/**
 * Elimina un servicio
 */
export async function deleteService(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  const result = await fetchAppsScript<{ success: boolean }>({
    action: 'deleteService',
    id,
  });
  
  if (result.success) {
    invalidateServicesCache();
  }
  return result;
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
  const result = await fetchAppsScript<{ success: boolean; id: string }>({
    action: 'createUser',
    ...data,
  });
  if (result.success) {
    invalidateUsersCache();
  }
  return result;
}

/**
 * Actualiza un usuario
 */
export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<ApiResponse<{ success: boolean }>> {
  const result = await fetchAppsScript<{ success: boolean }>({
    action: 'updateUser',
    id,
    ...data,
  });
  if (result.success) {
    invalidateUsersCache();
  }
  return result;
}

/**
 * Elimina un usuario
 */
export async function deleteUser(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  const result = await fetchAppsScript<{ success: boolean }>({
    action: 'deleteUser',
    id,
  });
  if (result.success) {
    invalidateUsersCache();
  }
  return result;
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
  const result = await fetchAppsScript<{ success: boolean; id: string }>({
    action: 'createUnavailable',
    ...payload,
  });
  if (result.success) {
    invalidateUnavailableCache();
  }
  return result;
}

/**
 * Elimina un bloqueo de horario
 */
export async function deleteUnavailable(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  const result = await fetchAppsScript<{ success: boolean }>({
    action: 'deleteUnavailable',
    id,
  });
  if (result.success) {
    invalidateUnavailableCache();
  }
  return result;
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
  const result = await fetchAppsScript<{ success: boolean }>({
    action: 'updateSetting',
    key,
    value,
  });
  if (result.success) {
    invalidateSettingsCache();
  }
  return result;
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
