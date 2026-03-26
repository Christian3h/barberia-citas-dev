import { useState, useEffect } from 'react';
import type { Barber, BlockedDay } from '@/types';
import './BlockedDaysManager.css';

const WEEK_DAYS = [
  { id: '1', label: 'L' },
  { id: '2', label: 'M' },
  { id: '3', label: 'X' },
  { id: '4', label: 'J' },
  { id: '5', label: 'V' },
  { id: '6', label: 'S' },
  { id: '7', label: 'D' },
];

interface BlockedDaysManagerProps {
  barbers: Barber[];
  blockedDays: BlockedDay[];
  onUpdate: (barberId: string, blockedDays: string) => Promise<any>;
  loading: boolean;
}

export function BlockedDaysManager({ barbers, blockedDays, onUpdate, loading }: BlockedDaysManagerProps) {
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (barbers.length > 0) {
      setSelectedBarber(barbers[0].id);
    }
  }, [barbers]);

  useEffect(() => {
    const currentBlocked = blockedDays.find(b => b.barber_id === selectedBarber);
    let daySet = new Set<string>();
    
    if (currentBlocked) {
      // Asegurar que blocked_days es un string antes de hacer split
      const blockedStr = String(currentBlocked.blocked_days || '');
      daySet = new Set(blockedStr.split(',').map(d => d.trim()).filter(Boolean));
    }
    
    setSelectedDays(daySet);
  }, [selectedBarber, blockedDays]);

  const handleDayToggle = (dayId: string) => {
    const newSelectedDays = new Set(selectedDays);
    if (newSelectedDays.has(dayId)) {
      newSelectedDays.delete(dayId);
    } else {
      newSelectedDays.add(dayId);
    }
    setSelectedDays(newSelectedDays);
    const blockedStr = Array.from(newSelectedDays).join(',');
    console.log('🔐 BlockedDaysManager: Guardando bloqueo', { barber_id: selectedBarber, blocked_days: blockedStr, dayToggled: dayId });
    onUpdate(selectedBarber, blockedStr);
  };

  return (
    <div className="blocked-days-manager card">
      <h3>Bloqueo Permanente de Días</h3>
      <p>Selecciona los días de la semana que un barbero no trabajará de forma indefinida.</p>
      
      <div className="form-group">
        <label htmlFor="barber-select-blocked">Barbero</label>
        <select
          id="barber-select-blocked"
          value={selectedBarber}
          onChange={(e) => setSelectedBarber(e.target.value)}
          disabled={loading}
        >
          {barbers.map(barber => (
            <option key={barber.id} value={barber.id}>{barber.name}</option>
          ))}
        </select>
      </div>

      <div className="day-selector">
        {WEEK_DAYS.map(day => (
          <button
            key={day.id}
            className={`day-toggle ${selectedDays.has(day.id) ? 'selected' : ''}`}
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
