// ============================================
// HOOK: useSettings
// Gestión de configuración del sistema
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, ApiResponse } from '@/types';
import { googleSheetsService, appsScriptApi } from '@/services';
import { DEFAULT_SETTINGS } from '@/config';

interface UseSettingsReturn {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateSettings: (payload: Partial<AppSettings>) => Promise<ApiResponse<AppSettings>>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Si es un refresh forzado, invalidar el caché primero
      if (forceRefresh) {
        googleSheetsService.invalidateSettingsCache();
      }
      const data = await googleSheetsService.getSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (err) {
      setSettings(DEFAULT_SETTINGS);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const update = useCallback(async (payload: Partial<AppSettings>) => {
    try {
      // Actualizar cada setting individualmente
      for (const [key, value] of Object.entries(payload)) {
        const result = await appsScriptApi.updateSetting(key, String(value));
        if (!result.success) {
          throw new Error(result.error || `Error al actualizar ${key}`);
        }
      }
      setSettings(prev => ({ ...prev, ...payload }));
      return { success: true, data: { ...settings, ...payload } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error' };
    }
  }, [settings]);

  return {
    settings,
    loading,
    error,
    refetch: () => fetchSettings(true),
    updateSettings: update,
  };
}

export default useSettings;
