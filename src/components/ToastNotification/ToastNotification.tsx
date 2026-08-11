// ============================================
// COMPONENTE: ToastNotification
// Notificación flotante visible sin importar el scroll
// ============================================

import { useEffect } from 'react';
import './ToastNotification.css';

interface ToastNotificationProps {
  message: string | null;
  type?: 'error' | 'success' | 'warning' | 'info';
  onClose: () => void;
  duration?: number; // ms, default 6000
}

export function ToastNotification({
  message,
  type = 'error',
  onClose,
  duration = 6000,
}: ToastNotificationProps) {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const icons = {
    error: '⚠️',
    success: '✅',
    warning: '🔔',
    info: 'ℹ️',
  };

  return (
    <div className={`toast-notification toast-${type}`} role="alert">
      <div className="toast-content">
        <span className="toast-icon">{icons[type]}</span>
        <span className="toast-message">{message}</span>
      </div>
      <button
        type="button"
        className="toast-close-btn"
        onClick={onClose}
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );
}

export default ToastNotification;
