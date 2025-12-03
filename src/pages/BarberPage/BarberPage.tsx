// ============================================
// PÁGINA: BarberPage
// Vista del barbero con URL única
// Acceso: /barbero/:barberId
// ============================================

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppointments, useBarbers, useServices } from '@/hooks';
import { APPOINTMENT_STATUS_LABELS } from '@/config';
import { getTodayString } from '@/utils';
import type { Appointment } from '@/types';

import './BarberPage.css';

export function BarberPage() {
  const { barberId } = useParams<{ barberId: string }>();
  const [selectedDate, setSelectedDate] = useState(
    getTodayString()
  );
  const [completingId, setCompletingId] = useState<string | null>(null);

  const { barbers, loading: loadingBarbers } = useBarbers({ includeInactive: true });
  const { services } = useServices();
  const {
    appointments,
    loading: loadingAppointments,
    completeAppointment,
    refetch
  } = useAppointments({ date: selectedDate, barber_id: barberId });

  // Encontrar el barbero actual
  const barber = barbers.find(b => b.id === barberId);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 20000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Estados de carga y error
  if (loadingBarbers) {
    return (
      <div className="barber-page">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="barber-page">
        <div className="error-screen">
          <div className="error-icon">😕</div>
          <h2>Barbero no encontrado</h2>
          <p>El enlace que usaste no es válido o el barbero no existe.</p>
          <Link to="/" className="btn btn-primary">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (!barber.active) {
    return (
      <div className="barber-page">
        <div className="error-screen">
          <div className="error-icon">🚫</div>
          <h2>Barbero no disponible</h2>
          <p>Este barbero ya no está disponible para agendar citas.</p>
          <Link to="/" className="btn btn-primary">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  // Filtrar citas del día para este barbero
  const todayAppointments = appointments.filter(apt =>
    apt.barber_id === barberId && apt.date === selectedDate
  );

  const pending = todayAppointments.filter(a => a.status === 'scheduled');
  const completed = todayAppointments.filter(a => a.status === 'done');

  // Calcular ingresos (apt.service contiene el ID del servicio)
  const revenue = completed.reduce((sum, apt) => {
    const service = services.find(s => s.id === apt.service || s.name === apt.service);
    return sum + (service?.price || 0);
  }, 0);

  // Siguiente cita
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const nextAppointment = pending
    .filter(a => a.time >= currentTime)
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  const handleComplete = async (apt: Appointment) => {
    if (confirm(`¿Marcar como completada la cita de ${apt.customer_name}?`)) {
      setCompletingId(apt.id);
      try {
        await completeAppointment(apt.id);
      } finally {
        setCompletingId(null);
      }
    }
  };

  return (
    <div className="barber-page">
      {/* Header */}
      <header className="barber-header">
        <div className="barber-profile">
          <div className="barber-avatar-large">
            {barber.name.charAt(0)}
          </div>
          <div className="barber-info-header">
            <h1>Hola, {barber.name.split(' ')[0]} 👋</h1>
            <p className="barber-date">{new Date(selectedDate).toLocaleDateString('es-CO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}</p>
          </div>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="date-picker"
        />
      </header>

      {/* Stats rápidos */}
      <div className="barber-stats">
        <div className="stat-mini">
          <span className="stat-mini-value">{pending.length}</span>
          <span className="stat-mini-label">Pendientes</span>
        </div>
        <div className="stat-mini">
          <span className="stat-mini-value">{completed.length}</span>
          <span className="stat-mini-label">Completadas</span>
        </div>
        <div className="stat-mini stat-revenue">
          <span className="stat-mini-value">${revenue.toLocaleString()}</span>
          <span className="stat-mini-label">Ingresos</span>
        </div>
      </div>

      {/* Próxima cita destacada */}
      {nextAppointment && (
        <div className="next-appointment">
          <div className="next-label">🔔 Próxima cita</div>
          <div className="next-content">
            <div className="next-time">{nextAppointment.time}</div>
            <div className="next-details">
              <div className="next-customer">{nextAppointment.customer_name}</div>
              <div className="next-service">{nextAppointment.service}</div>
            </div>
            <button
              className="btn btn-success btn-complete"
              onClick={() => handleComplete(nextAppointment)}
            >
              ✓ Completar
            </button>
          </div>
        </div>
      )}

      {/* Lista de citas */}
      <section className="appointments-section">
        <h2>📋 Citas del día</h2>

        {loadingAppointments ? (
          <div className="loading-state">Cargando citas...</div>
        ) : todayAppointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <p>No tienes citas para hoy</p>
          </div>
        ) : (
          <div className="appointments-list">
            {todayAppointments
              .sort((a, b) => a.time.localeCompare(b.time))
              .map(apt => (
                <div
                  key={apt.id}
                  className={`appointment-card ${apt.status}`}
                >
                  <div className="appointment-time">
                    {apt.time}
                  </div>

                  <div className="appointment-content">
                    <div className="appointment-customer">
                      {apt.customer_name}
                    </div>
                    <div className="appointment-service">
                      {apt.service}
                    </div>
                    <div className="appointment-contact">
                      📱 {apt.phone}
                    </div>
                  </div>

                  <div className="appointment-actions">
                    {apt.status === 'scheduled' && apt.phone && (
                      <button
                        className="btn btn-whatsapp btn-action"
                        onClick={() => {
                          const phone = String(apt.phone).replace(/\D/g, '');
                          const phoneFormatted = phone.startsWith('57') ? phone : `57${phone}`;
                          const clientName = apt.customer_name?.trim() || 'cliente';
                          const message = `Hola ${clientName}! Te recordamos tu cita: Fecha: ${apt.date} - Hora: ${apt.time} - Servicio: ${apt.service} - Barbero: ${barber?.name}. Te esperamos!`;
                          const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
                          window.open(url, '_blank');
                        }}
                        title="Enviar WhatsApp"
                      >
                        💬
                      </button>
                    )}
                    {apt.status === 'scheduled' ? (
                      <button
                        className="btn btn-success btn-action"
                        onClick={() => handleComplete(apt)}
                        disabled={completingId === apt.id}
                        title="Marcar como completada"
                      >
                        {completingId === apt.id ? '⏳' : '✓'}
                      </button>
                    ) : (
                      <span className={`status-pill status-${apt.status}`}>
                        {APPOINTMENT_STATUS_LABELS[apt.status]?.label || apt.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Footer con info */}
      <footer className="barber-footer">
        <p>Este enlace es exclusivo para ti. No lo compartas.</p>
        <p className="refresh-note">
          Se actualiza automáticamente cada 30 segundos
        </p>
      </footer>
    </div>
  );
}

export default BarberPage;
