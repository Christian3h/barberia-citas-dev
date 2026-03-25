// ============================================
// COMPONENTE: BarberSelector
// Selector de barberos
// ============================================

import { useBarbers } from '@/hooks';
import './BarberSelector.css';

interface BarberSelectorProps {
  value: string;
  onChange: (barberId: string) => void;
  disabled?: boolean;
  error?: string;
}

export function BarberSelector({
  value,
  onChange,
  disabled = false,
  error,
}: BarberSelectorProps) {
  const { barbers, loading } = useBarbers();

  if (loading) {
    return <div className="barber-selector-loading">Cargando barberos...</div>;
  }

  if (barbers.length === 0) {
    return <div className="barber-selector-empty">No hay barberos disponibles</div>;
  }

  return (
    <div className="barber-selector">
      <label className="barber-selector-label">Selecciona un barbero</label>
      <div className={`barber-options ${error ? 'has-error' : ''}`}>
        {barbers.map((barber) => (
          <button
            key={barber.id}
            type="button"
            className={`barber-option ${value === barber.id ? 'selected' : ''}`}
            onClick={() => onChange(barber.id)}
            disabled={disabled}
          >
            <div className="barber-avatar">
              {barber.name.charAt(0).toUpperCase()}
            </div>
            <span className="barber-name">{barber.name}</span>
          </button>
        ))}
      </div>
      {error && <span className="field-error">⚠ {error}</span>}
    </div>
  );
}

export default BarberSelector;