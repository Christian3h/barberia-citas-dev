// ============================================
// LÓGICA DE NEGOCIO - SLOTS DISPONIBLES
// ============================================

import type {
  Appointment,
  Unavailable,
  AppSettings,
  GetSlotsParams,
  BlockedDay,
} from '@/types';
import {
  generateTimeSlots,
  dateIsInRange,
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
  unavailable: Unavailable[],
  blockedDay: BlockedDay | null
): string[] {
  const { date, barber_id, duration_min } = params;
  const {
    business_start,
    business_end,
    slot_interval_min,
    min_advance_hours = 0,  // Default: 0 horas de anticipación (permite agendar de inmediato)
  } = settings;

  // **NUEVO**: Verificar si el día de la semana está bloqueado permanentemente
  if (blockedDay) {
    // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const dayIndex = new Date(date).getUTCDay(); // UTC para evitar zona horaria local
    // Convertir a formato del sistema: 1=Lunes ... 7=Domingo
    // Lunes(1) -> 1, Domingo(0) -> 7
    const daySystem = dayIndex === 0 ? '7' : dayIndex.toString();
    
    // Asegurar que blocked_days sea tratado como string
    const blockedStr = String(blockedDay.blocked_days || '');
    const blockedArray = blockedStr.split(',').map(d => d.trim()).filter(Boolean);
    
    if (blockedArray.includes(daySystem)) {
      return []; // El día está bloqueado, no hay slots disponibles
    }
  } 

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

  // Convertir horario de cierre a minutos desde medianoche
  const [bEndH, bEndM] = business_end.split(':').map(Number);
  const businessEndMin = (isNaN(bEndH) ? 20 : bEndH) * 60 + (isNaN(bEndM) ? 0 : bEndM);

  // Convertir hora de inicio mínima para el día actual a minutos
  const [minH, minM] = minTime.split(':').map(Number);
  const minTimeMin = (isNaN(minH) ? 0 : minH) * 60 + (isNaN(minM) ? 0 : minM);

  // 5. Filtrar slots disponibles basándose estrictamente en la duración del servicio seleccionado
  const availableSlots = allSlots.filter((slotTime) => {
    const [sH, sM] = slotTime.split(':').map(Number);
    const slotStartMin = sH * 60 + sM;
    const slotEndMin = slotStartMin + duration_min;

    // A. Filtrar si la cita terminara después del horario de cierre del negocio
    if (slotEndMin > businessEndMin) {
      return false;
    }

    // B. Filtrar si es el día actual y la hora de inicio es menor a minTime
    if (isToday && slotStartMin < minTimeMin) {
      return false;
    }

    // C. Verificar colisiones con citas existentes para la duración requerida
    const collidesWithAppointment = dayAppointments.some((apt) => {
      const aptDuration = (typeof apt.duration_min === 'number' && apt.duration_min > 0) 
        ? apt.duration_min 
        : (slot_interval_min || 30);
      
      const [aptH, aptM] = String(apt.time || '00:00').split(':').map(Number);
      const aptStartMin = (isNaN(aptH) ? 0 : aptH) * 60 + (isNaN(aptM) ? 0 : aptM);
      const aptEndMin = aptStartMin + aptDuration;

      // Colisión si se superponen los rangos [slotStartMin, slotEndMin) y [aptStartMin, aptEndMin)
      return slotStartMin < aptEndMin && slotEndMin > aptStartMin;
    });

    if (collidesWithAppointment) {
      return false;
    }

    // D. Verificar colisiones con bloqueos (Unavailable) para la duración requerida
    const collidesWithUnavailable = dayUnavailable.some((u) => {
      if (u.full_day) {
        return true;
      }

      if (u.start_time && u.end_time) {
        const [uStartH, uStartM] = String(u.start_time).split(':').map(Number);
        const [uEndH, uEndM] = String(u.end_time).split(':').map(Number);
        const uStartMin = (isNaN(uStartH) ? 0 : uStartH) * 60 + (isNaN(uStartM) ? 0 : uStartM);
        let uEndMin = (isNaN(uEndH) ? 0 : uEndH) * 60 + (isNaN(uEndM) ? 0 : uEndM);

        if (uEndMin <= uStartMin) {
          uEndMin = uStartMin + 60;
        }

        return slotStartMin < uEndMin && slotEndMin > uStartMin;
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
    unavailable,
    null
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
      unavailable,
      null
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
  service_name: string;
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
  if (!data.service_name) {
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
