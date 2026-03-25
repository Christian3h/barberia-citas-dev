// ============================================
// COMPONENTE: CustomerForm
// Formulario de datos del cliente
// ============================================

import { useState, useEffect } from 'react';
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
  errors?: {
    customer_name?: string;
    phone?: string;
  };
}

function validateColombianPhone(phone: string): { valid: boolean; error: string } {
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

  if (!cleanPhone) return { valid: false, error: 'El teléfono es requerido' };

  let local = cleanPhone;
  if (cleanPhone.startsWith('+57')) local = cleanPhone.slice(3);
  else if (cleanPhone.startsWith('57') && cleanPhone.length > 10) local = cleanPhone.slice(2);

  if (!/^\d{10}$/.test(local))
    return { valid: false, error: 'El número debe tener 10 dígitos' };

  if (!local.startsWith('3'))
    return { valid: false, error: 'Los celulares colombianos comienzan con 3' };

  const validPrefixes = new Set([
    '300','301','302','303','304','305',
    '310','311','312','313','314',
    '315','316','317','318','319',
    '320','321','322','323','324','325',
    '340','341','342',
    '350','351',
  ]);

  if (!validPrefixes.has(local.substring(0, 3)))
    return { valid: false, error: 'Prefijo de operador no válido' };

  return { valid: true, error: '' };
}

export function CustomerForm({
  value,
  onChange,
  disabled = false,
  errors = {},
}: CustomerFormProps) {
  // Error interno del teléfono (validación al escribir/blur)
  // Solo se muestra si el padre no está enviando un error externo
  const [phoneLocalError, setPhoneLocalError] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Si el padre limpia su error externo, también limpiamos el interno
  useEffect(() => {
    if (!errors.phone) setPhoneLocalError('');
  }, [errors.phone]);

  // Validación en tiempo real (solo después de que el campo fue tocado)
  useEffect(() => {
    if (phoneTouched && value.phone && !errors.phone) {
      const { valid, error } = validateColombianPhone(value.phone);
      setPhoneLocalError(valid ? '' : error);
    }
  }, [value.phone, phoneTouched, errors.phone]);

  const handleChange = (field: keyof CustomerData, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    if (value.phone && !errors.phone) {
      const { valid, error } = validateColombianPhone(value.phone);
      setPhoneLocalError(valid ? '' : error);
    }
  };

  // El error que se muestra: el externo (del padre) tiene prioridad
  const phoneDisplayError = errors.phone || phoneLocalError;
  const nameDisplayError  = errors.customer_name;

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
          className={nameDisplayError ? 'input-error' : ''}
          required
        />
        {nameDisplayError && (
          <span className="field-error">⚠ {nameDisplayError}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="phone">Teléfono celular *</label>
        <input
          type="tel"
          id="phone"
          placeholder="300 123 4567"
          value={value.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={handlePhoneBlur}
          disabled={disabled}
          className={phoneDisplayError ? 'input-error' : ''}
          required
        />
        {phoneDisplayError && (
          <span className="field-error">⚠ {phoneDisplayError}</span>
        )}
        <small className="field-hint">Número de celular colombiano (10 dígitos)</small>
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