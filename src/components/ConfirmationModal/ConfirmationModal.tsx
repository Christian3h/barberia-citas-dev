// ============================================
// COMPONENTE: ConfirmationModal
// Modal de confirmación de cita
// ============================================

import { useServices, useBarbers } from '@/hooks';
import { formatDisplayDate, formatDuration } from '@/utils';
import './ConfirmationModal.css';

interface AppointmentSummary {
  date: string;
  time: string;
  service_name: string;
  barber_id: string;
  customer_name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  appointment: AppointmentSummary;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  appointment,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmationModalProps) {
  const { services } = useServices();
  const { barbers } = useBarbers();

  if (!isOpen) return null;

  const service = services.find((s) => s.name === appointment.service_name);
  const barber = barbers.find((b) => b.id === appointment.barber_id);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Confirmar Cita</h2>

        <div className="appointment-summary">
          <div className="summary-row">
            <span className="summary-label">📅 Fecha:</span>
            <span className="summary-value">{formatDisplayDate(appointment.date)}</span>
          </div>

          <div className="summary-row">
            <span className="summary-label">🕐 Hora:</span>
            <span className="summary-value">{appointment.time}</span>
          </div>

          <div className="summary-row">
            <span className="summary-label">✂️ Servicio:</span>
            <span className="summary-value">
              {appointment.service_name} 
              {service && (
                <span className="service-meta">
                  ({formatDuration(service.duration_min)} - ${service.price.toLocaleString()})
                </span>
              )}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-label">💈 Barbero:</span>
            <span className="summary-value">{barber?.name || 'No asignado'}</span>
          </div>

          <hr className="summary-divider" />

          <div className="summary-row">
            <span className="summary-label">👤 Nombre:</span>
            <span className="summary-value">{appointment.customer_name}</span>
          </div>

          <div className="summary-row">
            <span className="summary-label">📱 Teléfono:</span>
            <span className="summary-value">{appointment.phone}</span>
          </div>

          {appointment.notes && (
            <div className="summary-row">
              <span className="summary-label">📝 Notas:</span>
              <span className="summary-value">{appointment.notes}</span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Confirmando...' : 'Confirmar Cita'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
