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
  error?: string;
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  error,
}: DatePickerProps) {
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

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
    return startOfMonth(currentMonth).getDay();
  }, [currentMonth]);

  const handleSelectDate = (date: Date) => {
    if (disabled) return;
    const dateNormalized = new Date(date);
    dateNormalized.setHours(0, 0, 0, 0);
    if (dateNormalized < normalizedMinDate) return;
    if (maxDate && dateNormalized > maxDate) return;
    onChange(format(date, 'yyyy-MM-dd'));
  };

  const isDateDisabled = (date: Date) => {
    const dateNormalized = new Date(date);
    dateNormalized.setHours(0, 0, 0, 0);
    if (dateNormalized < normalizedMinDate) return true;
    if (maxDate && dateNormalized > maxDate) return true;
    if (date.getDay() === 0) return true;
    return false;
  };

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className={`date-picker ${disabled ? 'disabled' : ''} ${error ? 'has-error' : ''}`}>
      <div className="date-picker-header">
        <button
          type="button"
          className="date-picker-nav"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
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
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={disabled}
        >
          →
        </button>
      </div>

      <div className="date-picker-weekdays">
        {weekDays.map((day) => (
          <span key={day} className="weekday">{day}</span>
        ))}
      </div>

      <div className="date-picker-days">
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

      {error && <span className="field-error">⚠ {error}</span>}
    </div>
  );
}

export default DatePicker;