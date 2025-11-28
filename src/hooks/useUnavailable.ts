// ============================================
// HOOK: useUnavailable
// Gestión de bloqueos de horario
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { Unavailable, CreateUnavailablePayload, ApiResponse } from '@/types';
import { googleSheetsService, appsScriptApi } from '@/services';

interface UseUnavailableOptions {
  barber_id?: string;
  autoFetch?: boolean;
}

interface UseUnavailableReturn {
  unavailable: Unavailable[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createUnavailable: (payload: CreateUnavailablePayload) => Promise<ApiResponse<Unavailable>>;
  deleteUnavailable: (id: string) => Promise<ApiResponse<{ success: boolean }>>;
}

export function useUnavailable(
  options: UseUnavailableOptions = {}
): UseUnavailableReturn {
  const { barber_id, autoFetch = true } = options;

  const [unavailable, setUnavailable] = useState<Unavailable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnavailable = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let data = await googleSheetsService.getUnavailable();
      if (barber_id) {
        data = data.filter(u => u.barber_id === barber_id);
      }
      setUnavailable(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [barber_id]);

  useEffect(() => {
    if (autoFetch) {
      fetchUnavailable();
    }
  }, [autoFetch, fetchUnavailable]);

  const create = useCallback(async (payload: CreateUnavailablePayload): Promise<ApiResponse<Unavailable>> => {
    try {
      await appsScriptApi.createUnavailable(payload);
      await fetchUnavailable();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error' };
    }
  }, [fetchUnavailable]);

  const remove = useCallback(async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    try {
      await appsScriptApi.deleteUnavailable(id);
      await fetchUnavailable();
      return { success: true, data: { success: true } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error' };
    }
  }, [fetchUnavailable]);

  return {
    unavailable,
    loading,
    error,
    refetch: fetchUnavailable,
    createUnavailable: create,
    deleteUnavailable: remove,
  };
}

export default useUnavailable;
