// ============================================
// HOOK: useBlockedDays
// Gestión de días de la semana bloqueados permanentemente
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { BlockedDay, ApiResponse } from '@/types';
import { googleSheetsService, appsScriptApi } from '@/services';

interface UseBlockedDaysReturn {
  blockedDays: BlockedDay[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateBlockedDays: (barberId: string, blockedDays: string) => Promise<ApiResponse<{ success: boolean }>>;
}

export function useBlockedDays(): UseBlockedDaysReturn {
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockedDays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await googleSheetsService.getBlockedDays();
      setBlockedDays(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedDays();
  }, [fetchBlockedDays]);

  const update = useCallback(async (barberId: string, days: string): Promise<ApiResponse<{ success: boolean }>> => {
    setLoading(true);
    setError(null);
    try {
      const result = await appsScriptApi.updateBlockedDays({ barber_id: barberId, blocked_days: days });
      googleSheetsService.invalidateBlockedDaysCache();
      await fetchBlockedDays();
      setLoading(false);
      if (!result.success) {
        setError(result.error || 'Error actualizando días bloqueados');
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando días bloqueados');
      setLoading(false);
      return { success: false, error: err instanceof Error ? err.message : 'Error' };
    }
  }, [fetchBlockedDays]);

  return {
    blockedDays,
    loading,
    error,
    refetch: fetchBlockedDays,
    updateBlockedDays: update,
  };
}
