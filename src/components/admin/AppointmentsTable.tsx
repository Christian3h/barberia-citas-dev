import { Appointment } from '@/types/appointment';
import { APPOINTMENT_STATUS_LABELS } from '@/config';
import { useState } from 'react'
import { FaWhatsapp } from "react-icons/fa";


interface AppointmentsTableProps {
    appointments: Appointment[];
    allServices: any[];
    barbers: any[];
    loading: boolean;
    selectedDate: string;
    onDateChange: (date: string) => void;
    onComplete: (id: string) => Promise<unknown>;
    onCancel: (id: string) => Promise<unknown>;
};

export function AppointmentsTable ({
    appointments, allServices, barbers, loading, selectedDate, onDateChange, onComplete, onCancel,
}: AppointmentsTableProps) {
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'complete' | 'cancel' | null>(null);

    const handleComplete = async (id: string) => {
      setActioningId(id);
      setActionType('complete');
      try {
        await onComplete(id);
      } finally {
        setActioningId(null);
        setActionType(null);
      }
    };

    const handleCancel = async (id: string) => {
      setActioningId(id);
      setActionType('cancel');
      try {
        await onCancel(id);
      } finally {
        setActioningId(null);
        setActionType(null);
      }
    };

    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>📅 Citas</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="date-input"
          />
        </div>

        {loading ? (
          <div className="loading-state">Cargando citas...</div>
        ) : appointments.length === 0 ? (
          <div className="empty-state">No hay citas para este día</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Barbero</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => {
                  // Buscar el nombre del servicio por ID o por nombre
                  const serviceName = allServices.find(s => s.id === apt.service)?.name || apt.service;
                  return (
                  <tr key={apt.id}>
                    <td className="time-cell">{apt.time}</td>
                    <td>{apt.customer_name}</td>
                    <td>{serviceName}</td>
                    <td>{barbers.find(b => b.id === apt.barber_id)?.name || apt.barber_id}</td>
                    <td>{apt.phone}</td>
                    <td>
                        <span className={`status-badge status-${apt.status}`}>
                            {APPOINTMENT_STATUS_LABELS[apt.status]?.label || apt.status}
                        </span>
                    </td>
                    <td className="actions-cell">
                      {apt.status === 'scheduled' && (
                        <>
                          <button
                            className="btn btn-small btn-success"
                            onClick={() => handleComplete(apt.id)}
                            disabled={actioningId === apt.id}
                            title="Completar"
                          >
                            {actioningId === apt.id && actionType === 'complete' ? '⏳' : '✓'}
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => handleCancel(apt.id)}
                            disabled={actioningId === apt.id}
                            title="Cancelar"
                          >
                            {actioningId === apt.id && actionType === 'cancel' ? '⏳' : '✕'}
                          </button>
                        </>
                      )}
                      {apt.phone && (
                        <button
                          className="btn btn-small btn-whatsapp"
                          onClick={() => {
                            const barberName = barbers.find(b => b.id === apt.barber_id)?.name || 'tu barbero';
                            const phone = String(apt.phone).replace(/\D/g, '');
                            const phoneFormatted = phone.startsWith('57') ? phone : `57${phone}`;
                            const clientName = apt.customer_name?.trim() || 'cliente';
                            const message = `Hola ${clientName}! Te recordamos tu cita: Fecha: ${apt.date} - Hora: ${apt.time} - Servicio: ${serviceName} - Barbero: ${barberName}. Te esperamos!`;
                            const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
                            window.open(url, '_blank');
                          }}
                          title="Enviar recordatorio por WhatsApp"
                        >
                          <FaWhatsapp size={17} color="#444444" />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
}
   