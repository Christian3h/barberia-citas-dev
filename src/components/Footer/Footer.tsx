// ============================================
// COMPONENTE: Footer
// Footer con información de contacto y enlaces legales
// ============================================

import { FaInstagram } from 'react-icons/fa';
import { FiFileText } from 'react-icons/fi';
import './Footer.css';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const openInstagram = () => {
    window.open('https://instagram.com/alex.profesional_barber', '_blank');
  };

  const openTikTok = () => {
    window.open('https://tiktok.com/@alex_officialbarber', '_blank');
  };

  const openPrivacy = () => {
    window.open('/privacidad', '_self');
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Sección principal */}
        <div className="footer-section footer-main">
          <div className="footer-logo">
            <span className="logo-icon">💈</span>
            <span className="logo-text">Alex Profesional Barber</span>
          </div>
          <p className="footer-tagline">
            Estilo profesional, tradición en cada corte. Reserva tu cita y luce impecable.
          </p>
          <div className="footer-social">
            <button 
              className="social-btn" 
              onClick={openInstagram}
              aria-label="Instagram"
              title="Síguenos en Instagram"
            >
              <FaInstagram size={20} />
            </button>
            <button 
              className="social-btn" 
              onClick={openTikTok}
              aria-label="TikTok"
              title="Síguenos en TikTok"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
              </svg>
            </button>
          </div>
          <p className="footer-location">
            📍 Sogamoso, Boyacá
          </p>
        </div>

        {/* Sección legal */}
        <div className="footer-section footer-legal">
          <h4 className="footer-title">Legal</h4>
          <ul className="footer-links">
            <li>
              <button className="footer-link-btn" onClick={openPrivacy}>
                <FiFileText size={16} />
                Política de Privacidad
              </button>
            </li>
          </ul>
        </div>

        {/* 
        <div className="footer-section footer-prigma">
          <h4 className="footer-title">Desarrollado por</h4>
          <ul className="footer-links">
            <li>
              <button className="footer-link-btn" onClick={openPrigma}>
                Prigma
              </button>
            </li>
          </ul>
        </div>
        */}
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <p>&copy; {currentYear} Alex Profesional Barber. Todos los derechos reservados.</p>
        <p className="footer-disclaimer">
          Sistema de agendamiento de citas - Barbería profesional
        </p>
      </div>
    </footer>
  );
}

export default Footer;