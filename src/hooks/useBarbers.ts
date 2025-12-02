// ============================================
// HOOK: useBarbers
// Gestión de barberos
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { googleSheetsService } from '@/services';

interface UseBarbersReturn {
  barbers: User[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getBarberById: (id: string) => User | undefined;
}

interface UseBarbersOptions {
  includeInactive?: boolean;
}

export function useBarbers(options: UseBarbersOptions = {}): UseBarbersReturn {
  const { includeInactive = false } = options;
  const [barbers, setBarbers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBarbers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = includeInactive 
        ? await googleSheetsService.getAllBarbers()
        : await googleSheetsService.getBarbers();
      setBarbers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar barberos');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  const getBarberById = useCallback((id: string) => {
    return barbers.find((b) => b.id === id);
  }, [barbers]);

  return {
    barbers,
    loading,
    error,
    refetch: fetchBarbers,
    getBarberById,
  };
}

export default useBarbers;
