// ============================================
// COMPONENTE: ServiceSelector
// Selector de servicios de la barbería
// ============================================

import { useServices } from '@/hooks';
import { formatDuration } from '@/utils';
import './ServiceSelector.css';

interface ServiceSelectorProps {
  value: string;
  onChange: (serviceId: string, durationMin: number) => void;
  disabled?: boolean;
}

export function ServiceSelector({
  value,
  onChange,
  disabled = false,
}: ServiceSelectorProps) {
  const { services, loading } = useServices();

  const handleChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    onChange(serviceId, service?.duration_min || 30);
  };

  if (loading) {
    return <div className="service-selector-loading">Cargando servicios...</div>;
  }

  return (
    <div className="service-selector">
      <label className="service-selector-label">Selecciona un servicio</label>
      <div className="service-options">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            className={`service-option ${value === service.id ? 'selected' : ''}`}
            onClick={() => handleChange(service.id)}
            disabled={disabled}
          >
            <span className="service-name">{service.name}</span>
            <span className="service-details">
              <span className="service-duration">{formatDuration(service.duration_min)}</span>
              <span className="service-price">${service.price.toLocaleString()}</span>
            </span>
            {service.description && (
              <span className="service-description">{service.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ServiceSelector;
