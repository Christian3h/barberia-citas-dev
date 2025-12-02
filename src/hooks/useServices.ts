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
  allServices: BarberService[]; // Incluye servicios inactivos (para admin)
}

export function useServices(): UseServicesReturn {
  const [allServices, setAllServices] = useState<BarberService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await googleSheetsService.getServices();
      setAllServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Filtrar solo servicios activos para la vista pública
  const services = allServices.filter((s) => s.active !== false);

  const getServiceById = useCallback((id: string) => {
    return allServices.find((s) => s.id === id);
  }, [allServices]);

  const getServiceDuration = useCallback((id: string) => {
    const service = allServices.find((s) => s.id === id);
    return service?.duration_min || 30;
  }, [allServices]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
    getServiceById,
    getServiceDuration,
    allServices,
  };
}

export default useServices;
