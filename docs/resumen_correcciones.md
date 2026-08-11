# Resumen de Correcciones y Mejoras — Sistema de Agendamiento de Citas

Este documento detalla todas las correcciones de errores, refactorizaciones de código, mejoras de interfaz y sistemas de trazabilidad implementados en el proyecto **Barbería Agendamiento**.

---

## 1. 🐛 Errores Críticos Corregidos

### A. Citas Duplicadas y Solapadas (Backend - Google Apps Script)
- **Problema**: `getAll()` en Google Apps Script devolvía celdas de fecha como objetos nativos `Date`. La comparación `Date == "2026-08-10"` en JavaScript evaluaba a `false`, lo que provocaba que la verificación de duplicados fuera omitida y permitiera agendar citas en el mismo horario.
- **Solución**:
  - Se implementó la función `checkAppointmentConflict(barber_id, date, time, duration_min, tzOffset)`.
  - Normaliza celdas de fecha a `YYYY-MM-DD` y horas a minutos enteros transcurridos desde medianoche (`0..1439`).
  - Valida el solapamiento de rangos: `reqStart < rowEnd && reqEnd > rowStart`.
  - Se integró `LockService.getScriptLock()` para congelar ejecuciones concurrentes en caso de doble clic del usuario.

---

### B. Borrado / Purga Prematura de Citas Activas (Backend - Google Apps Script)
- **Problema**: Al evaluar celdas `Date` nativas, la función `parseDatetimeBogota()` perdía la parte de la hora y la reseteaba a `00:00`. Durante el disparador nocturno de las 3:00 AM, las citas agendadas para el día actual a las 8:00 PM se evaluaban como si fueran de las `00:00` AM (ya pasadas) y se movían a `Archive` antes de que el cliente llegara.
- **Solución**:
  - Se corrigió `parseDatetimeBogota()` para preservar componentes de fecha y hora sin pérdida de precisión en zona horaria UTC-5 (Colombia).
  - Se estableció un umbral mínimo estricto de **3 días** (`purge_scheduled_after_days = 3`) antes de archivar citas no completadas.

---

### C. Bloqueo de Horarios por Fechas Invertidas (Frontend - React)
- **Problema**: En la tabla `Unavailable` de Google Sheets (fila 20), un error humano introdujo `Desde: 17/08/2026 | Hasta: 07/08/2026`. Al calcular slots disponibles, la función `isWithinInterval` de `date-fns` lanzaba un error no controlado `RangeError: Invalid interval`. La app capturaba la excepción y devolvía `slots = []`, mostrando el mensaje *"No hay horarios disponibles para esta fecha"*.
- **Solución**:
  - Se modificó `dateIsInRange` en `src/utils/dateUtils.ts` para auto-corregir el orden de las fechas si `startDate > endDate`.
  - Se envolvieron `parseDate`, `parseTime`, `formatDisplayDate` y `timeSlotCollides` en bloques `try-catch` para garantizar que ningún dato corrupto pueda tumbar la búsqueda de horarios.

---

## 2. 📅 Estandarización Universal de Fechas (`YYYY-MM-DD`)

- Se definió el formato **`YYYY-MM-DD`** como la fuente de verdad única para todo el proyecto.
- Se implementó normalización automática en el lector de Google Visualization API (`src/services/googleSheets.ts`):
  - Convierte automáticamente formatos `Date(YYYY, M, D)`, `DD/MM/YYYY`, cadenas ISO y objetos `Date` a `YYYY-MM-DD` tan pronto ingresan a la app.

---

## 3. 🔍 Nuevo Sistema de Auditoría y Trazabilidad (`SystemLogs`)

Se agregó la función `logSystemAlert(type, message, details)` en `scripts/AppsScript.js` para mantener una pestaña **`SystemLogs`** automática en Google Sheets con registro de eventos críticos:
- 🛑 **`DUPLICATE_PREVENTED`**: Registra cada intento de reserva sobrepuesta o duplicada bloqueada.
- 🗑️ **`APPOINTMENT_DELETED`**: Registra eliminaciones de la tabla `Appointments`.
- 📦 **`APPOINTMENTS_PURGED`**: Registra las ejecuciones del limpiador nocturno de citas.

---

## 4. 💻 Mejoras en el Panel de Administración (Frontend)

- **Notas del Cliente**: Se agregó la columna **`Notas`** en la tabla de citas (`AppointmentsTable.tsx`) y badges visuales (`📝 {apt.notes}`) en las tarjetas de próximas citas (`DashboardStats.tsx`).
- **Estilos CSS**: Se añadieron clases en `AdminDashboard.css` para destacar las notas del cliente enviadas al agendar.

---

## 5. ⚙️ Ajustes de Configuración y Despliegue

- **`slot_interval_min`**: Se actualizó a **`15` minutos** en Google Sheets `Settings` para ofrecer máxima flexibilidad de horarios disponibles sin desaprovechar huecos.
- **Despliegue Firebase**: Se agregó el script `"deploy": "npm run build && npx firebase-tools deploy --only hosting"` a `package.json`.
- **Compilación**: Verificada la compilación en producción (`npm run build`) con **0 errores**.
