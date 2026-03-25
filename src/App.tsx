// ============================================
// COMPONENTE PRINCIPAL: App
// ============================================

import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookingPage, AdminDashboard } from '@/pages';
import { BarberPage } from '@/pages/BarberPage';
import '@/styles/globals.css';

function Navigation() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isBarber = location.pathname.startsWith('/barbero');

  // Ocultar navegación en la vista del barbero
  if (isBarber) {
    return null;
  }

  // Si está en citas -> va a admin, si está en admin -> va a citas
  const destination = isAdmin ? '/' : '/admin';

  return (
    <nav className="main-nav">
      <Link to={destination} className="nav-brand">
        <img src="/src/assets/images/LogoBlanco.PNG" style={{ width: '200px', height: 'auto' }} alt="Logo" /> 
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
