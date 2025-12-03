// ============================================
// HOOK: useAppointments
// Gestión de citas con Google Sheets + Apps Script
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { Appointment, CreateAppointmentPayload, ApiResponse } from '@/types';
import { googleSheetsService, appsScriptApi } from '@/services';
import { cache } from '@/services/cache';

interface UseAppointmentsOptions {
  date?: string;
  barber_id?: string;
  status?: string;
  autoFetch?: boolean;
}

interface UseAppointmentsReturn {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAppointment: (payload: CreateAppointmentPayload) => Promise<ApiResponse<{ success: boolean; id: string }>>;
  cancelAppointment: (id: string) => Promise<ApiResponse<{ success: boolean }>>;
  completeAppointment: (id: string) => Promise<ApiResponse<{ success: boolean }>>;
  deleteAppointment: (id: string) => Promise<ApiResponse<{ success: boolean }>>;
}

export function useAppointments(
  options: UseAppointmentsOptions = {}
): UseAppointmentsReturn {
  const { date, barber_id, status, autoFetch = true } = options;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Leer citas de Google Sheets
      let allAppointments: Appointment[];

      if (date) {
        allAppointments = await googleSheetsService.getAppointmentsByDate(date);
      } else {
        // Si no hay fecha, cargar todas las citas
        allAppointments = await googleSheetsService.getAppointments();
      }

      // Filtrar por barbero si se especifica
      let filtered = allAppointments;
      if (barber_id) {
        filtered = filtered.filter(apt => apt.barber_id === barber_id);
      }
      if (status) {
        filtered = filtered.filter(apt => apt.status === status);
      }

      setAppointments(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [date, barber_id, status]);

  useEffect(() => {
    // Fetch siempre que autoFetch sea true (con o sin date)
    if (autoFetch) {
      fetchAppointments();
    }
  }, [autoFetch, fetchAppointments]);

  const create = useCallback(async (payload: CreateAppointmentPayload) => {
    try {
      // Invalidar caché antes de crear para asegurar validación con datos frescos
      cache.invalidate('appointments');
      
      const response = await appsScriptApi.createAppointment(payload);
      
      // Siempre invalidar caché después de intentar crear (éxito o fallo)
      // Esto asegura que otros usuarios vean los datos actualizados
      googleSheetsService.invalidateAppointmentsCache();
      
      if (response.success) {
        await fetchAppointments();
      }
      return response;
    } catch (err) {
      // Invalidar caché incluso en caso de error
      googleSheetsService.invalidateAppointmentsCache();
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al crear cita',
      };
    }
  }, [fetchAppointments]);

  const cancel = useCallback(async (id: string) => {
    try {
      const response = await appsScriptApi.cancelAppointment(id);
      if (response.success) {
        await fetchAppointments();
      }
      return response;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al cancelar cita',
      };
    }
  }, [fetchAppointments]);

  const complete = useCallback(async (id: string) => {
    try {
      const response = await appsScriptApi.completeAppointment(id);
      if (response.success) {
        await fetchAppointments();
      }
      return response;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al completar cita',
      };
    }
  }, [fetchAppointments]);

  const remove = useCallback(async (id: string) => {
    try {
      const response = await appsScriptApi.deleteRecord('Appointments', id);
      if (response.success) {
        await fetchAppointments();
      }
      return response;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al eliminar cita',
      };
    }
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    createAppointment: create,
    cancelAppointment: cancel,
    completeAppointment: complete,
    deleteAppointment: remove,
  };
}

export default useAppointments;
