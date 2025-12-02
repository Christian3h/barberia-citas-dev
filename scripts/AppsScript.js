/**
 * ============================================
 * GOOGLE APPS SCRIPT - PURGA DE CITAS
 * ============================================
 *
 * Este script debe copiarse a Google Apps Script
 * vinculado a tu Google Spreadsheet.
 *
 * Funciones:
 * 1. Mover citas antiguas a la hoja Archive
 * 2. Eliminar citas de la hoja Appointments
 * 3. Ejecutar automáticamente cada día
 *
 * INSTRUCCIONES:
 * 1. Abrir tu Google Spreadsheet
 * 2. Ir a Extensiones > Apps Script
 * 3. Pegar este código
 * 4. Configurar el trigger para ejecución diaria
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  // Nombre de las hojas (deben coincidir exactamente)
  APPOINTMENTS_SHEET: 'Appointments',
  ARCHIVE_SHEET: 'Archive',
  SETTINGS_SHEET: 'Settings',
  USERS_SHEET: 'Users',
  SERVICES_SHEET: 'Services',
  UNAVAILABLE_SHEET: 'Unavailable',

  // Días después de los cuales archivar citas completadas/canceladas
  DEFAULT_PURGE_AFTER_DAYS: 7,
};

// ============================================
// FUNCIONES GENÉRICAS CRUD
// ============================================

/**
 * Inserta una fila en cualquier hoja
 * @param {string} sheetName - Nombre de la hoja
 * @param {object} data - Objeto con los datos a insertar
 * @param {boolean} autoId - Si true, genera ID automático
 */
function insertRow(sheetName, data, autoId = true) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { error: `Hoja "${sheetName}" no encontrada` };
  }

  // Obtener el número de columnas con datos
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    return { error: `La hoja "${sheetName}" no tiene headers. Agrega headers en la fila 1.` };
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  if (headers.length === 0 || headers[0] === '') {
    return { error: `La hoja "${sheetName}" no tiene headers válidos` };
  }

  const id = autoId ? generateUUID() : (data.id || generateUUID());

  const newRow = headers.map(header => {
    if (header === 'id') return id;
    if (header === 'created_at') return new Date().toISOString();
    return data[header] !== undefined ? data[header] : '';
  });

  sheet.appendRow(newRow);
  return { success: true, id: id, data: data };
}

/**
 * Actualiza una fila por ID en cualquier hoja
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} id - ID de la fila a actualizar
 * @param {object} updates - Objeto con los campos a actualizar
 */
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

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      // Actualizar cada campo
      for (const [key, value] of Object.entries(updates)) {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(value);
        }
      }
      return { success: true, id: id };
    }
  }

  return { error: `No se encontró registro con id: ${id}` };
}

/**
 * Elimina una fila por ID en cualquier hoja
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} id - ID de la fila a eliminar
 */
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

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      return { success: true, id: id };
    }
  }

  return { error: `No se encontró registro con id: ${id}` };
}

/**
 * Obtiene todos los registros de una hoja
 * @param {string} sheetName - Nombre de la hoja
 * @param {object} filters - Filtros opcionales
 */
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

  // Aplicar filtros
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      records = records.filter(r => r[key] == value);
    }
  }

  return { success: true, data: records };
}

/**
 * Obtiene un registro por ID
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} id - ID del registro
 */
function getById(sheetName, id) {
  const result = getAll(sheetName);
  if (result.error) return result;

  const record = result.data.find(r => r.id === id);
  if (!record) {
    return { error: `No se encontró registro con id: ${id}` };
  }

  return { success: true, data: record };
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Función principal de purga
 * Mueve citas antiguas a Archive y las elimina de Appointments
 */
function purgeOldAppointments() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appointmentsSheet = ss.getSheetByName(CONFIG.APPOINTMENTS_SHEET);
  const archiveSheet = ss.getSheetByName(CONFIG.ARCHIVE_SHEET);

  if (!appointmentsSheet || !archiveSheet) {
    Logger.log('Error: No se encontraron las hojas necesarias');
    return;
  }

  // Obtener configuración
  const purgeAfterDays = getPurgeAfterDays(ss);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - purgeAfterDays);

  // Obtener datos de citas
  const data = appointmentsSheet.getDataRange().getValues();
  const headers = data[0];
  const dateColumnIndex = headers.indexOf('date');
  const statusColumnIndex = headers.indexOf('status');

  if (dateColumnIndex === -1) {
    Logger.log('Error: No se encontró la columna "date"');
    return;
  }

  // Encontrar citas a archivar
  const rowsToArchive = [];
  const rowIndicesToDelete = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dateStr = row[dateColumnIndex];
    const status = statusColumnIndex !== -1 ? row[statusColumnIndex] : 'done';

    // Parsear fecha
    let appointmentDate;
    if (dateStr instanceof Date) {
      appointmentDate = dateStr;
    } else {
      appointmentDate = new Date(dateStr);
    }

    // Verificar si debe archivarse
    // Solo archivar citas completadas o canceladas que sean más antiguas que el límite
    if (appointmentDate < cutoffDate && (status === 'done' || status === 'cancelled')) {
      rowsToArchive.push(row);
      rowIndicesToDelete.push(i + 1); // +1 porque las filas en Sheets son 1-indexed
    }
  }

  if (rowsToArchive.length === 0) {
    Logger.log('No hay citas para archivar');
    return;
  }

  // Mover a Archive
  const archiveLastRow = archiveSheet.getLastRow();
  const insertRow = archiveLastRow === 0 ? 1 : archiveLastRow + 1;

  // Si Archive está vacía, agregar headers primero
  if (archiveLastRow === 0) {
    archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    archiveSheet.getRange(2, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);
  } else {
    archiveSheet.getRange(insertRow, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);
  }

  // Eliminar de Appointments (de abajo hacia arriba para no afectar los índices)
  rowIndicesToDelete.sort((a, b) => b - a);
  for (const rowIndex of rowIndicesToDelete) {
    appointmentsSheet.deleteRow(rowIndex);
  }

  Logger.log(`Archivadas ${rowsToArchive.length} citas`);
}

/**
 * Obtiene el valor de purge_after_days desde Settings
 */
function getPurgeAfterDays(ss) {
  const settingsSheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET);

  if (!settingsSheet) {
    return CONFIG.DEFAULT_PURGE_AFTER_DAYS;
  }

  const data = settingsSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'purge_after_days') {
      return parseInt(data[i][1], 10) || CONFIG.DEFAULT_PURGE_AFTER_DAYS;
    }
  }

  return CONFIG.DEFAULT_PURGE_AFTER_DAYS;
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Limpia la hoja de Archive (mantiene solo headers)
 */
function clearArchive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const archiveSheet = ss.getSheetByName(CONFIG.ARCHIVE_SHEET);

  if (!archiveSheet) {
    Logger.log('Error: No se encontró la hoja Archive');
    return;
  }

  const lastRow = archiveSheet.getLastRow();
  if (lastRow > 1) {
    archiveSheet.deleteRows(2, lastRow - 1);
  }

  Logger.log('Archive limpiada');
}

/**
 * Genera ID único (UUID v4)
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Función para crear una nueva cita desde Apps Script
 */
function createAppointment(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.APPOINTMENTS_SHEET);

  if (!sheet) {
    throw new Error('No se encontró la hoja Appointments');
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => {
    if (header === 'id') return generateUUID();
    if (header === 'created_at') return new Date().toISOString();
    if (header === 'datetime_iso') return new Date(`${data.date}T${data.time}`).toISOString();
    if (header === 'status') return 'scheduled';
    return data[header] || '';
  });

  sheet.appendRow(newRow);
  return { success: true, id: newRow[0] };
}

// ============================================
// TRIGGERS
// ============================================

/**
 * Configura el trigger para ejecutar la purga diariamente
 * Ejecutar esta función manualmente una vez para configurar
 */
function setupDailyPurgeTrigger() {
  // Eliminar triggers existentes
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'purgeOldAppointments') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Crear nuevo trigger diario a las 3 AM
  ScriptApp.newTrigger('purgeOldAppointments')
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();

  Logger.log('Trigger configurado para ejecutar purga diariamente a las 3 AM');
}

/**
 * Función de prueba - ejecutar manualmente para probar
 */
function testPurge() {
  Logger.log('Iniciando prueba de purga...');
  purgeOldAppointments();
  Logger.log('Prueba completada');
}

// ============================================
// WEB APP ENDPOINTS (Opcional)
// ============================================

/**
 * Endpoint GET para integración con frontend
 * Maneja tanto queries simples como payloads complejos
 */
function doGet(e) {
  try {
    // Si hay un payload, procesarlo como si fuera POST
    if (e.parameter.payload) {
      const data = JSON.parse(decodeURIComponent(e.parameter.payload));
      return processRequest(data);
    }

    // Queries simples
    const action = e.parameter.action;
    switch (action) {
      case 'appointments':
        return getAppointmentsJSON(e);
      case 'slots':
        return getAvailableSlotsJSON(e);
      default:
        return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Procesa una petición de datos (usado por GET y POST)
 */
function processRequest(data) {
  const action = data.action;
  const sheet = data.sheet; // Nombre de la hoja para operaciones genéricas

  let result;

  switch (action) {
    // ============================================
    // OPERACIONES GENÉRICAS (cualquier tabla)
    // ============================================
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
    case 'getById':
      result = getById(sheet, data.id);
      break;

    // ============================================
    // OPERACIONES ESPECÍFICAS (compatibilidad)
    // ============================================
    case 'createAppointment':
      result = createAppointment(data);
      break;
    case 'updateAppointmentStatus':
      result = updateAppointmentStatus(data.id, data.status);
      break;
    case 'createUnavailable':
      result = createUnavailableBlock(data);
      break;
    case 'deleteUnavailable':
      result = deleteUnavailableBlock(data.id);
      break;
    case 'updateSetting':
      result = updateSettingValue(data.key, data.value);
      break;

    // ============================================
    // OPERACIONES DE SERVICIOS
    // ============================================
    case 'createService':
      // Extraer solo los campos del servicio (sin 'action')
      const serviceData = {
        name: data.name,
        duration_min: data.duration_min,
        price: data.price,
        description: data.description || '',
        active: data.active !== undefined ? data.active : true
      };
      result = insertRow(CONFIG.SERVICES_SHEET, serviceData);
      break;
    case 'updateService':
      // Extraer solo los campos a actualizar (sin 'action' ni 'id')
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.duration_min !== undefined) updateData.duration_min = data.duration_min;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.active !== undefined) updateData.active = data.active;
      result = updateRow(CONFIG.SERVICES_SHEET, data.id, updateData);
      break;
    case 'deleteService':
      result = deleteRow(CONFIG.SERVICES_SHEET, data.id);
      break;

    // ============================================
    // OPERACIONES DE USUARIOS/BARBEROS
    // ============================================
    case 'createUser':
      // Extraer solo los campos del usuario (sin 'action')
      const userData = {
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || 'barber',
        active: data.active !== undefined ? data.active : true
      };
      result = insertRow(CONFIG.USERS_SHEET, userData);
      break;
    case 'updateUser':
      // Extraer solo los campos a actualizar (sin 'action' ni 'id')
      const userUpdateData = {};
      if (data.name !== undefined) userUpdateData.name = data.name;
      if (data.email !== undefined) userUpdateData.email = data.email;
      if (data.phone !== undefined) userUpdateData.phone = data.phone;
      if (data.role !== undefined) userUpdateData.role = data.role;
      if (data.active !== undefined) userUpdateData.active = data.active;
      result = updateRow(CONFIG.USERS_SHEET, data.id, userUpdateData);
      break;
    case 'deleteUser':
      result = deleteRow(CONFIG.USERS_SHEET, data.id);
      break;

    default:
      result = { error: 'Acción no válida: ' + action };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint POST para crear/actualizar datos
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return processRequest(data);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Actualiza el estado de una cita
 */
function updateAppointmentStatus(id, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.APPOINTMENTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const statusCol = headers.indexOf('status');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      sheet.getRange(i + 1, statusCol + 1).setValue(status);
      return { success: true };
    }
  }

  return { error: 'Cita no encontrada' };
}

/**
 * Crea un bloqueo de horario
 */
function createUnavailableBlock(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Unavailable');

  if (!sheet) {
    return { error: 'Hoja Unavailable no encontrada' };
  }

  const id = generateUUID();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => {
    if (header === 'id') return id;
    return data[header] || '';
  });

  sheet.appendRow(newRow);
  return { success: true, id: id };
}

/**
 * Elimina un bloqueo de horario
 */
function deleteUnavailableBlock(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Unavailable');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { error: 'Bloqueo no encontrado' };
}

/**
 * Actualiza un valor de configuración
 */
function updateSettingValue(key, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return { success: true };
    }
  }

  // Si no existe, crear nueva fila
  sheet.appendRow([key, value]);
  return { success: true };
}

function getAppointmentsJSON(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.APPOINTMENTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const appointments = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  // Filtrar por parámetros si se proporcionan
  let filtered = appointments;
  if (e.parameter.date) {
    filtered = filtered.filter(a => a.date === e.parameter.date);
  }
  if (e.parameter.barber_id) {
    filtered = filtered.filter(a => a.barber_id === e.parameter.barber_id);
  }

  return ContentService.createTextOutput(JSON.stringify(filtered))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAvailableSlotsJSON(e) {
  // Implementación básica - usa la lógica del frontend para mayor flexibilidad
  return ContentService.createTextOutput(JSON.stringify({
    message: 'Use frontend logic for slot calculation',
    params: e.parameter
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// FUNCIÓN DE INICIALIZACIÓN DE DATOS
// Ejecutar UNA VEZ para poblar las tablas
// ============================================

/**
 * Inserta los datos iniciales en las tablas
 * EJECUTAR MANUALMENTE UNA SOLA VEZ
 */
function initializeData() {
  Logger.log('Iniciando inserción de datos...');

  // 1. Insertar servicios
  const services = [
    { id: 'service-1', name: 'Corte de cabello', duration_min: 30, price: 25000, description: 'Corte clásico o moderno', active: true },
    { id: 'service-2', name: 'Barba', duration_min: 20, price: 15000, description: 'Perfilado y afeitado de barba', active: true },
    { id: 'service-3', name: 'Corte + Barba', duration_min: 45, price: 35000, description: 'Combo completo', active: true },
    { id: 'service-4', name: 'Tinte', duration_min: 60, price: 50000, description: 'Coloración completa', active: true },
    { id: 'service-5', name: 'Diseño de cejas', duration_min: 15, price: 10000, description: 'Perfilado de cejas', active: true },
  ];

  for (const service of services) {
    const result = insertRow(CONFIG.SERVICES_SHEET, service, false);
    Logger.log('Servicio: ' + service.name + ' -> ' + JSON.stringify(result));
  }

  // 2. Insertar barbero de ejemplo
  const barbers = [
    { id: 'barber-1', name: 'Carlos Barbero', email: 'carlos@barberia.com', phone: '3009876543', role: 'barber', active: true },
  ];

  for (const barber of barbers) {
    const result = insertRow(CONFIG.USERS_SHEET, barber, false);
    Logger.log('Barbero: ' + barber.name + ' -> ' + JSON.stringify(result));
  }

  Logger.log('¡Datos iniciales insertados correctamente!');
  return { success: true, message: 'Datos iniciales insertados' };
}

/**
 * Limpia todos los datos de las tablas (excepto headers)
 * ¡CUIDADO! Esto borra todo
 */
function clearAllData() {
  const sheets = [
    CONFIG.APPOINTMENTS_SHEET,
    CONFIG.SERVICES_SHEET,
    CONFIG.UNAVAILABLE_SHEET,
    CONFIG.ARCHIVE_SHEET
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  for (const sheetName of sheets) {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
      Logger.log('Limpiada: ' + sheetName);
    }
  }

  // No limpiar Users para mantener barberos
  // No limpiar Settings para mantener configuración

  Logger.log('Tablas limpiadas');
  return { success: true };
}
