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
import { formatDisplayDate } from '@/utils';
import './BookingPage.css';

interface BookingFormData {
  service: string;
  barber_id: string;
  date: string;
  time: string;
  duration_min: number;
  customer_name: string;
  phone: string;
  notes: string;
}

const initialFormData: BookingFormData = {
  service: '',
  barber_id: '',
  date: '',
  time: '',
  duration_min: 30,
  customer_name: '',
  phone: '',
  notes: '',
};

export function BookingPage() {
  const [formData, setFormData] = useState<BookingFormData>(initialFormData);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createAppointment } = useAppointments({ autoFetch: false });

  const handleServiceChange = (serviceId: string, durationMin: number) => {
    setFormData((prev) => ({
      ...prev,
      service: serviceId,
      duration_min: durationMin,
      time: '', // Resetear hora al cambiar servicio
    }));
  };

  const handleBarberChange = (barberId: string) => {
    setFormData((prev) => ({
      ...prev,
      barber_id: barberId,
      time: '', // Resetear hora al cambiar barbero
    }));
  };

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({
      ...prev,
      date,
      time: '', // Resetear hora al cambiar fecha
    }));
  };

  const handleTimeChange = (time: string) => {
    setFormData((prev) => ({
      ...prev,
      time,
    }));
  };

  const handleCustomerChange = (data: {
    customer_name: string;
    phone: string;
    notes?: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const isFormValid = () => {
    return (
      formData.service &&
      formData.barber_id &&
      formData.date &&
      formData.time &&
      formData.customer_name.trim().length >= 2 &&
      formData.phone.replace(/\D/g, '').length >= 7
    );
  };

  const handleSubmit = () => {
    if (!isFormValid() || isSubmitting) return;
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    // Prevenir doble envío
    if (isSubmitting) return;

    setIsSubmitting(true);
    setBookingError(null);

    try {
      // Verificar disponibilidad antes de crear la cita
      const existingAppointments = await googleSheetsService.getAppointmentsByDate(formData.date);
      const conflictingAppointment = existingAppointments.find(
        (apt) =>
          apt.barber_id === formData.barber_id &&
          apt.time === formData.time &&
          apt.status === 'scheduled'
      );

      if (conflictingAppointment) {
        setShowConfirmation(false);
        setBookingError('Este horario acaba de ser ocupado. Por favor selecciona otro horario.');
        setFormData(prev => ({ ...prev, time: '' })); // Resetear hora
        setIsSubmitting(false);
        return;
      }

      const response = await createAppointment({
        date: formData.date,
        time: formData.time,
        duration_min: formData.duration_min,
        customer_name: formData.customer_name,
        phone: formData.phone,
        email: '',
        service: formData.service,
        barber_id: formData.barber_id,
        notes: formData.notes || undefined,
      });

      setShowConfirmation(false);

      if (response.success) {
        setBookingSuccess(true);
        setFormData(initialFormData);
      } else {
        setBookingError(response.error || 'Error al crear la cita');
      }
    } catch (error) {
      setShowConfirmation(false);
      setBookingError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="booking-page">
        <div className="booking-success">
          <div className="success-icon">✓</div>
          <h2>¡Cita Agendada!</h2>
          <p>Tu cita ha sido confirmada exitosamente.</p>
          <p>Te enviaremos un recordatorio por WhatsApp.</p>
          <button
            className="btn btn-primary"
            onClick={() => setBookingSuccess(false)}
          >
            Agendar otra cita
          </button>
        </div>
      </div>
    );
  }

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
        {/* Paso 1: Seleccionar servicio */}
        <section className="booking-section">
          <h2 className="section-title">1. Elige tu servicio</h2>
          <ServiceSelector
            value={formData.service}
            onChange={handleServiceChange}
          />
        </section>

        {/* Paso 2: Seleccionar barbero */}
        <section className="booking-section">
          <h2 className="section-title">2. Elige tu barbero</h2>
          <BarberSelector
            value={formData.barber_id}
            onChange={handleBarberChange}
          />
        </section>

        {/* Paso 3: Seleccionar fecha y hora */}
        <section className="booking-section">
          <h2 className="section-title">3. Elige fecha y hora</h2>
          <div className="date-time-container">
            <div className="date-picker-wrapper">
              <DatePicker
                value={formData.date}
                onChange={handleDateChange}
              />
            </div>
            <div className="time-picker-wrapper">
              <TimeSlotPicker
                date={formData.date}
                barberId={formData.barber_id}
                durationMin={formData.duration_min}
                value={formData.time}
                onChange={handleTimeChange}
              />
            </div>
          </div>
        </section>

        {/* Paso 4: Datos del cliente */}
        <section className="booking-section">
          <h2 className="section-title">4. Tus datos de contacto</h2>
          <CustomerForm
            value={{
              customer_name: formData.customer_name,
              phone: formData.phone,
              notes: formData.notes,
            }}
            onChange={handleCustomerChange}
          />
        </section>

        {/* Resumen y botón de confirmación */}
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
            disabled={!isFormValid() || isSubmitting}
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
    </div>
  );
}

export default BookingPage;
