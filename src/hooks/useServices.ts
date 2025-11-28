// ============================================
// HOOK: useServices
// Gestión de servicios de la barbería
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { BarberService } from '@/types';
import { googleSheetsService } from '@/services';

interface UseServicesReturn {
  services: BarberService[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getServiceById: (id: string) => BarberService | undefined;
  getServiceDuration: (id: string) => number;
}

export function useServices(): UseServicesReturn {
  const [services, setServices] = useState<BarberService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await googleSheetsService.getServices();
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const getServiceById = useCallback((id: string) => {
    return services.find((s) => s.id === id);
  }, [services]);

  const getServiceDuration = useCallback((id: string) => {
    const service = services.find((s) => s.id === id);
    return service?.duration_min || 30;
  }, [services]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
    getServiceById,
    getServiceDuration,
  };
}

export default useServices;
