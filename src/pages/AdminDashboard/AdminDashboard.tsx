// ============================================
// PÁGINA: AdminDashboard
// Panel de administración con login PIN
// ============================================

import { useState, useEffect } from 'react';
import { useAppointments, useUnavailable, useSettings, useBarbers, useServices } from '@/hooks';
import { formatShortDate } from '@/utils';
import { APPOINTMENT_STATUS_LABELS } from '@/config';
import type { BarberService, User, AppSettings } from '@/types';
import { appsScriptApi } from '@/services';

import './AdminDashboard.css';

// ============================================
// CONSTANTES
// ============================================
const SESSION_KEY = 'admin_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas

type TabType = 'dashboard' | 'appointments' | 'unavailable' | 'services' | 'barbers' | 'settings';

// ============================================
// COMPONENTE: AdminLogin
// ============================================
function AdminLogin({
  onLogin,
  correctPin
}: {
  onLogin: () => void;
  correctPin: string;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === correctPin) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        authenticated: true,
        expiry: Date.now() + SESSION_DURATION
      }));
      onLogin();
    } else {
      setError('PIN incorrecto');
      setPin('');
    }
  };

  return (
    <div className="admin-login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon">🔐</div>
        <h2>Panel Admin</h2>
        <p>Ingresa el PIN de administrador</p>

        {error && <div className="login-error">{error}</div>}

        <input
          type="password"
          className="pin-input"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          maxLength={6}
          autoFocus
        />

        <button type="submit" className="btn btn-primary btn-large">
          Ingresar
        </button>
      </form>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL: AdminDashboard
// ============================================
export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const { settings, loading: loadingSettings, updateSettings } = useSettings();
  // Cargar todas las citas para el Dashboard, luego filtrar por fecha seleccionada en la tabla
  const { appointments: allAppointments, loading: loadingAppointments, cancelAppointment, completeAppointment } = useAppointments({});
  const { unavailable, loading: loadingUnavailable, createUnavailable, deleteUnavailable } = useUnavailable();
  const { barbers, refetch: refetchBarbers } = useBarbers();
  const { services, refetch: refetchServices } = useServices();

  // Filtrar citas por fecha seleccionada para la tabla de citas
  const appointments = allAppointments.filter(apt => apt.date === selectedDate);

  // Verificar sesión al cargar
  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      const { authenticated, expiry } = JSON.parse(session);
      if (authenticated && expiry > Date.now()) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  // Mostrar login si no está autenticado
  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLogin={() => setIsAuthenticated(true)}
        correctPin={settings.admin_pin || '1234'}
      />
    );
  }

  // ============================================
  // SUB-COMPONENTE: Dashboard Stats
  // ============================================
  const DashboardStats = () => {
    // Fecha de hoy en formato local YYYY-MM-DD
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // DEBUG: Ver qué fechas tienen las citas
    console.log('=== DEBUG DASHBOARD ===');
    console.log('Fecha de hoy:', todayStr);
    console.log('Total citas cargadas:', allAppointments.length);
    console.log('Fechas en citas:', allAppointments.map(a => ({ date: a.date, status: a.status })));

    // Filtrar citas de hoy desde TODAS las citas
    const todayAppointments = allAppointments.filter(a => {
      const aptDate = String(a.date).trim();
      const matches = aptDate === todayStr;
      console.log(`Comparando: "${aptDate}" === "${todayStr}" => ${matches}`);
      return matches;
    });

    console.log('Citas de hoy encontradas:', todayAppointments.length);

    const pending = todayAppointments.filter(a => a.status === 'scheduled').length;
    const completed = todayAppointments.filter(a => a.status === 'done').length;

    // Calcular ingresos de citas completadas
    const revenue = todayAppointments
      .filter(a => a.status === 'done')
      .reduce((sum, a) => {
        // Buscar servicio por nombre o ID
        const service = services.find(s => s.name === a.service || s.id === a.service);
        return sum + (service?.price || 0);
      }, 0);

    const upcoming = todayAppointments
      .filter(a => a.status === 'scheduled')
      .sort((a, b) => String(a.time).localeCompare(String(b.time)))
      .slice(0, 5);

    return (
      <div className="admin-section">
        <h2>Resumen del Día ({todayStr})</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-value">{todayAppointments.length}</div>
            <div className="stat-label">Citas Hoy</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{pending}</div>
            <div className="stat-label">Pendientes</div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{completed}</div>
            <div className="stat-label">Completadas</div>
          </div>
          <div className="stat-card stat-revenue">
            <div className="stat-icon">💰</div>
            <div className="stat-value">${revenue.toLocaleString()}</div>
            <div className="stat-label">Ingresos</div>
          </div>
        </div>

        <h3>Próximas Citas</h3>
        {upcoming.length === 0 ? (
          <div className="empty-state">No hay citas pendientes</div>
        ) : (
          <div className="upcoming-list">
            {upcoming.map(apt => (
              <div key={apt.id} className="upcoming-item">
                <span className="upcoming-time">{apt.time}</span>
                <div className="upcoming-info">
                  <div className="upcoming-customer">{apt.customer_name}</div>
                  <div className="upcoming-details">{apt.service} • {barbers.find(b => b.id === apt.barber_id)?.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // SUB-COMPONENTE: Appointments Table
  // ============================================
  const AppointmentsTable = () => {
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'complete' | 'cancel' | null>(null);

    const handleComplete = async (id: string) => {
      setActioningId(id);
      setActionType('complete');
      try {
        await completeAppointment(id);
      } finally {
        setActioningId(null);
        setActionType(null);
      }
    };

    const handleCancel = async (id: string) => {
      setActioningId(id);
      setActionType('cancel');
      try {
        await cancelAppointment(id);
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
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>

        {loadingAppointments ? (
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
                {appointments.map((apt) => (
                  <tr key={apt.id}>
                    <td className="time-cell">{apt.time}</td>
                    <td>{apt.customer_name}</td>
                    <td>{apt.service}</td>
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
                            const message = `Hola ${clientName}! Te recordamos tu cita: Fecha: ${apt.date} - Hora: ${apt.time} - Servicio: ${apt.service} - Barbero: ${barberName}. Te esperamos!`;
                            const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
                            window.open(url, '_blank');
                          }}
                          title="Enviar recordatorio por WhatsApp"
                        >
                          📱
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // SUB-COMPONENTE: Unavailable Manager
  // ============================================
  const UnavailableManager = () => {
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [newBlock, setNewBlock] = useState({
      barber_id: barbers[0]?.id || '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '20:00',
      full_day: true,
      reason: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await createUnavailable(newBlock);
        setShowForm(false);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleDelete = async (id: string) => {
      setDeletingId(id);
      try {
        await deleteUnavailable(id);
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

        {loadingUnavailable ? (
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
                    <td>{barbers.find((b) => b.id === block.barber_id)?.name || block.barber_id}</td>
                    <td>{formatShortDate(block.start_date)}</td>
                    <td>{formatShortDate(block.end_date)}</td>
                    <td>{block.full_day ? 'Todo el día' : `${block.start_time} - ${block.end_time}`}</td>
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
  };

  // ============================================
  // SUB-COMPONENTE: Services Manager
  // ============================================
  const ServicesManager = () => {
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState<BarberService | null>(null);
    const [deletingService, setDeletingService] = useState<BarberService | null>(null);
    const [formData, setFormData] = useState({
      name: '',
      duration_min: 30,
      price: 0,
      description: '',
      active: true,
    });
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const resetForm = () => {
      setFormData({ name: '', duration_min: 30, price: 0, description: '', active: true });
      setEditingService(null);
      setShowForm(false);
    };

    const handleEdit = (service: BarberService) => {
      setFormData({
        name: service.name,
        duration_min: service.duration_min,
        price: service.price,
        description: service.description || '',
        active: service.active ?? true,
      });
      setEditingService(service);
      setShowForm(true);
    };

    const handleDeleteClick = (service: BarberService) => {
      setDeletingService(service);
    };

    const confirmDelete = async () => {
      if (!deletingService) return;
      
      setSaving(true);
      try {
        const result = await appsScriptApi.deleteService(deletingService.id);
        if (result.success) {
          refetchServices();
          setDeletingService(null);
        } else {
          alert('Error: ' + (result.error || 'No se pudo eliminar el servicio'));
        }
      } catch (err) {
        console.error('Error deleting service:', err);
        alert('Error al eliminar el servicio');
      }
      setSaving(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        let result;
        if (editingService) {
          result = await appsScriptApi.updateService(editingService.id, formData);
        } else {
          result = await appsScriptApi.createService(formData as Omit<BarberService, 'id'>);
        }
        
        if (result.success) {
          resetForm();
          refetchServices();
        } else {
          alert('Error: ' + (result.error || 'No se pudo guardar el servicio'));
        }
      } catch (err) {
        console.error('Error saving service:', err);
        alert('Error al guardar el servicio');
      }
      setSaving(false);
    };

    const toggleActive = async (service: BarberService) => {
      setTogglingId(service.id);
      try {
        const result = await appsScriptApi.updateService(service.id, { active: !(service.active ?? true) });
        if (result.success) {
          refetchServices();
        } else {
          alert('Error: ' + (result.error || 'No se pudo cambiar el estado'));
        }
      } catch (err) {
        console.error('Error toggling service:', err);
        alert('Error al cambiar el estado del servicio');
      } finally {
        setTogglingId(null);
      }
    };

    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>✂️ Servicios</h2>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancelar' : '+ Nuevo servicio'}
          </button>
        </div>

        {showForm && (
          <form className="block-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Duración (min)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={formData.duration_min}
                  onChange={(e) => setFormData({ ...formData, duration_min: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Precio</label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editingService ? 'Actualizar' : 'Crear'}
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Duración</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className={(service.active ?? true) ? '' : 'row-inactive'}>
                  <td>
                    <div className="service-info">
                      <span className="service-name">{service.name}</span>
                      {service.description && <span className="service-desc">{service.description}</span>}
                    </div>
                  </td>
                  <td>{service.duration_min} min</td>
                  <td>${service.price.toLocaleString()}</td>
                  <td>
                    <button
                      className={`status-toggle ${(service.active ?? true) ? 'active' : 'inactive'}`}
                      onClick={() => toggleActive(service)}
                      disabled={togglingId === service.id}
                    >
                      {togglingId === service.id ? '⏳...' : (service.active ?? true) ? '✅ Activo' : '❌ Inactivo'}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-small btn-secondary" onClick={() => handleEdit(service)} title="Editar">
                      ✏️
                    </button>
                    <button className="btn btn-small btn-danger" onClick={() => handleDeleteClick(service)} title="Eliminar" style={{ marginLeft: '8px' }}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {deletingService && (
          <div className="modal-overlay" onClick={() => !saving && setDeletingService(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">Eliminar Servicio</h2>
              <p>¿Estás seguro de que deseas eliminar el servicio <strong>{deletingService.name}</strong>?</p>
              <p className="text-warning">Esta acción no se puede deshacer y el servicio dejará de estar disponible inmediatamente.</p>
              
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setDeletingService(null)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                  disabled={saving}
                >
                  {saving ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // SUB-COMPONENTE: Barbers Manager
  // ============================================
  const BarbersManager = () => {
    const [showForm, setShowForm] = useState(false);
    const [editingBarber, setEditingBarber] = useState<User | null>(null);
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      active: true,
    });
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const resetForm = () => {
      setFormData({ name: '', email: '', phone: '', active: true });
      setEditingBarber(null);
      setShowForm(false);
    };

    const handleEdit = (barber: User) => {
      setFormData({
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        active: barber.active,
      });
      setEditingBarber(barber);
      setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        if (editingBarber) {
          await appsScriptApi.updateUser(editingBarber.id, formData);
        } else {
          await appsScriptApi.createUser({ ...formData, role: 'barber' });
        }
        resetForm();
        refetchBarbers();
      } catch (err) {
        console.error('Error saving barber:', err);
      }
      setSaving(false);
    };

    const toggleActive = async (barber: User) => {
      setTogglingId(barber.id);
      try {
        await appsScriptApi.updateUser(barber.id, { active: !barber.active });
        refetchBarbers();
      } finally {
        setTogglingId(null);
      }
    };

    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>💈 Barberos</h2>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancelar' : '+ Nuevo barbero'}
          </button>
        </div>

        {showForm && (
          <form className="block-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editingBarber ? 'Actualizar' : 'Crear'}
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Barbero</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {barbers.map((barber) => (
                <tr key={barber.id} className={barber.active ? '' : 'row-inactive'}>
                  <td>
                    <div className="barber-info">
                      <div className="barber-avatar">{barber.name.charAt(0)}</div>
                      <span className="barber-name">{barber.name}</span>
                    </div>
                  </td>
                  <td>{barber.phone || '-'}</td>
                  <td>{barber.email || '-'}</td>
                  <td>
                    <button
                      className={`status-toggle ${barber.active ? 'active' : 'inactive'}`}
                      onClick={() => toggleActive(barber)}
                      disabled={togglingId === barber.id}
                    >
                      {togglingId === barber.id ? '⏳...' : barber.active ? '✅ Activo' : '❌ Inactivo'}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-small btn-secondary" onClick={() => handleEdit(barber)}>
                      ✏️
                    </button>
                    <button
                      className="btn btn-small btn-accent"
                      onClick={() => {
                        const url = `${window.location.origin}/barbero/${barber.id}`;
                        navigator.clipboard.writeText(url);
                        alert(`✅ Link copiado:\n${url}`);
                      }}
                      title="Copiar link del barbero"
                    >
                      🔗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // SUB-COMPONENTE: Settings Panel
  // ============================================
  const SettingsPanel = () => {
    const [editedSettings, setEditedSettings] = useState<AppSettings>(settings);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
      setEditedSettings(settings);
    }, [settings]);

    const handleSave = async () => {
      setSaving(true);
      setMessage('');
      try {
        await updateSettings(editedSettings);
        setMessage('✅ Configuración guardada');
      } catch {
        setMessage('❌ Error al guardar');
      }
      setSaving(false);
    };

    return (
      <div className="admin-section">
        <h2>⚙️ Configuración</h2>

        {loadingSettings ? (
          <div className="loading-state">Cargando...</div>
        ) : (
          <div className="settings-form">
            {message && <div className="settings-message">{message}</div>}

            <div className="settings-group">
              <h3>🏪 Negocio</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del negocio</label>
                  <input
                    type="text"
                    value={editedSettings.business_name || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings, business_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Zona horaria</label>
                  <input
                    type="text"
                    value={editedSettings.timezone}
                    onChange={(e) => setEditedSettings({ ...editedSettings, timezone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h3>🕐 Horario</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Hora apertura</label>
                  <input
                    type="time"
                    value={editedSettings.business_start}
                    onChange={(e) => setEditedSettings({ ...editedSettings, business_start: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hora cierre</label>
                  <input
                    type="time"
                    value={editedSettings.business_end}
                    onChange={(e) => setEditedSettings({ ...editedSettings, business_end: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h3>📅 Citas</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Intervalo de slots (min)</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    step="5"
                    value={editedSettings.slot_interval_min}
                    onChange={(e) => setEditedSettings({ ...editedSettings, slot_interval_min: parseInt(e.target.value) || 15 })}
                  />
                </div>
                <div className="form-group">
                  <label>Máx. días anticipación</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={editedSettings.max_book_ahead_days}
                    onChange={(e) => setEditedSettings({ ...editedSettings, max_book_ahead_days: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Anticipación mínima (horas)</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={editedSettings.min_advance_hours || 1}
                    onChange={(e) => setEditedSettings({ ...editedSettings, min_advance_hours: parseFloat(e.target.value) || 1 })}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Tiempo mínimo antes de una cita para el mismo día
                  </small>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h3>🔐 Seguridad</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>PIN de administrador</label>
                  <input
                    type="text"
                    value={editedSettings.admin_pin || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings, admin_pin: e.target.value })}
                    placeholder="1234"
                  />
                </div>
                <div className="form-group">
                  <label>Purgar citas después de (días)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={editedSettings.purge_after_days}
                    onChange={(e) => setEditedSettings({ ...editedSettings, purge_after_days: parseInt(e.target.value) || 7 })}
                  />
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-large" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>{settings.business_name || 'Panel Admin'}</h1>
        </div>
        <div className="admin-header-right">
          <button className="btn btn-secondary btn-small" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      <nav className="admin-nav">
        <button className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Dashboard">
          <span className="tab-icon">📊</span>
          <span className="tab-text">Inicio</span>
        </button>
        <button className={`nav-tab ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')} title="Citas">
          <span className="tab-icon">📅</span>
          <span className="tab-text">Citas</span>
        </button>
        <button className={`nav-tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')} title="Servicios">
          <span className="tab-icon">✂️</span>
          <span className="tab-text">Servicios</span>
        </button>
        <button className={`nav-tab ${activeTab === 'barbers' ? 'active' : ''}`} onClick={() => setActiveTab('barbers')} title="Barberos">
          <span className="tab-icon">💈</span>
          <span className="tab-text">Barberos</span>
        </button>
        <button className={`nav-tab ${activeTab === 'unavailable' ? 'active' : ''}`} onClick={() => setActiveTab('unavailable')} title="Bloqueos">
          <span className="tab-icon">🚫</span>
          <span className="tab-text">Bloqueos</span>
        </button>
        <button className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} title="Configuración">
          <span className="tab-icon">⚙️</span>
          <span className="tab-text">Config</span>
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'dashboard' && <DashboardStats />}
        {activeTab === 'appointments' && <AppointmentsTable />}
        {activeTab === 'unavailable' && <UnavailableManager />}
        {activeTab === 'services' && <ServicesManager />}
        {activeTab === 'barbers' && <BarbersManager />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}

export default AdminDashboard;
