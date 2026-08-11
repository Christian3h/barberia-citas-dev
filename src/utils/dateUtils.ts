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
  try {
    if (!dateStr) return new Date(NaN);
    let str = String(dateStr).trim();
    if (str.includes('T')) str = str.split('T')[0];
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const p = str.split('/');
      str = `${p[2]}-${p[1]}-${p[0]}`;
    }
    const parsed = parse(str, 'yyyy-MM-dd', new Date());
    return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
  } catch (e) {
    return new Date(NaN);
  }
}

/**
 * Parsea una hora HH:MM a Date (usando la fecha actual como base)
 */
export function parseTime(timeStr: string, baseDate: Date = new Date()): Date {
  try {
    if (!timeStr) return new Date(NaN);
    const str = String(timeStr).trim();
    const match = str.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return new Date(NaN);
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  } catch (e) {
    return new Date(NaN);
  }
}

/**
 * Combina fecha y hora en un Date
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  try {
    const date = parseDate(dateStr);
    const timeDate = parseTime(timeStr, date);
    return isNaN(timeDate.getTime()) ? date : timeDate;
  } catch (e) {
    return new Date(NaN);
  }
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
 * Verifica si un slot de tiempo colisiona con un rango ocupado
 * 
 * Ejemplo: Si hay una cita de 9:00 a 9:30 (rango ocupado),
 * - Slot 8:45 con duración 15min (termina 9:00) → NO colisiona (termina justo cuando empieza la cita)
 * - Slot 9:00 con duración 15min (termina 9:15) → SÍ colisiona (empieza durante la cita)
 * - Slot 9:15 con duración 15min (termina 9:30) → SÍ colisiona (está dentro de la cita)
 * - Slot 9:30 con duración 15min (termina 9:45) → NO colisiona (empieza justo cuando termina la cita)
 */
export function timeSlotCollides(
  slotTime: string,
  slotDurationMin: number,
  rangeStart: string,
  rangeEnd: string,
  baseDate: Date = new Date()
): boolean {
  try {
    const slotStart = parseTime(slotTime, baseDate);
    const slotEnd = addMinutes(slotStart, slotDurationMin);
    const rStart = parseTime(rangeStart, baseDate);
    let rEnd = parseTime(rangeEnd, baseDate);

    if (isNaN(slotStart.getTime()) || isNaN(rStart.getTime()) || isNaN(rEnd.getTime())) {
      return false;
    }

    // Si la hora de fin es menor o igual a la hora de inicio (ej: 08:40 a 03:00 por error), tratar rEnd como el mismo valor o 23:59
    if (rEnd.getTime() <= rStart.getTime()) {
      rEnd = addMinutes(rStart, 60);
    }

    const slotStartMs = slotStart.getTime();
    const slotEndMs = slotEnd.getTime();
    const rangeStartMs = rStart.getTime();
    const rangeEndMs = rEnd.getTime();

    return slotStartMs < rangeEndMs && slotEndMs > rangeStartMs;
  } catch (e) {
    return false;
  }
}

/**
 * Verifica si una fecha está dentro de un rango de fechas de forma segura.
 * Tolera fechas invertidas (start > end) y formatos no estándar.
 */
export function dateIsInRange(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  try {
    if (!date || !startDate || !endDate) return false;

    const d = parseDate(date);
    let start = parseDate(startDate);
    let end = parseDate(endDate);

    if (isNaN(d.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }

    // Si startDate > endDate (ej. 17/08/2026 a 07/08/2026 por error de tipeo en Sheets), auto-corregir rango
    if (start.getTime() > end.getTime()) {
      const temp = start;
      start = end;
      end = temp;
    }

    // Ajustar fin del día a las 23:59:59 para incluir el día final completo
    end.setHours(23, 59, 59, 999);

    return isWithinInterval(d, { start, end });
  } catch (e) {
    return false;
  }
}

/**
 * Formatea fecha para mostrar al usuario
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    if (!dateStr) return '';
    const date = parseDate(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });
  } catch (e) {
    return dateStr || '';
  }
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

/**
 * Formatea un precio a Pesos Colombianos (COP)
 * Ejemplo: 25000 -> "$ 25.000 COP"
 */
export function formatCOP(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof num !== 'number' || isNaN(num)) return '$ 0 COP';

  const formattedNumber = new Intl.NumberFormat('es-CO', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);

  return `$ ${formattedNumber} COP`;
}
