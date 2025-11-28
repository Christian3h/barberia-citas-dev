// ============================================
// COMPONENTE: DatePicker
// Selector de fecha
// ============================================

import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import './DatePicker.css';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
}: DatePickerProps) {
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  // Normalizar minDate al inicio del día de hoy
  const normalizedMinDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      return min < today ? today : min;
    }
    return today;
  }, [minDate]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    return start.getDay(); // 0 = Domingo
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleSelectDate = (date: Date) => {
    if (disabled) return;

    // Verificar si la fecha está dentro del rango permitido
    const dateNormalized = new Date(date);
    dateNormalized.setHours(0, 0, 0, 0);

    if (dateNormalized < normalizedMinDate) return;
    if (maxDate && dateNormalized > maxDate) return;

    const formatted = format(date, 'yyyy-MM-dd');
    onChange(formatted);
  };

  const isDateDisabled = (date: Date) => {
    const dateNormalized = new Date(date);
    dateNormalized.setHours(0, 0, 0, 0);

    if (dateNormalized < normalizedMinDate) return true;
    if (maxDate && dateNormalized > maxDate) return true;

    // Deshabilitar domingos (opcional)
    if (date.getDay() === 0) return true;

    return false;
  };

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className={`date-picker ${disabled ? 'disabled' : ''}`}>
      <div className="date-picker-header">
        <button
          type="button"
          className="date-picker-nav"
          onClick={handlePrevMonth}
          disabled={disabled}
        >
          ←
        </button>
        <span className="date-picker-month">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <button
          type="button"
          className="date-picker-nav"
          onClick={handleNextMonth}
          disabled={disabled}
        >
          →
        </button>
      </div>

      <div className="date-picker-weekdays">
        {weekDays.map((day) => (
          <span key={day} className="weekday">
            {day}
          </span>
        ))}
      </div>

      <div className="date-picker-days">
        {/* Espacios vacíos para alinear el primer día */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <span key={`empty-${i}`} className="day empty" />
        ))}

        {days.map((date) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isCurrentDay = isToday(date);
          const isDisabled = isDateDisabled(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              className={`day ${isSelected ? 'selected' : ''} ${isCurrentDay ? 'today' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => handleSelectDate(date)}
              disabled={isDisabled || disabled}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DatePicker;
