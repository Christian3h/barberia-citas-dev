// ============================================
// COMPONENTE PRINCIPAL: App
// ============================================

import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookingPage, AdminDashboard } from '@/pages';
import { BarberPage } from '@/pages/BarberPage';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { Footer } from '@/components/Footer';
import '@/styles/globals.css';

function Navigation() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isBarber = location.pathname.startsWith('/barbero');
  const isPrivacy = location.pathname === '/privacidad';

  // Ocultar navegación en la vista del barbero y privacidad
  if (isBarber || isPrivacy) {
    return null;
  }

  // Si está en citas -> va a admin, si está en admin -> va a citas
  const destination = isAdmin ? '/' : '/admin';

  return (
    <nav className="main-nav">
      <Link to={destination} className="nav-brand">
        <img src="/images/LogoBlanco.PNG" style={{ width: '200px' }} alt="Logo" /> 
      </Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<BookingPage />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/barbero/:barberId" element={<BarberPage />} />
            <Route path="/privacidad" element={<PrivacyPolicy />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
