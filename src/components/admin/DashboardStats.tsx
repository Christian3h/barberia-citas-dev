import type { Appointment, BarberService, User } from '@/types'

interface DashboardStatsProps {
  allAppointments: Appointment[]
  allServices: BarberService[]
  barbers: User[]
}

export function DashboardStats({
  allAppointments, allServices, barbers
}: DashboardStatsProps) {
  const today = new Date()
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  const todayApts = allAppointments
    .filter(a => String(a.date).trim() === todayStr)

  const pending   = todayApts.filter(a => a.status === 'scheduled').length
  const completed = todayApts.filter(a => a.status === 'done').length

  const revenue = todayApts
    .filter(a => a.status === 'done')
    .reduce((sum, a) => {
      const svc = allServices.find(
      s => s.name.trim() === a.service_name.trim()
  )
      return sum + (svc?.price ?? 0)
    }, 0)

  const upcoming = todayApts
    .filter(a => a.status === 'scheduled')
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))
    .slice(0, 5)

  return (
    <div className="admin-section">
      <h2>Resumen del día ({todayStr})</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{todayApts.length}</div>
          <div className="stat-label">Citas hoy</div>
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
          <div className="stat-value">
            ${revenue.toLocaleString()}
          </div>
          <div className="stat-label">Ingresos</div>
        </div>
      </div>

      <h3>Próximas citas</h3>
      {upcoming.length === 0 ? (
        <div className="empty-state">
          No hay citas pendientes
        </div>
      ) : (
        <div className="upcoming-list">
          {upcoming.map(apt => (
            <div key={apt.id} className="upcoming-item">
              <span className="upcoming-time">{apt.time}</span>
              <div className="upcoming-info">
                <div className="upcoming-customer">
                  {apt.customer_name}
                </div>
                <div className="upcoming-details">
                  {apt.service_name} ·{' '}
                  {barbers.find(b => b.id === apt.barber_id)?.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}