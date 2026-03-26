// ============================================
// HOOK: useSlots
// Gestión de slots disponibles
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { GetSlotsParams } from '@/types';
import { getAvailableSlots } from '@/services/slots';
import { googleSheetsService } from '@/services';

interface UseSlotsOptions {
  date?: string;
  barber_id?: string;
  duration_min?: number;
  autoFetch?: boolean;
  /** Intervalo de polling en ms. Por defecto 15000 (15s). Usar 0 para desactivar. */
  pollingInterval?: number;
}

interface UseSlotsReturn {
  slots: string[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchSlots: (params: GetSlotsParams) => Promise<string[]>;
}

export function useSlots(options: UseSlotsOptions = {}): UseSlotsReturn {
  const { date, barber_id, duration_min = 30, autoFetch = false, pollingInterval = 15000 } = options;

  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableSlots = useCallback(async (params?: GetSlotsParams) => {
    const fetchParams = params || {
      date: date || '',
      barber_id: barber_id || '',
      duration_min,
    };

    if (!fetchParams.date || !fetchParams.barber_id) {
      setSlots([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // Invalidar caché antes de obtener para asegurar datos frescos
      googleSheetsService.invalidateAppointmentsCache();
      // Forzar lectura fresca de días bloqueados (importante para que se actualice inmediatamente)
      googleSheetsService.invalidateBlockedDaysCache();
      
      // Obtener datos de Google Sheets
      const [appointments, unavailable, settings] = await Promise.all([
        googleSheetsService.getAppointmentsByDate(fetchParams.date),
        googleSheetsService.getUnavailableByBarber(fetchParams.barber_id),
        googleSheetsService.getSettings(),
      ]);

      // Intentar obtener días bloqueados de forma segura (sin romper todo si falla)
      let blockedDay = null;
      try {
        // Verificar si la función existe antes de llamarla
        if (typeof googleSheetsService.getBlockedDaysByBarber === 'function') {
          blockedDay = await googleSheetsService.getBlockedDaysByBarber(fetchParams.barber_id);
        }
      } catch (e) {
        console.warn('Error fetching blocked days:', e);
        // Continuamos sin bloqueo semanal si falla
      }

      // Calcular slots disponibles localmente
      const availableSlots = getAvailableSlots(
        fetchParams,
        settings,
        appointments,
        unavailable,
        blockedDay
      );

      setSlots(availableSlots);
      return availableSlots;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return [];
    } finally {
      setLoading(false);
    }
  }, [date, barber_id, duration_min]);

  // Effect para refetch automático cuando cambian los parámetros
  useEffect(() => {
    if (autoFetch && date && barber_id) {
      fetchAvailableSlots();
    }
  }, [autoFetch, date, barber_id, duration_min, fetchAvailableSlots]);

  // Polling para refrescar slots periódicamente
  useEffect(() => {
    if (!pollingInterval || pollingInterval <= 0 || !date || !barber_id) {
      return;
    }

    const intervalId = setInterval(() => {
      // Invalidar caché antes de refetch para obtener datos frescos
      googleSheetsService.invalidateAppointmentsCache();
      fetchAvailableSlots();
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [pollingInterval, date, barber_id, fetchAvailableSlots]);

  return {
    slots,
    loading,
    error,
    refetch: async () => { await fetchAvailableSlots(); },
    fetchSlots: fetchAvailableSlots,
  };
}

export default useSlots;
