/**
 * Valida si un número de teléfono es válido para Colombia.
 * Acepta formatos: 3001234567 | +573001234567 | 573001234567
 * Cubre operadoras Claro, Movistar, Tigo, WOM, ETB móvil y otros MVNOs.
 */
export function validColombianPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-\(\)\.]/g, '');

  let local = clean;
  if (clean.startsWith('+57')) {
    local = clean.slice(3);
  } else if (clean.startsWith('57') && clean.length > 10) {
    local = clean.slice(2);
  }

  // Debe ser exactamente 10 dígitos y comenzar con 3
  if (!/^3\d{9}$/.test(local)) return false;

  const prefix = local.substring(0, 3);

  // Prefijos móviles colombianos vigentes (MinTIC)
  const validPrefixes = new Set([
    // Claro
    '300', '301', '302', '303', '304', '305',
    // Movistar
    '310', '311', '312', '313', '314',
    // Tigo
    '315', '316', '317', '318', '319',
    // WOM
    '320', '321', '322', '323', '324', '325',
    // ETB móvil / otros
    '350', '351',
    // Digitel / Avantel / MVNOs
    '340', '341', '342',
  ]);

  return validPrefixes.has(prefix);
}