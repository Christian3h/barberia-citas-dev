/**
 * ============================================
 * GOOGLE APPS SCRIPT - BARBERÍA
 * ============================================
 *
 * Funciones:
 * - CRUD para todas las tablas
 * - Purga automática de citas antiguas
 * - Lectura de Settings
 *
 * INSTRUCCIONES:
 * 1. Abrir tu Google Spreadsheet
 * 2. Ir a Extensiones > Apps Script
 * 3. Pegar este código
 * 4. Guardar y desplegar como Web App
 */

// ============================================
// FUNCIONES GENÉRICAS CRUD
// ============================================

function insertRow(sheetName, data, autoId = true) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { error: `Hoja "${sheetName}" no encontrada` };
  }

  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    return { error: `La hoja "${sheetName}" no tiene headers` };
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  if (headers.length === 0 || headers[0] === '') {
    return { error: `La hoja "${sheetName}" no tiene headers válidos` };
  }

  const id = autoId ? Utilities.getUuid() : (data.id || Utilities.getUuid());

  const newRow = headers.map(header => {
    if (header === 'id') return id;
    if (header === 'created_at') return new Date().toISOString();
    return data[header] !== undefined ? data[header] : '';
  });

  sheet.appendRow(newRow);
  return { success: true, id: id, data: data };
}

function updateRow(sheetName, id, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { error: `Hoja "${sheetName}" no encontrada` };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');

  if (idCol === -1) {
    return { error: 'No se encontró columna "id"' };
  }

  const idStr = String(id).trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === idStr) {
      for (const [key, value] of Object.entries(updates)) {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(value);
        }
      }
      return { success: true, id: idStr };
    }
  }

  return { error: `No se encontró registro con id: ${idStr}` };
}

function deleteRow(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { error: `Hoja "${sheetName}" no encontrada` };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');

  if (idCol === -1) {
    return { error: 'No se encontró columna "id"' };
  }

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

  if (!sheet) {
    return { error: `Hoja "${sheetName}" no encontrada` };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, data: [] };
  }

  const headers = data[0];
  let records = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
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
// SETTINGS - Lectura y Escritura
// ============================================

/**
 * Obtiene todos los settings como objeto clave-valor
 */
function getSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');

  if (!sheet) {
    return { error: 'Hoja Settings no encontrada' };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, data: {} };
  }

  // La primera fila son headers: key, value, description
  const settings = {};

  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    const value = data[i][1];

    if (key) {
      settings[key] = value;
    }
  }

  return { success: true, data: settings };
}

/**
 * Actualiza un valor de configuración
 */
function updateSetting(key, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');

  if (!sheet) {
    return { error: 'Hoja Settings no encontrada' };
  }

  const data = sheet.getDataRange().getValues();
  const keyStr = String(key).trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === keyStr) {
      sheet.getRange(i + 1, 2).setValue(value);
      return { success: true, key: keyStr, value: value };
    }
  }

  // Si no existe, crear nueva fila
  sheet.appendRow([keyStr, value, '']);
  return { success: true, key: keyStr, value: value, created: true };
}

// ============================================
// APPOINTMENTS - Citas
// ============================================

/**
 * Obtiene la duración de un servicio desde la tabla Services
 */
function getServiceDuration(serviceId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Services');
  
  if (!sheet) {
    return 30; // Valor por defecto si no existe la hoja
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return 30;
  }
  
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const durationCol = headers.indexOf('duration_min');
  
  if (idCol === -1 || durationCol === -1) {
    return 30;
  }
  
  // Buscar el servicio por ID o por nombre
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][idCol]).trim();
    if (rowId === String(serviceId).trim()) {
      const duration = parseInt(data[i][durationCol]);
      return isNaN(duration) || duration <= 0 ? 30 : duration;
    }
  }
  
  // Si no encontró por ID, buscar por nombre en la columna 'name'
  const nameCol = headers.indexOf('name');
  if (nameCol !== -1) {
    for (let i = 1; i < data.length; i++) {
      const rowName = String(data[i][nameCol]).trim().toLowerCase();
      if (rowName === String(serviceId).trim().toLowerCase()) {
        const duration = parseInt(data[i][durationCol]);
        return isNaN(duration) || duration <= 0 ? 30 : duration;
      }
    }
  }
  
  return 30; // Valor por defecto
}

function createAppointment(data) {
  // Obtener la duración del servicio desde la tabla Services
  const serviceDuration = getServiceDuration(data.service);
  
  const appointmentData = {
    barber_id: data.barber_id,
    customer_name: data.customer_name,
    phone: data.phone,
    service: data.service,
    date: data.date,
    time: data.time,
    duration_min: serviceDuration,
    datetime_iso: new Date(`${data.date}T${data.time}`).toISOString(),
    status: 'scheduled',
    notes: data.notes || ''
  };

  return insertRow('Appointments', appointmentData);
}

function updateAppointmentStatus(id, status) {
  return updateRow('Appointments', id, { status: status });
}

// ============================================
// PURGA DE CITAS ANTIGUAS
// ============================================

function purgeOldAppointments() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appointmentsSheet = ss.getSheetByName('Appointments');
  const archiveSheet = ss.getSheetByName('Archive');

  if (!appointmentsSheet || !archiveSheet) {
    Logger.log('Error: No se encontraron las hojas necesarias');
    return;
  }

  // Obtener días de purga desde Settings
  const settingsResult = getSettings();
  const purgeAfterDays = settingsResult.success && settingsResult.data.purge_after_days
    ? parseInt(settingsResult.data.purge_after_days)
    : 7;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - purgeAfterDays);

  const data = appointmentsSheet.getDataRange().getValues();
  const headers = data[0];
  const dateCol = headers.indexOf('date');
  const statusCol = headers.indexOf('status');

  if (dateCol === -1) {
    Logger.log('Error: No se encontró la columna "date"');
    return;
  }

  const rowsToArchive = [];
  const rowIndicesToDelete = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dateStr = row[dateCol];
    const status = statusCol !== -1 ? row[statusCol] : 'done';

    let appointmentDate = dateStr instanceof Date ? dateStr : new Date(dateStr);

    if (appointmentDate < cutoffDate && (status === 'done' || status === 'cancelled')) {
      rowsToArchive.push(row);
      rowIndicesToDelete.push(i + 1);
    }
  }

  if (rowsToArchive.length === 0) {
    Logger.log('No hay citas para archivar');
    return;
  }

  // Mover a Archive
  const archiveLastRow = archiveSheet.getLastRow();
  if (archiveLastRow === 0) {
    archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    archiveSheet.getRange(2, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);
  } else {
    archiveSheet.getRange(archiveLastRow + 1, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);
  }

  // Eliminar de Appointments (de abajo hacia arriba)
  rowIndicesToDelete.sort((a, b) => b - a);
  for (const rowIndex of rowIndicesToDelete) {
    appointmentsSheet.deleteRow(rowIndex);
  }

  Logger.log(`Archivadas ${rowsToArchive.length} citas`);
}

function setupDailyPurgeTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'purgeOldAppointments') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger('purgeOldAppointments')
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();

  Logger.log('Trigger configurado para ejecutar purga diariamente a las 3 AM');
}

// ============================================
// WEB APP ENDPOINTS
// ============================================

function doGet(e) {
  try {
    if (e.parameter.payload) {
      const data = JSON.parse(decodeURIComponent(e.parameter.payload));
      return processRequest(data);
    }

    const action = e.parameter.action;

    if (action === 'getSettings') {
      const result = getSettings();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return processRequest(data);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function processRequest(data) {
  const action = data.action;
  const sheet = data.sheet;
  let result;

  switch (action) {
    // Operaciones genéricas
    case 'insert':
      result = insertRow(sheet, data.data, data.autoId !== false);
      break;
    case 'update':
      result = updateRow(sheet, data.id, data.data);
      break;
    case 'delete':
      result = deleteRow(sheet, data.id);
      break;
    case 'getAll':
      result = getAll(sheet, data.filters || {});
      break;

    // Settings
    case 'getSettings':
      result = getSettings();
      break;
    case 'updateSetting':
      result = updateSetting(data.key, data.value);
      break;

    // Appointments
    case 'createAppointment':
      result = createAppointment(data);
      break;
    case 'updateAppointmentStatus':
      result = updateAppointmentStatus(data.id, data.status);
      break;

    // Unavailable
    case 'createUnavailable':
      result = insertRow('Unavailable', {
        barber_id: data.barber_id,
        start_date: data.start_date,
        end_date: data.end_date,
        start_time: data.start_time || '',
        end_time: data.end_time || '',
        full_day: data.full_day !== undefined ? data.full_day : true,
        reason: data.reason || ''
      });
      break;
    case 'deleteUnavailable':
      result = deleteRow('Unavailable', data.id);
      break;

    // Services
    case 'createService':
      result = insertRow('Services', {
        name: data.name,
        duration_min: data.duration_min,
        price: data.price,
        description: data.description || '',
        active: data.active !== undefined ? data.active : true
      });
      break;
    case 'updateService':
      const serviceUpdates = {};
      if (data.name !== undefined) serviceUpdates.name = data.name;
      if (data.duration_min !== undefined) serviceUpdates.duration_min = data.duration_min;
      if (data.price !== undefined) serviceUpdates.price = data.price;
      if (data.description !== undefined) serviceUpdates.description = data.description;
      if (data.active !== undefined) serviceUpdates.active = data.active;
      result = updateRow('Services', data.id, serviceUpdates);
      break;
    case 'deleteService':
      result = deleteRow('Services', data.id);
      break;

    // Users/Barbers
    case 'createUser':
      result = insertRow('Users', {
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || 'barber',
        active: data.active !== undefined ? data.active : true
      });
      break;
    case 'updateUser':
      const userUpdates = {};
      if (data.name !== undefined) userUpdates.name = data.name;
      if (data.email !== undefined) userUpdates.email = data.email;
      if (data.phone !== undefined) userUpdates.phone = data.phone;
      if (data.role !== undefined) userUpdates.role = data.role;
      if (data.active !== undefined) userUpdates.active = data.active;
      result = updateRow('Users', data.id, userUpdates);
      break;
    case 'deleteUser':
      result = deleteRow('Users', data.id);
      break;

    default:
      result = { error: 'Acción no válida: ' + action };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// UTILIDADES
// ============================================

function clearArchive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Archive');
  if (sheet && sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  Logger.log('Archive limpiada');
}

function testPurge() {
  Logger.log('Iniciando prueba de purga...');
  purgeOldAppointments();
  Logger.log('Prueba completada');
}
