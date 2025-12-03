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
}

/**
 * Valida si un número de teléfono es válido para Colombia
 * Formatos válidos:
 * - 10 dígitos comenzando con 3 (celular): 3001234567
 * - Con código de país +57: +573001234567
 * - Con espacios o guiones: 300 123 4567, 300-123-4567
 */
function validateColombianPhone(phone: string): { valid: boolean; error: string } {
  // Limpiar el número de espacios, guiones y paréntesis
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Si está vacío
  if (!cleanPhone) {
    return { valid: false, error: 'El teléfono es requerido' };
  }
  
  // Verificar si tiene código de país +57 o 57
  let numberWithoutCountry = cleanPhone;
  if (cleanPhone.startsWith('+57')) {
    numberWithoutCountry = cleanPhone.slice(3);
  } else if (cleanPhone.startsWith('57') && cleanPhone.length > 10) {
    numberWithoutCountry = cleanPhone.slice(2);
  }
  
  // Debe tener exactamente 10 dígitos
  if (!/^\d{10}$/.test(numberWithoutCountry)) {
    return { valid: false, error: 'El número debe tener 10 dígitos' };
  }
  
  // Celulares colombianos comienzan con 3
  if (!numberWithoutCountry.startsWith('3')) {
    return { valid: false, error: 'Los celulares colombianos comienzan con 3' };
  }
  
  // Validar prefijos de operadores colombianos válidos (30x, 31x, 32x, 33x, 35x)
  const prefix = numberWithoutCountry.substring(0, 3);
  const validPrefixes = ['300', '301', '302', '303', '304', '305', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321', '322', '323', '324', '325', '350', '351'];
  
  if (!validPrefixes.includes(prefix)) {
    return { valid: false, error: 'Prefijo de operador no válido' };
  }
  
  return { valid: true, error: '' };
}

/**
 * Formatea el número de teléfono para mostrar
 */
function formatPhoneDisplay(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  
  // Si tiene código de país, removerlo para el formato
  let number = clean;
  if (clean.startsWith('57') && clean.length > 10) {
    number = clean.slice(2);
  }
  
  // Formato: 300 123 4567
  if (number.length === 10) {
    return `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }
  
  return phone;
}

export function CustomerForm({
  value,
  onChange,
  disabled = false,
}: CustomerFormProps) {
  const [phoneError, setPhoneError] = useState<string>('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (phoneTouched && value.phone) {
      const validation = validateColombianPhone(value.phone);
      setPhoneError(validation.valid ? '' : validation.error);
    }
  }, [value.phone, phoneTouched]);

  const handleChange = (field: keyof CustomerData, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    if (value.phone) {
      const validation = validateColombianPhone(value.phone);
      setPhoneError(validation.valid ? '' : validation.error);
    }
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
        <label htmlFor="phone">Teléfono celular *</label>
        <input
          type="tel"
          id="phone"
          placeholder="300 123 4567"
          value={value.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={handlePhoneBlur}
          disabled={disabled}
          required
          className={phoneError ? 'input-error' : ''}
        />
        {phoneError && <span className="field-error">{phoneError}</span>}
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
