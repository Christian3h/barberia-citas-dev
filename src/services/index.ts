export { default as googleSheetsService } from './googleSheets';
export { default as api } from './api';
export { default as slotsService } from './slots';
export { default as appsScriptApi } from './appsScript';

// Re-export específicos para evitar conflictos
export { getAvailableSlots, isSlotAvailable, getNextAvailableSlots, validateAppointmentData } from './slots';

// Re-export Apps Script API
export {
  createAppointment as createAppointmentViaAppsScript,
  cancelAppointment as cancelAppointmentViaAppsScript,
  completeAppointment as completeAppointmentViaAppsScript,
  isAppsScriptConfigured
} from './appsScript';
