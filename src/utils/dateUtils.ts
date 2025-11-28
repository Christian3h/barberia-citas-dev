// ============================================
// UTILIDADES DE FECHA Y TIEMPO
// ============================================

import { format, parse, addMinutes, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha a YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formatea una hora a HH:MM
 */
export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

/**
 * Formatea fecha y hora a ISO string
 */
export function formatDateTimeISO(date: Date): string {
  return date.toISOString();
}

/**
 * Parsea una fecha YYYY-MM-DD a Date
 */
export function parseDate(dateStr: string): Date {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
}

/**
 * Parsea una hora HH:MM a Date (usando la fecha actual como base)
 */
export function parseTime(timeStr: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Combina fecha y hora en un Date
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const date = parseDate(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Genera slots de tiempo entre dos horas
 * @param startTime - Hora inicio "HH:MM"
 * @param endTime - Hora fin "HH:MM"
 * @param intervalMin - Intervalo en minutos
 * @returns Array de horas ["09:00", "09:15", ...]
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMin: number
): string[] {
  const slots: string[] = [];
  const baseDate = new Date();

  let current = parseTime(startTime, baseDate);
  const end = parseTime(endTime, baseDate);

  while (isBefore(current, end) || current.getTime() === end.getTime()) {
    slots.push(formatTime(current));
    current = addMinutes(current, intervalMin);

    // Evitar bucle infinito
    if (slots.length > 200) break;
  }

  // Remover el último slot si es exactamente la hora de cierre
  // (no se puede empezar una cita a la hora de cierre)
  if (slots.length > 0 && slots[slots.length - 1] === endTime) {
    slots.pop();
  }

  return slots;
}

/**
 * Verifica si un slot de tiempo colisiona con un rango
 */
export function timeSlotCollides(
  slotTime: string,
  slotDurationMin: number,
  rangeStart: string,
  rangeEnd: string,
  baseDate: Date = new Date()
): boolean {
  const slotStart = parseTime(slotTime, baseDate);
  const slotEnd = addMinutes(slotStart, slotDurationMin);
  const rStart = parseTime(rangeStart, baseDate);
  const rEnd = parseTime(rangeEnd, baseDate);

  // Colisión si: slotStart < rangeEnd AND slotEnd > rangeStart
  return isBefore(slotStart, rEnd) && isAfter(slotEnd, rStart);
}

/**
 * Verifica si una fecha está dentro de un rango de fechas
 */
export function dateIsInRange(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  const d = parseDate(date);
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  return isWithinInterval(d, { start, end });
}

/**
 * Formatea fecha para mostrar al usuario
 */
export function formatDisplayDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });
}

/**
 * Formatea fecha corta para tablas
 * Maneja valores inválidos de forma segura
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return '-';
  }

  try {
    // Si viene en formato Date(year,month,day) de Google Sheets
    if (dateStr.startsWith('Date(')) {
      const match = dateStr.match(/Date\((\d+),(\d+),(\d+)/);
      if (match) {
        const year = match[1];
        const month = String(Number(match[2]) + 1).padStart(2, '0');
        const day = String(match[3]).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
    }

    const date = parseDate(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr; // Devolver el valor original si no se puede parsear
    }
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch {
    return dateStr || '-';
  }
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
export function getTodayString(): string {
  return formatDate(new Date());
}

/**
 * Añade días a una fecha
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Compara dos fechas (solo fecha, sin hora)
 * @returns -1 si a < b, 0 si a == b, 1 si a > b
 */
export function compareDates(a: string, b: string): number {
  const dateA = parseDate(a);
  const dateB = parseDate(b);

  if (isBefore(dateA, dateB)) return -1;
  if (isAfter(dateA, dateB)) return 1;
  return 0;
}

/**
 * Verifica si una fecha es pasada
 */
export function isPastDate(dateStr: string): boolean {
  return compareDates(dateStr, getTodayString()) < 0;
}

/**
 * Calcula la hora de fin dado un inicio y duración
 */
export function calculateEndTime(startTime: string, durationMin: number): string {
  const start = parseTime(startTime);
  const end = addMinutes(start, durationMin);
  return formatTime(end);
}

/**
 * Convierte minutos a formato legible
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}min`;
}
