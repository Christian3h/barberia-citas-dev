import { ApiResponse, CreateUnavailablePayload, Unavailable, User } from '@/types'
import { useState } from 'react'
import { formatShortDate, getTodayString } from '@/utils';

interface UnavailableManagerProps {
  unavailable: Unavailable[]
  barbers: User[]
  loading: boolean
  onCreate: (payload: CreateUnavailablePayload) => Promise<ApiResponse<Unavailable>>
  onDelete: (id: string) => Promise<ApiResponse<{success: boolean;}>>
}

export function UnavailableManager({
  unavailable, barbers, loading, onCreate, onDelete
}: UnavailableManagerProps) {
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [newBlock, setNewBlock] = useState({
      barber_id: barbers[0]?.id || '',
      start_date: getTodayString(),
      end_date: getTodayString(),
      start_time: '09:00',
      end_time: '20:00',
      full_day: true,
      reason: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await onCreate(newBlock);
        setShowForm(false);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleDelete = async (id: string) => {
      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    };

    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>🚫 Bloqueos de Horario</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Nuevo bloqueo'}
          </button>
        </div>

        {showForm && (
          <form className="block-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Barbero</label>
                <select
                  value={newBlock.barber_id}
                  onChange={(e) => setNewBlock({ ...newBlock, barber_id: e.target.value })}
                  required
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newBlock.full_day}
                    onChange={(e) => setNewBlock({ ...newBlock, full_day: e.target.checked })}
                  />
                  Día completo
                </label>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha inicio</label>
                <input
                  type="date"
                  value={newBlock.start_date}
                  onChange={(e) => setNewBlock({ ...newBlock, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha fin</label>
                <input
                  type="date"
                  value={newBlock.end_date}
                  onChange={(e) => setNewBlock({ ...newBlock, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            {!newBlock.full_day && (
              <div className="form-row">
                <div className="form-group">
                  <label>Hora inicio</label>
                  <input
                    type="time"
                    value={newBlock.start_time}
                    onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hora fin</label>
                  <input
                    type="time"
                    value={newBlock.end_time}
                    onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="form-group">
              <label>Razón (opcional)</label>
              <input
                type="text"
                value={newBlock.reason}
                onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                placeholder="Ej: Vacaciones, Capacitación..."
                disabled={isSubmitting}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? '⏳ Creando...' : 'Crear bloqueo'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="loading-state">Cargando...</div>
        ) : unavailable.length === 0 ? (
          <div className="empty-state">No hay bloqueos configurados</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Barbero</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Horario</th>
                  <th>Razón</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {unavailable.map((block) => (
                  <tr key={block.id}>
                    <td>{barbers.find((b) => b.id === block.barber_id)?.name || block.barber_id || '-'}</td>
                    <td>{formatShortDate(block.start_date) || '-'}</td>
                    <td>{formatShortDate(block.end_date) || '-'}</td>
                    <td>{block.full_day ? 'Todo el día' : (block.start_time && block.end_time ? `${block.start_time} - ${block.end_time}` : 'Todo el día')}</td>
                    <td>{block.reason || '-'}</td>
                    <td>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(block.id)}
                        disabled={deletingId === block.id}
                      >
                        {deletingId === block.id ? '⏳...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
}