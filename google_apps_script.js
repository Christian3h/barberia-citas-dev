/**
 * ============================================
 * GOOGLE APPS SCRIPT - BARBERÍA
 * v2.0 — Refactor completo
 * ============================================
 *
 * CAMBIOS v2.0:
 * - Función centralizada parseDatetimeBogota() como fuente de verdad de fechas
 * - Timezone Colombia (UTC-5) aplicado correctamente en toda la app
 * - Ventanas de recordatorio configurables desde Settings (no hardcodeadas)
 * - Recordatorios usan datetime_iso guardado, no reconstruyen la fecha
 * - Purga maneja citas 'scheduled' antiguas con setting propio
 * - Logging estructurado con niveles INFO/WARN/ERROR
 * - barberMap unificado, eliminado dead code de getBarberName standalone
 * - Validación de teléfono estricta (12 dígitos para Colombia)
 * - Idempotencia en createAppointment con LockService + check duplicado
 * - switch/case con bloques {} para evitar hoisting issues
 * - setupAllTriggers seguro: solo borra triggers propios
 * - Archive con validación de headers
 * - getSettings diferencia keys públicas de privadas
 * - Email (Resend) preparado como feature flag: se activa con setting email_enabled = true
 *
 * INSTRUCCIONES:
 * 1. Abrir tu Google Spreadsheet
 * 2. Ir a Extensiones > Apps Script
 * 3. Pegar este código reemplazando el anterior
 * 4. Ejecutar setupConfig() UNA VEZ para inicializar secretos
 * 5. Ejecutar setupSheetSettings() UNA VEZ para agregar los nuevos settings a la hoja
 * 6. Ejecutar setupAllTriggers() para configurar triggers
 * 7. Desplegar como Web App (acceso: Cualquiera)
 *
 * SETTINGS requeridos en la hoja "Settings" (columnas: key | value | description):
 *   purge_after_days            7     Días para purgar citas done/cancelled
 *   purge_scheduled_after_days  3     Días para purgar citas scheduled sin actualizar
 *   reminder_60_upper           65    Minuto superior ventana recordatorio 1h
 *   reminder_60_lower           50    Minuto inferior ventana recordatorio 1h
 *   reminder_15_upper           20    Minuto superior ventana recordatorio 15min
 *   reminder_15_lower           5     Minuto inferior ventana recordatorio 15min
 *   timezone_offset             -5    Offset UTC de la barbería (Colombia = -5)
 *   email_enabled               false Activar envío de emails (true/false)
 */

// ============================================
// LOGGING ESTRUCTURADO
// ============================================

const LOG_LEVEL = 'INFO'; // 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

function log(level, context, message, data) {
  if (LOG_LEVELS[level] < LOG_LEVELS[LOG_LEVEL]) return;
  const ts = new Date().toISOString();
  const dataStr = data ? ' | ' + JSON.stringify(data) : '';
  Logger.log(`[${ts}] [${level}] [${context}] ${message}${dataStr}`);
}

// ============================================
// CONFIGURACIÓN — PropertiesService
// ============================================

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    RESEND_API_KEY:    props.getProperty('RESEND_API_KEY')    || '',
    EVOLUTION_API_KEY: props.getProperty('EVOLUTION_API_KEY') || '',
    WEB_APP_API_KEY:   props.getProperty('WEB_APP_API_KEY')   || ''
  };
}

function setupConfig() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    RESEND_API_KEY:    're_TU_API_KEY_AQUI',
    EVOLUTION_API_KEY: 'Malditogoogle2020Alex',
    WEB_APP_API_KEY:   Utilities.getUuid()
  });
  log('INFO', 'setup', 'Config inicializada', {
    WEB_APP_API_KEY: props.getProperty('WEB_APP_API_KEY')
  });
}

// ============================================
// SETUP DE SETTINGS EN LA HOJA
// ============================================

function setupSheetSettings() {
  const defaults = [
    ['evolution_api_url',           'http://evolution-api-7ff8.onrender.com', 'URL de tu servidor Evolution API'],
    ['instance_name',               'mi wasa',                                'Nombre de la instancia de WhatsApp'],
    ['timezone_offset',             -5,    'Offset UTC de la barbería (Colombia = -5)'],
    ['purge_after_days',            7,     'Días para purgar citas done/cancelled'],
    ['purge_scheduled_after_days',  3,     'Días para purgar citas scheduled antiguas'],
    ['reminder_60_upper',           65,    'Minuto superior ventana recordatorio 1h'],
    ['reminder_60_lower',           50,    'Minuto inferior ventana recordatorio 1h'],
    ['reminder_15_upper',           20,    'Minuto superior ventana recordatorio 15min'],
    ['reminder_15_lower',           5,     'Minuto inferior ventana recordatorio 15min'],
    ['email_enabled',               false, 'Activar envío de emails via Resend (true/false)']
  ];

  const existing = getSettings();
  const existingKeys = existing.success ? Object.keys(existing.data) : [];

  for (const [key, value, description] of defaults) {
    if (!existingKeys.includes(key)) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('Settings');
      if (sheet) {
        sheet.appendRow([key, value, description]);
        log('INFO', 'setup', 'Setting agregado', { key, value });
      }
    } else {
      log('DEBUG', 'setup', 'Setting ya existe, omitido', { key });
    }
  }

  log('INFO', 'setup', 'setupSheetSettings completado');
}

// ============================================
// UTILIDADES DE FECHA — Fuente de verdad única
// ============================================

function parseDatetimeBogota(dateInput, timeInput, tzOffset) {
  const offset = typeof tzOffset === 'number' ? tzOffset : -5;
  try {
    if (typeof dateInput === 'string' && dateInput.includes('T') && dateInput.endsWith('Z')) {
      const d = new Date(dateInput);
      return isNaN(d.getTime()) ? null : d;
    }

    let datePart;
    if (dateInput instanceof Date) {
      const y = dateInput.getUTCFullYear();
      const m = String(dateInput.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateInput.getUTCDate()).padStart(2, '0');
      datePart = `${y}-${m}-${d}`;
    } else {
      datePart = String(dateInput).trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) {
        const parts = datePart.split('/');
        datePart = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    let timePart;
    if (typeof timeInput === 'number') {
      const totalMinutes = Math.round(timeInput * 1440);
      const hh = Math.floor(totalMinutes / 60);
      const mm = totalMinutes % 60;
      timePart = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    } else if (timeInput instanceof Date) {
      const hh = String(timeInput.getHours()).padStart(2, '0');
      const mm = String(timeInput.getMinutes()).padStart(2, '0');
      timePart = `${hh}:${mm}`;
    } else {
      timePart = String(timeInput).trim();
      if (/^\d{1}:\d{2}$/.test(timePart)) {
        timePart = '0' + timePart;
      }
    }

    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const offsetStr = `${sign}${String(absOffset).padStart(2, '0')}:00`;
    const isoString = `${datePart}T${timePart}:00${offsetStr}`;

    const result = new Date(isoString);
    if (isNaN(result.getTime())) {
      log('WARN', 'parseDatetime', 'Fecha inválida construida', { dateInput, timeInput, isoString });
      return null;
    }
    return result;
  } catch (e) {
    log('ERROR', 'parseDatetime', 'Excepción al parsear fecha', { dateInput, timeInput, error: e.message });
    return null;
  }
}

function getNowBogota(tzOffset) {
  return new Date();
}

function formatDateLocal(date, tzOffset) {
  const offset = typeof tzOffset === 'number' ? tzOffset : -5;
  const localMs = date.getTime() + offset * 3600000;
  const localDate = new Date(localMs);
  const y = localDate.getUTCFullYear();
  const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(localDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================
// SETTINGS — Lectura y escritura
// ============================================

function getSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return { error: 'Hoja Settings no encontrada' };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: {} };
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    if (key) settings[key] = data[i][1];
  }
  return { success: true, data: settings };
}

function updateSetting(key, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return { error: 'Hoja Settings no encontrada' };
  const data = sheet.getDataRange().getValues();
  const keyStr = String(key).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === keyStr) {
      sheet.getRange(i + 1, 2).setValue(value);
      return { success: true, key: keyStr, value };
    }
  }
  sheet.appendRow([keyStr, value, '']);
  return { success: true, key: keyStr, value, created: true };
}

function getPublicSettings() {
  const result = getSettings();
  if (!result.success) return result;
  const PUBLIC_KEYS = [
    'business_name', 'business_phone', 'business_address',
    'open_time', 'close_time', 'slot_duration_min',
    'timezone_offset'
  ];
  const publicData = {};
  for (const key of PUBLIC_KEYS) {
    if (result.data[key] !== undefined) {
      publicData[key] = result.data[key];
    }
  }
  return { success: true, data: publicData };
}

// ============================================
// CRUD GENÉRICO
// ============================================

function insertRow(sheetName, data, autoId = true) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: `Hoja "${sheetName}" no encontrada` };
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return { error: `La hoja "${sheetName}" no tiene columnas` };
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (!headers[0]) return { error: `La hoja "${sheetName}" no tiene headers válidos` };
  const id = autoId ? Utilities.getUuid() : (data.id || Utilities.getUuid());
  const newRow = headers.map(header => {
    if (header === 'id')         return id;
    if (header === 'created_at') return new Date().toISOString();
    return data[header] !== undefined ? data[header] : '';
  });
  sheet.appendRow(newRow);
  return { success: true, id, data };
}

function updateRow(sheetName, id, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: `Hoja "${sheetName}" no encontrada` };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  if (idCol === -1) return { error: 'No se encontró columna "id"' };
  const idStr = String(id).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === idStr) {
      for (const [key, value] of Object.entries(updates)) {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) sheet.getRange(i + 1, colIndex + 1).setValue(value);
      }
      return { success: true, id: idStr };
    }
  }
  return { error: `No se encontró registro con id: ${idStr}` };
}

function deleteRow(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: `Hoja "${sheetName}" no encontrada` };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  if (idCol === -1) return { error: 'No se encontró columna "id"' };
  const idStr = String(id).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === idStr) {
      sheet.deleteRow(i + 1);
      return { success: true, id: idStr };
    }
  }
  return { error: `No se encontró registro con id: ${idStr}` };
}

function getAll(sheetName, filters = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: `Hoja "${sheetName}" no encontrada` };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };
  const headers = data[0];
  let records = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => { obj[header] = row[i]; });
    return obj;
  });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      records = records.filter(r => r[key] == value);
    }
  }
  return { success: true, data: records };
}

// ============================================
// VALIDACIÓN DE TELÉFONO
// ============================================

function normalizeAndValidatePhone(phone) {
  if (!phone) return { valid: false, error: 'Teléfono vacío' };
  const digits = String(phone).replace(/\D/g, '');
  let normalized;
  if (digits.startsWith('57') && digits.length === 12) {
    normalized = digits;
  } else if (digits.startsWith('3') && digits.length === 10) {
    normalized = '57' + digits;
  } else if (digits.startsWith('573') && digits.length === 12) {
    normalized = digits;
  } else {
    return { valid: false, normalized: digits, error: `Formato inválido: ${digits} (${digits.length} dígitos)` };
  }
  if (!/^57\d{10}$/.test(normalized)) {
    return { valid: false, normalized, error: 'No cumple formato 57XXXXXXXXXX' };
  }
  return { valid: true, normalized };
}

// ============================================
// APPOINTMENTS — Citas
// ============================================

function getServiceDuration(serviceId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Services');
  if (!sheet) return 30;
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 30;
  const headers = data[0];
  const idCol       = headers.indexOf('id');
  const nameCol     = headers.indexOf('name');
  const durationCol = headers.indexOf('duration_min');
  if (durationCol === -1) return 30;
  const serviceStr = String(serviceId).trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    const matchById   = idCol !== -1   && String(data[i][idCol]).trim() === serviceStr;
    const matchByName = nameCol !== -1 && String(data[i][nameCol]).trim().toLowerCase() === serviceStr;
    if (matchById || matchByName) {
      const duration = parseInt(data[i][durationCol]);
      return isNaN(duration) || duration <= 0 ? 30 : duration;
    }
  }
  return 30;
}

function createAppointment(data) {
  log('INFO', 'createAppointment', 'Iniciando', { barber_id: data.barber_id, date: data.date, time: data.time });
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { error: 'El sistema está ocupado, intenta de nuevo en unos segundos' };
  }
  try {
    const settingsResult = getSettings();
    const settings = settingsResult.success ? settingsResult.data : {};
    const tzOffset = parseFloat(settings.timezone_offset) || -5;

    const existing = getAll('Appointments', { barber_id: data.barber_id, date: data.date, time: data.time, status: 'scheduled' });
    if (existing.success && existing.data.length > 0) {
      log('WARN', 'createAppointment', 'Duplicado detectado', { barber_id: data.barber_id, date: data.date, time: data.time });
      return { error: 'Ya existe una cita para ese barbero en esa fecha y hora' };
    }

    const appointmentDate = parseDatetimeBogota(data.date, data.time, tzOffset);
    if (!appointmentDate) {
      return { error: `No se pudo parsear la fecha: ${data.date} ${data.time}` };
    }

    const phoneResult = normalizeAndValidatePhone(data.phone);
    if (!phoneResult.valid) {
      log('WARN', 'createAppointment', 'Teléfono inválido', { phone: data.phone, error: phoneResult.error });
    }

    const serviceDuration = getServiceDuration(data.service_name);

    const appointmentData = {
      barber_id:       data.barber_id,
      customer_name:   data.customer_name,
      phone:           data.phone || '',
      email:           data.email || '',
      service_name:    data.service_name,
      date:            data.date,
      time:            data.time,
      duration_min:    serviceDuration,
      datetime_iso:    appointmentDate.toISOString(),
      status:          'scheduled',
      reminder_60min:  false,
      reminder_15min:  false,
      notes:           data.notes || ''
    };

    const insertResult = insertRow('Appointments', appointmentData);

    if (insertResult.success) {
      const emailEnabled = String(settings.email_enabled).toLowerCase();
      if (emailEnabled === 'true' && data.email && data.email.trim() !== '') {
        const barberMap = buildBarberMap();
        const barberName = barberMap[data.barber_id] || data.barber_id;
        sendConfirmationEmail({
          email:         data.email,
          customer_name: data.customer_name,
          date:          data.date,
          time:          data.time,
          service_name:  data.service_name,
          barber_name:   barberName
        });
      }
    }

    log('INFO', 'createAppointment', 'Cita creada', { id: insertResult.id });
    return insertResult;

  } finally {
    lock.releaseLock();
  }
}

function updateAppointmentStatus(id, status) {
  return updateRow('Appointments', id, { status });
}

// ============================================
// BARBER MAP
// ============================================

function buildBarberMap() {
  const result = getAll('Users');
  if (!result.success) return {};
  const map = {};
  for (const user of result.data) {
    if (user.id) map[String(user.id).trim()] = user.name || user.id;
  }
  return map;
}

// ============================================
// PURGA DE CITAS ANTIGUAS
// ============================================

function purgeOldAppointments() {
  log('INFO', 'purge', 'Iniciando purga de citas antiguas');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appointmentsSheet = ss.getSheetByName('Appointments');
  const archiveSheet      = ss.getSheetByName('Archive');
  if (!appointmentsSheet || !archiveSheet) {
    log('ERROR', 'purge', 'Hojas requeridas no encontradas (Appointments, Archive)');
    return;
  }
  const settingsResult = getSettings();
  const settings = settingsResult.success ? settingsResult.data : {};
  const tzOffset              = parseFloat(settings.timezone_offset)             || -5;
  const purgeAfterDays        = parseInt(settings.purge_after_days)              || 7;
  const purgeScheduledAfterDays = parseInt(settings.purge_scheduled_after_days)  || 3;

  const now = getNowBogota(tzOffset);
  const cutoffDoneMs      = now.getTime() - purgeAfterDays        * 86400000;
  const cutoffScheduledMs = now.getTime() - purgeScheduledAfterDays * 86400000;
  const cutoffDone      = new Date(cutoffDoneMs);
  const cutoffScheduled = new Date(cutoffScheduledMs);

  const data = appointmentsSheet.getDataRange().getValues();
  const headers = data[0];
  const datetimeIsoCol = headers.indexOf('datetime_iso');
  const dateCol        = headers.indexOf('date');
  const timeCol        = headers.indexOf('time');
  const statusCol      = headers.indexOf('status');

  if (statusCol === -1) {
    log('ERROR', 'purge', 'Columna "status" no encontrada');
    return;
  }

  const rowsToArchive      = [];
  const rowIndicesToDelete = [];

  for (let i = 1; i < data.length; i++) {
    const row    = data[i];
    const status = String(row[statusCol]).trim().toLowerCase();
    let appointmentDate = null;

    if (datetimeIsoCol !== -1 && row[datetimeIsoCol]) {
      appointmentDate = parseDatetimeBogota(row[datetimeIsoCol], null, tzOffset);
    }
    if (!appointmentDate && dateCol !== -1) {
      const timeVal = timeCol !== -1 ? row[timeCol] : '00:00';
      appointmentDate = parseDatetimeBogota(row[dateCol], timeVal, tzOffset);
    }
    if (!appointmentDate) {
      log('WARN', 'purge', `Fila ${i + 1}: no se pudo parsear fecha, omitiendo`);
      continue;
    }

    let shouldPurge = false;
    if ((status === 'done' || status === 'cancelled') && appointmentDate < cutoffDone) {
      shouldPurge = true;
    } else if (status === 'scheduled' && appointmentDate < cutoffScheduled) {
      shouldPurge = true;
    }

    if (shouldPurge) {
      rowsToArchive.push(row);
      rowIndicesToDelete.push(i + 1);
    }
  }

  if (rowsToArchive.length === 0) {
    log('INFO', 'purge', 'No hay citas para archivar');
    return;
  }

  const archiveLastRow = archiveSheet.getLastRow();
  if (archiveLastRow === 0) {
    archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    archiveSheet.getRange(2, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);
  } else {
    const archiveHeaders = archiveSheet.getRange(1, 1, 1, archiveSheet.getLastColumn()).getValues()[0];
    if (!archiveHeaders[0]) {
      archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    archiveSheet.getRange(archiveLastRow + 1, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);
  }

  rowIndicesToDelete.sort((a, b) => b - a);
  for (const rowIndex of rowIndicesToDelete) {
    appointmentsSheet.deleteRow(rowIndex);
  }
  log('INFO', 'purge', `Purga completada`, { archivadas: rowsToArchive.length });
}

// ============================================
// RECORDATORIOS DE CITAS POR WHATSAPP
// ============================================

function sendWhatsAppMessage(phone, message, baseUrl, apiKey, instanceName) {
  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
  const MAX_RETRIES = 3;
  const BACKOFF_MS  = [2000, 4000, 8000];
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, {
        method:          'POST',
        contentType:     'application/json',
        headers:         { apikey: apiKey },
        payload:         JSON.stringify({ number: phone, text: message }),
        muteHttpExceptions: true
      });
      const code   = response.getResponseCode();
      const body   = response.getContentText();
      let result;
      try { result = JSON.parse(body); } catch (_) { result = { raw: body }; }
      if (code === 200 || code === 201) {
        log('INFO', 'whatsapp', `Mensaje enviado a ${phone} (intento ${attempt + 1})`);
        return { success: true };
      }
      log('WARN', 'whatsapp', `Respuesta ${code} en intento ${attempt + 1}`, { phone, result });
      if (code < 500) {
        return { success: false, error: result.message || result.error || `HTTP ${code}` };
      }
      if (attempt < MAX_RETRIES - 1) {
        Utilities.sleep(BACKOFF_MS[attempt]);
      }
    } catch (e) {
      log('ERROR', 'whatsapp', `Excepción en intento ${attempt + 1}`, { phone, error: e.message });
      if (attempt < MAX_RETRIES - 1) {
        Utilities.sleep(BACKOFF_MS[attempt]);
      } else {
        return { success: false, error: e.message };
      }
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

function sendAppointmentReminders() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    log('WARN', 'reminders', 'No se pudo adquirir lock', { error: e.message });
    return { success: false, error: 'Lock timeout' };
  }
  try {
    const config = getConfig();
    const { EVOLUTION_API_KEY } = config;
    if (!EVOLUTION_API_KEY) {
      log('ERROR', 'reminders', 'EVOLUTION_API_KEY no configurada. Ejecutar setupConfig()');
      return { success: false, error: 'Missing EVOLUTION_API_KEY' };
    }
    const settingsResult = getSettings();
    const settings = settingsResult.success ? settingsResult.data : {};
    const EVOLUTION_API_URL = String(settings.evolution_api_url || '').trim();
    const INSTANCE_NAME     = String(settings.instance_name     || '').trim();
    if (!EVOLUTION_API_URL || !INSTANCE_NAME) {
      log('ERROR', 'reminders', 'evolution_api_url o instance_name no configurados en Settings');
      return { success: false, error: 'Missing evolution_api_url or instance_name in Settings' };
    }
    const tzOffset = parseFloat(settings.timezone_offset) || -5;
    const r60Upper = parseFloat(settings.reminder_60_upper) || 65;
    const r60Lower = parseFloat(settings.reminder_60_lower) || 50;
    const r15Upper = parseFloat(settings.reminder_15_upper) || 20;
    const r15Lower = parseFloat(settings.reminder_15_lower) || 5;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Appointments');
    if (!sheet) {
      log('ERROR', 'reminders', 'Hoja Appointments no encontrada');
      return { success: false, error: 'Appointments sheet not found' };
    }
    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const datetimeIsoCol = headers.indexOf('datetime_iso');
    const dateCol        = headers.indexOf('date');
    const timeCol        = headers.indexOf('time');
    const phoneCol       = headers.indexOf('phone');
    const nameCol        = headers.indexOf('customer_name');
    const serviceCol     = headers.indexOf('service_name');
    const barberIdCol    = headers.indexOf('barber_id');
    const statusCol      = headers.indexOf('status');
    const reminder60Col  = headers.indexOf('reminder_60min');
    const reminder15Col  = headers.indexOf('reminder_15min');

    if (statusCol === -1 || phoneCol === -1) {
      log('ERROR', 'reminders', 'Faltan columnas requeridas (status, phone)');
      return { success: false, error: 'Missing required columns' };
    }
    const now = getNowBogota(tzOffset);
    const candidates = [];
    for (let i = 1; i < data.length; i++) {
      const status = String(data[i][statusCol]).trim().toLowerCase();
      if (status !== 'scheduled') continue;
      const r60 = reminder60Col !== -1 ? data[i][reminder60Col] : false;
      const r15 = reminder15Col !== -1 ? data[i][reminder15Col] : false;
      if (isTruthy(r60) && isTruthy(r15)) continue;
      candidates.push(i);
    }
    if (candidates.length === 0) {
      log('INFO', 'reminders', 'No hay citas candidatas para recordatorio');
      return { success: true, sent: 0 };
    }

    const barberMap = buildBarberMap();
    let sentCount = 0;
    for (const i of candidates) {
      const row = data[i];
      let appointmentDate = null;
      if (datetimeIsoCol !== -1 && row[datetimeIsoCol]) {
        appointmentDate = parseDatetimeBogota(row[datetimeIsoCol], null, tzOffset);
      }
      if (!appointmentDate && dateCol !== -1) {
        const timeVal = timeCol !== -1 ? row[timeCol] : '00:00';
        appointmentDate = parseDatetimeBogota(row[dateCol], timeVal, tzOffset);
      }
      if (!appointmentDate) {
        continue;
      }
      if (appointmentDate <= now) {
        continue;
      }
      const diffMin = (appointmentDate.getTime() - now.getTime()) / 60000;
      const phoneResult = normalizeAndValidatePhone(row[phoneCol]);
      if (!phoneResult.valid) {
        continue;
      }
      const phone      = phoneResult.normalized;
      const name       = row[nameCol]      || 'Cliente';
      const service    = row[serviceCol]   || '';
      const barberName = barberMap[String(row[barberIdCol]).trim()] || '';
      const datePart = formatDateLocal(appointmentDate, tzOffset);
      const timePart = formatTimeLocal(appointmentDate, tzOffset);

      const r60Already = reminder60Col !== -1 ? isTruthy(row[reminder60Col]) : false;
      if (!r60Already && diffMin > r60Lower && diffMin <= r60Upper) {
        const msg = buildReminderMessage(name, datePart, timePart, service, barberName, 60);
        const result = sendWhatsAppMessage(phone, msg, EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME);
        if (result.success) {
          markReminderSent(sheet, headers, i, 'reminder_60min', reminder60Col);
          sentCount++;
          Utilities.sleep(1000);
        }
      }
      const r15Already = reminder15Col !== -1 ? isTruthy(row[reminder15Col]) : false;
      if (!r15Already && diffMin > r15Lower && diffMin <= r15Upper) {
        const msg = buildReminderMessage(name, datePart, timePart, service, barberName, 15);
        const result = sendWhatsAppMessage(phone, msg, EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME);
        if (result.success) {
          markReminderSent(sheet, headers, i, 'reminder_15min', reminder15Col);
          sentCount++;
          Utilities.sleep(1000);
        }
      }
    }
    return { success: true, sent: sentCount };
  } finally {
    lock.releaseLock();
  }
}

function buildReminderMessage(name, date, time, service, barberName, minutesBefore) {
  const timeLabel = minutesBefore === 60 ? 'menos de 1 hora' : '15 minutos';
  const emoji     = minutesBefore === 60 ? '⏰' : '🔔';
  let msg = `${emoji} Recordatorio de Cita\n\n`;
  msg += `Hola ${name}, tu cita es en ${timeLabel}:\n\n`;
  msg += `📅 Fecha: ${date}\n`;
  msg += `🕐 Hora: ${time}\n`;
  if (service)    msg += `✂️ Servicio: ${service}\n`;
  if (barberName) msg += `👤 Barbero: ${barberName}\n`;
  msg += `\n¡Te esperamos!`;
  return msg;
}

function markReminderSent(sheet, headers, rowIndex, colName, colIndex) {
  const sheetRow = rowIndex + 1;
  if (colIndex === -1) {
    const newCol = headers.length + 1;
    sheet.getRange(1, newCol).setValue(colName);
    sheet.getRange(sheetRow, newCol).setValue(true);
  } else {
    sheet.getRange(sheetRow, colIndex + 1).setValue(true);
  }
}

function formatTimeLocal(date, tzOffset) {
  const offset = typeof tzOffset === 'number' ? tzOffset : -5;
  const localMs = date.getTime() + offset * 3600000;
  const localDate = new Date(localMs);
  const hh = String(localDate.getUTCHours()).padStart(2, '0');
  const mm = String(localDate.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function normalizTimeForDisplay(timeVal) {
  if (!timeVal && timeVal !== 0) return '';
  if (typeof timeVal === 'number') {
    const totalMin = Math.round(timeVal * 1440);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  if (timeVal instanceof Date) {
    return `${String(timeVal.getHours()).padStart(2, '0')}:${String(timeVal.getMinutes()).padStart(2, '0')}`;
  }
  const str = String(timeVal).trim();
  if (/^\d{1}:\d{2}$/.test(str)) return '0' + str;
  return str;
}

function isTruthy(val) {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    return lower === 'true' || lower === '1';
  }
  return false;
}

// ============================================
// EMAIL DE CONFIRMACIÓN — Feature flag
// ============================================

function sendConfirmationEmail(data) {
  if (!data.email || data.email.trim() === '') {
    return { success: true, message: 'No email provided, skipping' };
  }
  const config = getConfig();
  if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_TU_API_KEY_AQUI') {
    log('WARN', 'email', 'RESEND_API_KEY no configurada');
    return { success: false, error: 'RESEND_API_KEY no configurada' };
  }
  const subject = `✅ Confirmación de tu cita — ${data.date}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#2d2d2d;color:#fff;padding:20px;text-align:center;">
        <h1 style="margin:0;">Confirmación de Cita</h1>
      </div>
      <div style="padding:20px;background:#f9f9f9;">
        <p>Hola <strong>${data.customer_name}</strong>,</p>
        <p>Tu cita ha sido confirmada exitosamente.</p>
        <div style="background:#fff;padding:15px;border-radius:8px;margin:20px 0;">
          <p style="margin:5px 0;"><strong>📅 Fecha:</strong> ${data.date}</p>
          <p style="margin:5px 0;"><strong>🕐 Hora:</strong> ${data.time}</p>
          <p style="margin:5px 0;"><strong>✂️ Servicio:</strong> ${data.service_name}</p>
          <p style="margin:5px 0;"><strong>👤 Barbero:</strong> ${data.barber_name || 'Asignado'}</p>
        </div>
        <p>Si necesitas cancelar o reagendar, por favor contáctanos.</p>
      </div>
      <div style="padding:15px;text-align:center;color:#999;font-size:12px;">
        <p>Mensaje automático — no respondas a este correo.</p>
      </div>
    </div>
  `;
  try {
    const response = UrlFetchApp.fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization:  'Bearer ' + config.RESEND_API_KEY, 'Content-Type': 'application/json' },
      payload:            JSON.stringify({ from: 'onboarding@resend.dev', to: data.email.trim(), subject, html }),
      muteHttpExceptions: true
    });
    const code   = response.getResponseCode();
    const result = JSON.parse(response.getContentText());
    if (code === 200 || code === 201) {
      log('INFO', 'email', `Email enviado a ${data.email}`);
      return { success: true, message: 'Email sent' };
    }
    log('WARN', 'email', `Error Resend API`, { code, result });
    return { success: false, error: result.message || `HTTP ${code}` };
  } catch (e) {
    log('ERROR', 'email', 'Excepción al enviar email', { error: e.message });
    return { success: false, error: e.message };
  }
}

// ============================================
// BLOCKED DAYS
// ============================================

function updateBlockedDays(barberId, blockedDays) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('BlockedDays');
  if (!sheet) {
    sheet = ss.insertSheet('BlockedDays');
    sheet.appendRow(['id', 'barber_id', 'blocked_days', 'created_at']);
  }
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const barberIdCol     = headers.indexOf('barber_id');
  const blockedDaysCol  = headers.indexOf('blocked_days');
  if (barberIdCol === -1) return { error: 'No se encontró columna barber_id' };
  const barberIdStr = String(barberId).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][barberIdCol]).trim() === barberIdStr) {
      if (blockedDaysCol !== -1) {
        sheet.getRange(i + 1, blockedDaysCol + 1).setValue(blockedDays);
      }
      return { success: true, id: data[i][0], updated: true };
    }
  }
  return insertRow('BlockedDays', { barber_id: barberId, blocked_days: blockedDays });
}

// ============================================
// WEB APP — Autenticación y endpoints
// ============================================

function checkAuth(e, data) {
  const config = getConfig();
  if (!config.WEB_APP_API_KEY) return true;
  const action = (e && e.parameter ? e.parameter.action : null) || (data ? data.action : null);
  if (action === 'getSettings') return true;
  const key = (e && e.parameter ? (e.parameter.key || e.parameter.apiKey) : null) || (data ? (data.key || data.apiKey) : null);
  return key === config.WEB_APP_API_KEY;
}

function doGet(e) {
  try {
    if (!checkAuth(e, null)) {
      return jsonResponse({ error: 'Unauthorized' });
    }
    if (e.parameter.payload) {
      const data = JSON.parse(decodeURIComponent(e.parameter.payload));
      return processRequest(data);
    }
    if (e.parameter.action === 'getSettings') {
      return jsonResponse(getPublicSettings());
    }
    return jsonResponse({ error: 'Invalid action' });
  } catch (error) {
    log('ERROR', 'doGet', 'Excepción', { error: error.message });
    return jsonResponse({ error: error.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!checkAuth(null, data)) {
      return jsonResponse({ error: 'Unauthorized' });
    }
    return processRequest(data);
  } catch (error) {
    log('ERROR', 'doPost', 'Excepción', { error: error.message });
    return jsonResponse({ success: false, error: error.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// ROUTER DE ACCIONES
// ============================================

const ALLOWED_SHEETS = ['Appointments', 'Users', 'Services', 'Unavailable', 'BlockedDays', 'Archive'];

function processRequest(data) {
  const action = data.action;
  if (!action) return jsonResponse({ error: 'Acción no especificada' });
  let result;
  switch (action) {
    case 'insert':
    case 'update':
    case 'delete':
    case 'getAll': {
      if (!data.sheet || !ALLOWED_SHEETS.includes(data.sheet)) {
        result = { error: 'Nombre de hoja inválido' };
        break;
      }
      if (action === 'insert')      result = insertRow(data.sheet, data.data, data.autoId !== false);
      else if (action === 'update') result = updateRow(data.sheet, data.id, data.data);
      else if (action === 'delete') result = deleteRow(data.sheet, data.id);
      else                          result = getAll(data.sheet, data.filters || {});
      break;
    }
    case 'getSettings':
      result = getSettings();
      break;
    case 'updateSetting':
      result = updateSetting(data.key, data.value);
      break;
    case 'createAppointment':
      result = createAppointment(data);
      break;
    case 'updateAppointmentStatus':
      result = updateAppointmentStatus(data.id, data.status);
      break;
    case 'createUnavailable':
      result = insertRow('Unavailable', {
        barber_id:  data.barber_id,
        start_date: data.start_date,
        end_date:   data.end_date,
        start_time: data.start_time || '',
        end_time:   data.end_time   || '',
        full_day:   data.full_day !== undefined ? data.full_day : true,
        reason:     data.reason || ''
      });
      break;
    case 'deleteUnavailable':
      result = deleteRow('Unavailable', data.id);
      break;
    case 'createService':
      result = insertRow('Services', {
        name:         data.name,
        duration_min: data.duration_min,
        price:        data.price,
        description:  data.description || '',
        active:       data.active !== undefined ? data.active : true
      });
      break;
    case 'updateService':
      const serviceUpdates = {};
      if (data.name         !== undefined) serviceUpdates.name         = data.name;
      if (data.duration_min !== undefined) serviceUpdates.duration_min = data.duration_min;
      if (data.price        !== undefined) serviceUpdates.price        = data.price;
      if (data.description  !== undefined) serviceUpdates.description  = data.description;
      if (data.active       !== undefined) serviceUpdates.active       = data.active;
      result = updateRow('Services', data.id, serviceUpdates);
      break;
    case 'deleteService':
      result = deleteRow('Services', data.id);
      break;
    case 'createUser':
      result = insertRow('Users', {
        name:   data.name,
        email:  data.email  || '',
        phone:  data.phone  || '',
        role:   data.role   || 'barber',
        active: data.active !== undefined ? data.active : true
      });
      break;
    case 'updateUser':
      const userUpdates = {};
      if (data.name   !== undefined) userUpdates.name   = data.name;
      if (data.email  !== undefined) userUpdates.email  = data.email;
      if (data.phone  !== undefined) userUpdates.phone  = data.phone;
      if (data.role   !== undefined) userUpdates.role   = data.role;
      if (data.active !== undefined) userUpdates.active = data.active;
      result = updateRow('Users', data.id, userUpdates);
      break;
    case 'deleteUser':
      result = deleteRow('Users', data.id);
      break;
    case 'updateBlockedDays':
      result = updateBlockedDays(data.barber_id, data.blocked_days);
      break;
    case 'sendReminders':
      result = sendAppointmentReminders();
      break;
    default:
      result = { error: `Acción no reconocida: ${action}` };
  }
  return jsonResponse(result);
}

// ============================================
// TRIGGERS
// ============================================

function setupAllTriggers() {
  const OWN_FUNCTIONS = ['purgeOldAppointments', 'sendAppointmentReminders'];
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (OWN_FUNCTIONS.includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger('purgeOldAppointments').timeBased().atHour(3).everyDays(1).create();
  ScriptApp.newTrigger('sendAppointmentReminders').timeBased().everyMinutes(10).create();
  log('INFO', 'triggers', 'Triggers configurados: purga 3AM + recordatorios cada 10min');
}

function setupDailyPurgeTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'purgeOldAppointments') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger('purgeOldAppointments').timeBased().atHour(3).everyDays(1).create();
  log('INFO', 'triggers', 'Trigger purga configurado');
}

function setupReminderTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'sendAppointmentReminders') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger('sendAppointmentReminders').timeBased().everyMinutes(10).create();
  log('INFO', 'triggers', 'Trigger recordatorios configurado');
}

// ============================================
// UTILIDADES DE MANTENIMIENTO
// ============================================

function clearArchive() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Archive');
  if (sheet && sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  log('INFO', 'maintenance', 'Archive limpiado');
}

function testPurge() {
  log('INFO', 'test', 'Iniciando prueba de purga manual');
  purgeOldAppointments();
  log('INFO', 'test', 'Prueba de purga completada');
}

function testReminders() {
  log('INFO', 'test', 'Iniciando prueba de recordatorios manual');
  const result = sendAppointmentReminders();
  log('INFO', 'test', 'Prueba completada', result);
}

function diagnoseDateParsing() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName('Appointments');
  if (!sheet) { Logger.log('Hoja Appointments no encontrada'); return; }
  const settingsResult = getSettings();
  const tzOffset = parseFloat((settingsResult.data || {}).timezone_offset) || -5;
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const datetimeIsoCol = headers.indexOf('datetime_iso');
  const dateCol        = headers.indexOf('date');
  const timeCol        = headers.indexOf('time');
  Logger.log('=== DIAGNÓSTICO DE FECHAS ===');
  Logger.log(`Now: ${new Date().toISOString()}`);
  Logger.log(`TZ offset: ${tzOffset}`);
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    Logger.log(`--- Fila ${i + 1} ---`);
    Logger.log(`  datetime_iso raw: ${row[datetimeIsoCol]} (${typeof row[datetimeIsoCol]})`);
    Logger.log(`  date raw: ${row[dateCol]} (${typeof row[dateCol]})`);
    Logger.log(`  time raw: ${row[timeCol]} (${typeof row[timeCol]})`);
    let parsed = null;
    if (datetimeIsoCol !== -1 && row[datetimeIsoCol]) {
      parsed = parseDatetimeBogota(row[datetimeIsoCol], null, tzOffset);
      Logger.log(`  Parsed from ISO: ${parsed ? parsed.toISOString() : 'FALLO'}`);
    }
    if (!parsed && dateCol !== -1) {
      parsed = parseDatetimeBogota(row[dateCol], row[timeCol], tzOffset);
      Logger.log(`  Parsed from date+time: ${parsed ? parsed.toISOString() : 'FALLO'}`);
    }
    const diffMin = parsed ? (parsed.getTime() - Date.now()) / 60000 : null;
    Logger.log(`  DiffMin: ${diffMin !== null ? Math.round(diffMin) : 'N/A'}`);
  }
}
