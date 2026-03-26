import { useState, useEffect, useRef } from 'react';
import type { User, BlockedDay } from '@/types';
import './BlockedDaysManager.css';

const WEEK_DAYS = [
  { id: '1', label: 'Lunes' },
  { id: '2', label: 'Martes' },
  { id: '3', label: 'Miércoles' },
  { id: '4', label: 'Jueves' },
  { id: '5', label: 'Viernes' },
  { id: '6', label: 'Sábado' },
  { id: '7', label: 'Domingo' },
];

interface BlockedDaysManagerProps {
  barbers: User[];
  blockedDays: BlockedDay[];
  onUpdate: (barberId: string, blockedDays: string) => Promise<any>;
  loading: boolean;
  error?: string;
}

export function BlockedDaysManager({
  barbers,
  blockedDays,
  onUpdate,
  loading,
  error
}: BlockedDaysManagerProps) {
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [localSelectedDays, setLocalSelectedDays] = useState<Set<string>>(new Set());
  const [optimisticChange, setOptimisticChange] = useState<{ old: Set<string>; next: Set<string> } | null>(null);
  const lastGoodDays = useRef<Set<string>>(new Set());
  const isMounted = useRef(false);

  useEffect(() => {
    if (barbers.length > 0 && !selectedBarber) {
      setSelectedBarber(barbers[0].id);
    }
  }, [barbers, selectedBarber]);

  useEffect(() => {
    if (!selectedBarber || !isMounted.current) {
      isMounted.current = true;
      return;
    }

    if (optimisticChange) {
      return;
    }

    const currentBlocked = blockedDays.find(b => {
      const barberIdStr = String(b.barber_id || '').trim();
      const selectedStr = String(selectedBarber).trim();
      return barberIdStr === selectedStr;
    });

    let daySet = new Set<string>();
    if (currentBlocked && currentBlocked.blocked_days) {
      const blockedStr = String(currentBlocked.blocked_days).trim();
      if (blockedStr) {
        daySet = new Set(blockedStr.split(',').map(d => d.trim()).filter(Boolean));
      }
    }

    setLocalSelectedDays(daySet);
    lastGoodDays.current = new Set(daySet);
  }, [selectedBarber, blockedDays, optimisticChange]);

  useEffect(() => {
    if (!loading && optimisticChange) {
      if (error) {
        setLocalSelectedDays(new Set(optimisticChange.old));
      }
      setOptimisticChange(null);
    }
  }, [loading, error, optimisticChange]);

  const handleDayToggle = async (dayId: string) => {
    if (loading || !selectedBarber) return;

    const newSelectedDays = new Set(localSelectedDays);
    if (newSelectedDays.has(dayId)) {
      newSelectedDays.delete(dayId);
    } else {
      newSelectedDays.add(dayId);
    }

    setOptimisticChange({ old: new Set(localSelectedDays), next: new Set(newSelectedDays) });
    setLocalSelectedDays(newSelectedDays);

    const blockedStr = Array.from(newSelectedDays).join(',');
    
    await onUpdate(selectedBarber, blockedStr);
  };

  return (
    <div className="blocked-days-manager card">
      <h3>Bloqueo Permanente de Días</h3>
      <p>Selecciona los días de la semana que un barbero no trabajará de forma indefinida.</p>
      {!!error && <p style={{ color: 'red' }}>Error al guardar: {error}</p>}
      <div className="form-group">
        <label htmlFor="barber-select-blocked">Barbero</label>
        <select
          id="barber-select-blocked"
          value={selectedBarber}
          onChange={e => {
            setSelectedBarber(e.target.value);
            setOptimisticChange(null);
          }}
          disabled={loading}
        >
          <option value="">Seleccionar barbero</option>
          {barbers.map(barber => (
            <option key={barber.id} value={barber.id}>{barber.name}</option>
          ))}
        </select>
      </div>
      <div className="day-selector">
        {WEEK_DAYS.map(day => (
          <button
            key={day.id}
            className={`day-toggle ${localSelectedDays.has(day.id) ? 'selected' : ''}`}
            onClick={() => handleDayToggle(day.id)}
            disabled={loading || !selectedBarber}
          >
            {day.label}
          </button>
        ))}
      </div>
      {loading && <p>Guardando...</p>}
    </div>
  );
}