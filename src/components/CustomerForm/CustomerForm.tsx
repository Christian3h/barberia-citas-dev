// ============================================
// COMPONENTE: CustomerForm
// Formulario de datos del cliente
// ============================================

import './CustomerForm.css';

interface CustomerData {
  customer_name: string;
  phone: string;
  notes?: string;
}

interface CustomerFormProps {
  value: CustomerData;
  onChange: (data: CustomerData) => void;
  disabled?: boolean;
}

export function CustomerForm({
  value,
  onChange,
  disabled = false,
}: CustomerFormProps) {
  const handleChange = (field: keyof CustomerData, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  return (
    <div className="customer-form">
      <h3 className="customer-form-title">Tus datos</h3>

      <div className="form-group">
        <label htmlFor="customer_name">Nombre completo *</label>
        <input
          type="text"
          id="customer_name"
          placeholder="Tu nombre"
          value={value.customer_name}
          onChange={(e) => handleChange('customer_name', e.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Teléfono *</label>
        <input
          type="tel"
          id="phone"
          placeholder="300 123 4567"
          value={value.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notas adicionales (opcional)</label>
        <textarea
          id="notes"
          placeholder="¿Alguna preferencia o indicación especial?"
          value={value.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          disabled={disabled}
          rows={3}
        />
      </div>
    </div>
  );
}

export default CustomerForm;
