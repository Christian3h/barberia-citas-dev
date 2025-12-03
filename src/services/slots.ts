// ============================================
// LÓGICA DE NEGOCIO - SLOTS DISPONIBLES
// ============================================

import type {
  Appointment,
  Unavailable,
  AppSettings,
  GetSlotsParams,
} from '@/types';
import {
  generateTimeSlots,
  timeSlotCollides,
  dateIsInRange,
  calculateEndTime,
  parseDate,
  formatDate,
} from '@/utils/dateUtils';


/**
 * Genera los slots disponibles para una fecha y barbero específicos
 *
 * Reglas:
 * 1. Lee horario del negocio desde Settings
 * 2. Genera slots desde business_start → business_end con paso slot_interval_min
 * 3. Filtra slots que colisionan con citas existentes (status=scheduled)
 * 4. Filtra slots marcados en Unavailable
 * 5. Filtra slots que no cumplen con min_advance_hours (para el día actual)
 * 6. Retorna array de horas disponibles ["09:00", "09:15", ...]
 */
export function getAvailableSlots(
  params: GetSlotsParams,
  settings: AppSettings,
  appointments: Appointment[],
  unavailable: Unavailable[]
): string[] {
  const { date, barber_id, duration_min } = params;
  const {
    business_start,
    business_end,
    slot_interval_min,
    min_advance_hours = 0,  // Default: 0 horas de anticipación (permite agendar de inmediato)
  } = settings;

  // 1. Generar todos los slots del día
  const allSlots = generateTimeSlots(
    business_start,
    business_end,
    slot_interval_min
  );

  // 2. Filtrar citas existentes del barbero para esa fecha
  const dayAppointments = appointments.filter(
    (apt) =>
      apt.date === date &&
      apt.barber_id === barber_id &&
      apt.status === 'scheduled'
  );

  // 3. Filtrar bloqueos del barbero que aplican a esa fecha
  const dayUnavailable = unavailable.filter((u) => {
    // Verificar si el bloqueo aplica a este barbero
    if (u.barber_id !== barber_id) return false;

    // Verificar si la fecha está en el rango del bloqueo
    return dateIsInRange(date, u.start_date, u.end_date);
  });

  // 4. Calcular hora mínima si es el día actual
  const today = new Date();
  // Usar fecha local en vez de UTC para evitar problemas de zona horaria
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const isToday = date === todayStr;

  let minTime = '00:00';
  if (isToday) {
    // Calcular la hora mínima = ahora + min_advance_hours
    const minDate = new Date(today.getTime() + (min_advance_hours * 60 * 60 * 1000));
    const hours = minDate.getHours().toString().padStart(2, '0');
    const minutes = minDate.getMinutes().toString().padStart(2, '0');
    minTime = `${hours}:${minutes}`;
  }

  // 5. Filtrar slots disponibles
  const availableSlots = allSlots.filter((slotTime) => {
    const slotEndTime = calculateEndTime(slotTime, duration_min);

    // Verificar que el slot + duración no exceda el horario de cierre
    if (slotEndTime > business_end) {
      return false;
    }

    // Verificar anticipación mínima para el día actual
    if (isToday && slotTime < minTime) {
      return false;
    }

    // Verificar colisiones con citas existentes
    const collidesWithAppointment = dayAppointments.some((apt) => {
      // Usar duración de la cita existente. Si es 0, null o undefined, usar slot_interval_min o 30
      const aptDuration = (typeof apt.duration_min === 'number' && apt.duration_min > 0) 
        ? apt.duration_min 
        : (slot_interval_min || 30);
      const aptEndTime = calculateEndTime(apt.time, aptDuration);
      
      // El slot colisiona si:
      // - El inicio del slot está antes de que termine la cita existente Y
      // - El fin del slot está después de que empiece la cita existente
      const collides = timeSlotCollides(slotTime, duration_min, apt.time, aptEndTime);
      
      return collides;
    });

    if (collidesWithAppointment) {
      return false;
    }

    // Verificar colisiones con bloqueos
    const collidesWithUnavailable = dayUnavailable.some((u) => {
      // Si es día completo bloqueado
      if (u.full_day) {
        return true;
      }

      // Si tiene horarios específicos
      if (u.start_time && u.end_time) {
        return timeSlotCollides(slotTime, duration_min, u.start_time, u.end_time);
      }

      return false;
    });

    if (collidesWithUnavailable) {
      return false;
    }

    return true;
  });

  return availableSlots;
}

/**
 * Verifica si un slot específico está disponible
 */
export function isSlotAvailable(
  date: string,
  time: string,
  barberId: string,
  durationMin: number,
  settings: AppSettings,
  appointments: Appointment[],
  unavailable: Unavailable[]
): boolean {
  const availableSlots = getAvailableSlots(
    { date, barber_id: barberId, duration_min: durationMin },
    settings,
    appointments,
    unavailable
  );

  return availableSlots.includes(time);
}

/**
 * Obtiene los próximos slots disponibles (para mostrar sugerencias)
 */
export function getNextAvailableSlots(
  barberId: string,
  durationMin: number,
  settings: AppSettings,
  appointments: Appointment[],
  unavailable: Unavailable[],
  maxDays: number = 7,
  maxSlots: number = 10
): Array<{ date: string; time: string }> {
  const results: Array<{ date: string; time: string }> = [];
  const today = new Date();

  for (let i = 0; i < maxDays && results.length < maxSlots; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);

    // Saltar domingos (opcional, configurable)
    if (checkDate.getDay() === 0) continue;

    const dateStr = formatDate(checkDate);

    const slots = getAvailableSlots(
      { date: dateStr, barber_id: barberId, duration_min: durationMin },
      settings,
      appointments,
      unavailable
    );

    for (const time of slots) {
      if (results.length >= maxSlots) break;
      results.push({ date: dateStr, time });
    }
  }

  return results;
}

/**
 * Valida los datos de una cita antes de crearla
 */
export function validateAppointmentData(data: {
  date: string;
  time: string;
  customer_name: string;
  phone: string;
  email: string;
  service: string;
  barber_id: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar fecha
  if (!data.date) {
    errors.push('La fecha es requerida');
  } else {
    const date = parseDate(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      errors.push('No se pueden agendar citas en fechas pasadas');
    }
  }

  // Validar hora
  if (!data.time || !/^\d{2}:\d{2}$/.test(data.time)) {
    errors.push('La hora es requerida y debe tener formato HH:MM');
  }

  // Validar nombre
  if (!data.customer_name || data.customer_name.trim().length < 2) {
    errors.push('El nombre es requerido (mínimo 2 caracteres)');
  }

  // Validar teléfono
  if (!data.phone || data.phone.replace(/\D/g, '').length < 7) {
    errors.push('El teléfono es requerido (mínimo 7 dígitos)');
  }

  // Validar email
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('El email es requerido y debe ser válido');
  }

  // Validar servicio
  if (!data.service) {
    errors.push('Debe seleccionar un servicio');
  }

  // Validar barbero
  if (!data.barber_id) {
    errors.push('Debe seleccionar un barbero');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const slotsService = {
  getAvailableSlots,
  isSlotAvailable,
  getNextAvailableSlots,
  validateAppointmentData,
};

export default slotsService;
