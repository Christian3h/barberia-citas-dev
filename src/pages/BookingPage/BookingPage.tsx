// ============================================
// PÁGINA: BookingPage
// Página principal de reserva de citas
// ============================================

import { useState } from 'react';
import {
  ServiceSelector,
  BarberSelector,
  DatePicker,
  TimeSlotPicker,
  CustomerForm,
  ConfirmationModal,
} from '@/components';
import { useAppointments } from '@/hooks';
import { googleSheetsService } from '@/services';
import { validColombianPhone } from '@/utils/validColombianPhone';
import { formatDisplayDate, timeSlotCollides, calculateEndTime } from '@/utils';
import './BookingPage.css';

interface BookingFormData {
  service_name: string;
  barber_id: string;
  date: string;
  time: string;
  duration_min: number;
  customer_name: string;
  phone: string;
  notes: string;
}

const initialFormData: BookingFormData = {
  service_name: '',
  barber_id: '',
  date: '',
  time: '',
  duration_min: 30,
  customer_name: '',
  phone: '',
  notes: '',
};

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Comprueba si alguna cita existente choca con el slot solicitado.
 * Devuelve la cita conflictiva o undefined.
 */
async function findConflict(formData: BookingFormData) {
  const existing = await googleSheetsService.getAppointmentsByDate(formData.date);

  return existing.find((apt) => {
    if (apt.barber_id !== formData.barber_id || apt.status !== 'scheduled') return false;

    const aptDuration =
      typeof apt.duration_min === 'number' && apt.duration_min > 0 ? apt.duration_min : 30;
    const aptEnd = calculateEndTime(apt.time, aptDuration);

    return timeSlotCollides(formData.time, formData.duration_min, apt.time, aptEnd);
  });
}

// ─── types ───────────────────────────────────────────────────────────────────

interface FieldErrors {
  service_name ?: string;
  barber_id?: string;
  date?: string;
  time?: string;
  customer_name?: string;
  phone?: string;
}

// ─── component ───────────────────────────────────────────────────────────────

export function BookingPage() {
  const [formData, setFormData] = useState<BookingFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createAppointment } = useAppointments({ autoFetch: false });

  // ── field handlers (resetean `time` cuando cambia algo que afecta disponibilidad) ──

  const handleServiceChange = (serviceId: string, durationMin: number) => {
    setFormData((prev) => ({ ...prev, service_name: serviceId, duration_min: durationMin, time: '' }));
    setFieldErrors((prev) => ({ ...prev, service_name: undefined, time: undefined }));
  };

  const handleBarberChange = (barberId: string) => {
    setFormData((prev) => ({ ...prev, barber_id: barberId, time: '' }));
    setFieldErrors((prev) => ({ ...prev, barber_id: undefined, time: undefined }));
  };

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, date, time: '' }));
    setFieldErrors((prev) => ({ ...prev, date: undefined, time: undefined }));
  };

  const handleTimeChange = (time: string) => {
    setFormData((prev) => ({ ...prev, time }));
    setFieldErrors((prev) => ({ ...prev, time: undefined }));
  };

  const handleCustomerChange = (data: { customer_name: string; phone: string; notes?: string }) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setFieldErrors((prev) => ({
      ...prev,
      customer_name: undefined,
      phone: undefined,
    }));
  };

  // ── validation ──────────────────────────────────────────────────────────────

  /**
   * Valida todos los campos y devuelve los errores encontrados.
   * Si no hay errores devuelve un objeto vacío.
   */
  const validateAll = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!formData.service_name)    errors.service_name     = 'Selecciona un servicio';
    if (!formData.barber_id)  errors.barber_id   = 'Selecciona un barbero';
    if (!formData.date)       errors.date        = 'Selecciona una fecha';
    if (!formData.time)       errors.time        = 'Selecciona una hora';
    if (formData.customer_name.trim().length < 2)
                              errors.customer_name = 'Ingresa tu nombre completo';
    if (!validColombianPhone(formData.phone))
                              errors.phone       = 'Ingresa un celular colombiano válido';
    return errors;
  };

  // ── submit flow ─────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (isSubmitting) return;

    const errors = validateAll();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll suave al primer campo con error
      const firstErrorKey = Object.keys(errors)[0];
      document.querySelector(`[data-field="${firstErrorKey}"]`)?.scrollIntoView({
        behavior: 'smooth', block: 'center',
      });
      return;
    }

    setFieldErrors({});
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const conflict = await findConflict(formData);

      if (conflict) {
        setShowConfirmation(false);
        setBookingError('Este horario acaba de ser ocupado. Por favor selecciona otro horario.');
        setFormData((prev) => ({ ...prev, time: '' }));
        return;
      }

      const response = await createAppointment({
        date: formData.date,
        time: formData.time,
        duration_min: formData.duration_min,
        customer_name: formData.customer_name,
        phone: formData.phone,
        email: '',
        service_name: formData.service_name,
        barber_id: formData.barber_id,
        notes: formData.notes || undefined,
      });
console.log('Create appointment response:', response);
      setShowConfirmation(false);

      if (response.success) {
        setBookingSuccess(true);
        setFormData(initialFormData);
      } else {
        setBookingError(response.error || 'Error al crear la cita');
      }
    } catch {
      setShowConfirmation(false);
      setBookingError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── success screen ──────────────────────────────────────────────────────────

  if (bookingSuccess) {
    return (
      <div className="booking-page">
        <div className="booking-success">
          <div className="success-icon">✓</div>
          <h2>¡Cita Agendada!</h2>
          <p>Tu cita ha sido confirmada exitosamente.</p>
          <p>Te enviaremos un recordatorio por WhatsApp.</p>
          <button className="btn btn-primary" onClick={() => setBookingSuccess(false)}>
            Agendar otra cita
          </button>
        </div>        
        <a href="https://prigma.onrender.com/" target="_blank" rel="noopener noreferrer" className="watermark">
          <img src="/images/prigma.PNG" alt="Prigma" className="watermark-logo" />
          <span>Made by Prigma</span>
        </a>      
      </div>
    );
  }

  // ── main render ─────────────────────────────────────────────────────────────

  return (
    <div className="booking-page">
      <header className="booking-header">
        <h1>Agenda tu cita</h1>
        <p>Selecciona el servicio, barbero, fecha y hora que prefieras</p>
      </header>

      {bookingError && (
        <div className="booking-error">
          <span>⚠️ {bookingError}</span>
          <button onClick={() => setBookingError(null)}>×</button>
        </div>
      )}

      <div className="booking-form">
        <section className="booking-section" data-field="service_name">
          <h2 className="section-title">1. Elige tu servicio</h2>
          <ServiceSelector
            value={formData.service_name}
            onChange={handleServiceChange}
            error={fieldErrors.service_name}
          />
        </section>

        <section className="booking-section" data-field="barber_id">
          <h2 className="section-title">2. Elige tu barbero</h2>
          <BarberSelector
            value={formData.barber_id}
            onChange={handleBarberChange}
            error={fieldErrors.barber_id}
          />
        </section>

        <section className="booking-section" data-field="date">
          <h2 className="section-title">3. Elige fecha y hora</h2>
          <div className="date-time-container">
            <div className="date-picker-wrapper">
              <DatePicker
                value={formData.date}
                onChange={handleDateChange}
                error={fieldErrors.date}
              />
            </div>
            <div className="time-picker-wrapper" data-field="time">
              <TimeSlotPicker
                date={formData.date}
                barberId={formData.barber_id}
                durationMin={formData.duration_min}
                value={formData.time}
                onChange={handleTimeChange}
                error={fieldErrors.time}
              />
            </div>
          </div>
        </section>

        <section className="booking-section" data-field="customer_name">
          <h2 className="section-title">4. Tus datos de contacto</h2>
          <CustomerForm
            value={{
              customer_name: formData.customer_name,
              phone: formData.phone,
              notes: formData.notes,
            }}
            onChange={handleCustomerChange}
            errors={{
              customer_name: fieldErrors.customer_name,
              phone: fieldErrors.phone,
            }}
          />
        </section>

        <section className="booking-section booking-summary">
          {formData.date && formData.time && (
            <div className="selected-summary">
              <span>📅 {formatDisplayDate(formData.date)}</span>
              <span>🕐 {formData.time}</span>
            </div>
          )}

          <button
            className="btn btn-primary btn-large"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Procesando...' : 'Confirmar Cita'}
          </button>
        </section>
      </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        appointment={formData}
        onConfirm={handleConfirm}
        onCancel={() => !isSubmitting && setShowConfirmation(false)}
        loading={isSubmitting}
      />
      <a href="https://prigma.onrender.com/" target="_blank" rel="noopener noreferrer" className="watermark">
        <img src="/images/prigma.PNG" alt="Prigma" className="watermark-logo" />
        <span>Made by Prigma</span>
      </a>
    </div>
  );
}

export default BookingPage;