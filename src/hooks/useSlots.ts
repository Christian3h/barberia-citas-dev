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
}

interface UseSlotsReturn {
  slots: string[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchSlots: (params: GetSlotsParams) => Promise<string[]>;
}

export function useSlots(options: UseSlotsOptions = {}): UseSlotsReturn {
  const { date, barber_id, duration_min = 30, autoFetch = false } = options;

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
      // Obtener datos de Google Sheets
      const [appointments, unavailable, settings] = await Promise.all([
        googleSheetsService.getAppointmentsByDate(fetchParams.date),
        googleSheetsService.getUnavailableByBarber(fetchParams.barber_id),
        googleSheetsService.getSettings(),
      ]);

      // Calcular slots disponibles localmente
      const availableSlots = getAvailableSlots(
        fetchParams,
        settings,
        appointments,
        unavailable
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

  useEffect(() => {
    if (autoFetch && date && barber_id) {
      fetchAvailableSlots();
    }
  }, [autoFetch, date, barber_id, fetchAvailableSlots]);

  return {
    slots,
    loading,
    error,
    refetch: async () => { await fetchAvailableSlots(); },
    fetchSlots: fetchAvailableSlots,
  };
}

export default useSlots;
