// ============================================
// COMPONENTE: TimeSlotPicker
// Selector de horarios disponibles
// ============================================

import { useSlots } from '@/hooks';
import './TimeSlotPicker.css';

interface TimeSlotPickerProps {
  date: string;
  barberId: string;
  durationMin: number;
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  error?: string;
}

export function TimeSlotPicker({
  date,
  barberId,
  durationMin,
  value,
  onChange,
  disabled = false,
  error,
}: TimeSlotPickerProps) {
  const { slots, loading, error: fetchError } = useSlots({
    date,
    barber_id: barberId,
    duration_min: durationMin,
    autoFetch: !!(date && barberId),
  });

  if (!date || !barberId) {
    return (
      <div className="time-slot-picker-message">
        Selecciona una fecha y un barbero para ver los horarios disponibles
      </div>
    );
  }

  if (loading) {
    return (
      <div className="time-slot-picker-loading">
        <div className="spinner" />
        <span>Cargando horarios...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="time-slot-picker-error">
        Error al cargar horarios: {fetchError}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="time-slot-picker-empty">
        No hay horarios disponibles para esta fecha
      </div>
    );
  }

  return (
  <div className="time-slot-picker">
    <label className="time-slot-picker-label">
      Horarios disponibles ({slots.length})
    </label>
    <div className="time-slots">
     {slots.map((time) => (
        <button
          key={time}
          type="button"
          className={`time-slot ${value === time ? 'selected' : ''} ${error ? 'has-error' : ''}`}
          onClick={() => onChange(time)}
          disabled={disabled}
        >
          <span>{time}</span>
        </button>
      ))}
    </div>
    {error && <span className="field-error">⚠ {error}</span>}
  </div>
  );
}

export default TimeSlotPicker;