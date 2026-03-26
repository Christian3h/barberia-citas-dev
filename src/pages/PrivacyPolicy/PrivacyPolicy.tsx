// ============================================
// PÁGINA: Política de Privacidad
// ============================================

import { FaUserShield, FaLock, FaEye, FaCheckCircle } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';
import './PrivacyPolicy.css';

const PRIGMA_URL = 'https://prigma.onrender.com';

export function PrivacyPolicy() {
  const goBack = () => {
    window.history.back();
  };

  const openPrigma = () => {
    window.open(PRIGMA_URL, '_blank');
  };

  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <button className="back-btn" onClick={goBack}>
          <FiArrowLeft size={18} />
          Volver
        </button>

        <header className="privacy-header">
          <FaUserShield className="privacy-icon" size={48} />
          <h1>Política de Privacidad</h1>
          <p className="privacy-date">Última actualización: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </header>

        <section className="privacy-section">
          <h2><FaLock size={20} /> Introducción</h2>
          <p>
            En <strong>Alex Profesional Barber</strong>, valoramos y respetamos su privacidad. 
            Esta política de privacidad describe cómo recopilamos, usamos, almacenamos y 
            protegemos su información personal cuando utiliza nuestro sistema de agendamiento de citas.
          </p>
        </section>

        <section className="privacy-section">
          <h2><FaEye size={20} /> Información que recopilamos</h2>
          <ul>
            <li><strong>Información de contacto:</strong> Nombre completo y número de teléfono móvil colombiano.</li>
            <li><strong>Notas opcionales:</strong> Cualquier preferencia o indicación que usted proporcione.</li>
            <li><strong>Datos de cita:</strong> Fecha, hora y servicio seleccionado.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2><FaUserShield size={20} /> Cómo usamos su información</h2>
          <p>Utilizamos su información exclusivamente para:</p>
          <ul>
            <li>Gestionar y confirmar sus citas de barbería.</li>
            <li>Comunicarnos con usted respecto a cambios o recordatorios de citas.</li>
            <li>Mejorar nuestros servicios basándonos en sus preferencias.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2><FaLock size={20} /> Protección de datos</h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas para proteger 
            su información personal contra accesos no autorizados, divulgación o modificación.
            Sus datos se almacenan de forma segura y no se comparten con terceros no autorizados.
          </p>
        </section>

        <section className="privacy-section">
          <h2><FaCheckCircle size={20} /> Sus derechos</h2>
          <p>Como usuario, usted tiene derecho a:</p>
          <ul>
            <li>Acceder a sus datos personales almacenados.</li>
            <li>Solicitar la corrección de datos incorrectos.</li>
            <li>Solicitar la eliminación de sus datos.</li>
            <li>Oponerse al tratamiento de sus datos.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>Contacto</h2>
          <p>
            Si tiene preguntas sobre esta política de privacidad o desea ejercer sus derechos, 
            puede contactar al desarrollador del sistema:
          </p>
          <div className="contact-info">
            <button className="contact-btn" onClick={openPrigma}>
              Contactar a Prigma
            </button>
          </div>
        </section>

        <footer className="privacy-footer">
          <p>
            Al utilizar nuestro sistema de agendamiento, usted acepta los términos 
            descritos en esta política de privacidad.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default PrivacyPolicy;