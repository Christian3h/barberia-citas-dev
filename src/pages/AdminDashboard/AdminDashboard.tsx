import { useState, useEffect } from 'react';
import { useAppointments, useUnavailable, useSettings, useBarbers, useServices, useBlockedDays } from '@/hooks';
import { getTodayString } from '@/utils';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { AppointmentsTable } from '@/components/admin/AppointmentsTable';
import { UnavailableManager } from '@/components/admin/UnavailableManager';
import { ServicesManager } from '@/components/admin/ServicesManager';
import { BarbersManager } from '@/components/admin/BarbersManager';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { BlockedDaysManager } from '@/components/admin/BlockedDaysManager';
import './AdminDashboard.css';

const SESSION_KEY = 'admin_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
type TabType = 'dashboard' | 'appointments' | 'unavailable' | 'services' | 'barbers' | 'settings';

const TABS = [
  { id: 'dashboard',    icon: '📊', label: 'Inicio' },
  { id: 'appointments', icon: '📅', label: 'Citas' },
  { id: 'services',     icon: '✂️', label: 'Servicios' },
  { id: 'barbers',      icon: '💈', label: 'Barberos' },
  { id: 'unavailable',  icon: '🚫', label: 'Bloqueos' },
  { id: 'settings',     icon: '⚙️', label: 'Config' },
] as const;

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  const { settings, loading: loadingSettings, updateSettings, refetch: refetchSettings } = useSettings();
  const { appointments: allAppointments, loading: loadingAppointments, cancelAppointment, completeAppointment } = useAppointments({});
  const { unavailable, loading: loadingUnavailable, createUnavailable, deleteUnavailable } = useUnavailable();
  const { barbers, refetch: refetchBarbers } = useBarbers({ includeInactive: true });
  const { allServices, refetch: refetchServices } = useServices();
  const { blockedDays, loading: loadingBlockedDays, updateBlockedDays } = useBlockedDays();

  const appointments = allAppointments.filter(apt => apt.date === selectedDate);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      const { authenticated, expiry } = JSON.parse(session);
      if (authenticated && expiry > Date.now()) setIsAuthenticated(true);
      else localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  if (loadingSettings) return (
    <div className="admin-login">
      <div className="login-card">
        <div className="login-icon">⏳</div>
        <h2>Cargando...</h2>
      </div>
    </div>
  );

  if (!isAuthenticated) return (
    <AdminLogin
      onLogin={() => setIsAuthenticated(true)}
      correctPin={settings.admin_pin || '1234'}
      sessionKey={SESSION_KEY}
      sessionDuration={SESSION_DURATION}
    />
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>{settings.business_name || 'Panel Admin'}</h1>
        </div>
        <div className="admin-header-right">
          <button className="btn btn-secondary btn-small" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <nav className="admin-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-text">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="admin-content">
        {activeTab === 'dashboard' && (
          <DashboardStats allAppointments={allAppointments} allServices={allServices} barbers={barbers} />
        )}
        {activeTab === 'appointments' && (
          <AppointmentsTable
            appointments={appointments}
            allServices={allServices}
            barbers={barbers}
            loading={loadingAppointments}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onComplete={completeAppointment}
            onCancel={cancelAppointment}
          />
        )}
        {activeTab === 'unavailable' && (
          <>
            <UnavailableManager
              unavailable={unavailable}
              barbers={barbers}
              onCreate={createUnavailable}
              onDelete={deleteUnavailable}
              loading={loadingUnavailable}
            />
            <BlockedDaysManager
              barbers={barbers}
              blockedDays={blockedDays}
              onUpdate={updateBlockedDays}
              loading={loadingBlockedDays}
            />
          </>
        )}
        {activeTab === 'services' && (
          <ServicesManager allServices={allServices} onRefetch={refetchServices} />
        )}
        {activeTab === 'barbers' && (
          <BarbersManager barbers={barbers} onRefetch={refetchBarbers} />
        )}
        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            loading={loadingSettings}
            onUpdate={updateSettings}
            onRefetch={refetchSettings}
          />
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;