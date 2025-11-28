# Guía de Configuración de Google Sheets

Esta guía detalla cómo configurar Google Sheets como base de datos para el sistema de agendamiento.

## 1. Crear el Spreadsheet

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea un nuevo documento
3. Nómbralo "Barbería - Sistema de Citas" (o como prefieras)

## 2. Crear las hojas (tabs)

Crea las siguientes hojas haciendo clic en el `+` en la parte inferior:

### Hoja: Appointments

Esta es la hoja principal de citas. Crea estos encabezados en la fila 1:

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| id | created_at | date | time | datetime_iso | duration_min | customer_name | phone | email | service | barber_id | status | notes |

**Formatos:**
- `id`: Texto (UUID)
- `created_at`: Fecha y hora ISO
- `date`: Fecha (YYYY-MM-DD)
- `time`: Hora (HH:MM)
- `datetime_iso`: Fecha y hora ISO
- `duration_min`: Número
- `customer_name`: Texto
- `phone`: Texto
- `email`: Texto
- `service`: Texto (ID del servicio)
- `barber_id`: Texto (ID del barbero)
- `status`: scheduled | cancelled | done
- `notes`: Texto (opcional)

### Hoja: Users

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| id | name | email | phone | role | active |

**Datos de ejemplo:**
```
1    | Juan Pérez    | juan@barberia.com   | 3001234567 | barber | TRUE
2    | Carlos López  | carlos@barberia.com | 3009876543 | barber | TRUE
admin| Administrador | admin@barberia.com  | 3001111111 | admin  | TRUE
```

**Roles disponibles:**
- `client`: Cliente
- `barber`: Barbero
- `admin`: Administrador

### Hoja: Unavailable

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| id | barber_id | start_date | end_date | start_time | end_time | full_day | reason |

**Ejemplo:**
```
1 | 1 | 2025-12-24 | 2025-12-25 |       |       | TRUE  | Navidad
2 | 2 | 2025-11-28 | 2025-11-28 | 14:00 | 16:00 | FALSE | Cita médica
```

### Hoja: Settings

| A | B |
|---|---|
| key | value |
| slot_interval_min | 15 |
| business_start | 09:00 |
| business_end | 20:00 |
| timezone | America/Bogota |
| purge_after_days | 7 |
| max_book_ahead_days | 30 |

### Hoja: Services

| A | B | C | D | E |
|---|---|---|---|---|
| id | name | duration_min | price | description |
| 1 | Corte de cabello | 30 | 25000 | Corte clásico o moderno |
| 2 | Barba | 20 | 15000 | Perfilado y afeitado de barba |
| 3 | Corte + Barba | 45 | 35000 | Combo completo |
| 4 | Tinte | 60 | 50000 | Coloración completa |
| 5 | Diseño de cejas | 15 | 10000 | Perfilado de cejas |

### Hoja: Archive

Crear con los mismos encabezados que `Appointments`. Esta hoja se llenará automáticamente con las citas archivadas.

## 3. Obtener el ID del Spreadsheet

El ID está en la URL de tu spreadsheet:

```
https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
```

Copia el `SPREADSHEET_ID` y úsalo en tu archivo `.env.local`.

## 4. Configurar permisos

### Opción A: Spreadsheet público (solo lectura)

1. Clic en "Compartir" (esquina superior derecha)
2. Clic en "Cambiar a cualquier persona con el enlace"
3. Seleccionar "Lector"
4. Guardar

### Opción B: API Key de Google (recomendado para lectura)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a "APIs y Servicios" > "Biblioteca"
4. Busca y habilita "Google Sheets API"
5. Ve a "APIs y Servicios" > "Credenciales"
6. Crea una "Clave de API"
7. (Opcional) Restringe la clave a Google Sheets API
8. Copia la API Key a tu `.env.local`

## 5. Configurar Apps Script para escritura

Como Google Sheets API requiere OAuth para escritura, usamos Apps Script:

1. En tu Spreadsheet, ve a **Extensiones > Apps Script**
2. Pega el contenido de `scripts/AppsScript.js`
3. Guarda el proyecto (Ctrl+S)
4. Ve a **Implementar > Nueva implementación**
5. Selecciona tipo "Aplicación web"
6. Configura:
   - Ejecutar como: Tu cuenta
   - Quién tiene acceso: Cualquier persona
7. Clic en "Implementar"
8. Copia la URL del Web App
9. Usa esta URL como endpoint de backend o configura Wulshis para usarla

## 6. Configurar trigger de purga

En Apps Script:

1. Ve a **Activadores** (icono de reloj en la izquierda)
2. Clic en "Agregar activador"
3. Configura:
   - Función: `purgeOldAppointments`
   - Tipo de activador: Basado en tiempo
   - Selector de tipo: Día
   - Hora: 3-4 AM (o la que prefieras)
4. Guardar

## 7. Probar la configuración

1. Agrega algunos datos de prueba en las hojas
2. En tu app React, verifica que se carguen los datos
3. Prueba crear una cita y verificar que se guarde
4. Ejecuta `testPurge()` en Apps Script para probar el archivado

## Solución de problemas

### "No se pueden cargar los datos"
- Verifica que el Spreadsheet sea público o que la API Key sea válida
- Confirma que los nombres de las hojas coincidan exactamente

### "Error de permisos en escritura"
- La escritura requiere OAuth o usar Apps Script como intermediario
- Verifica que el Web App esté desplegado correctamente

### "Los slots no se generan"
- Verifica que haya barberos activos en la hoja Users
- Confirma que Settings tenga los valores correctos

## Estructura de URLs

- **Spreadsheet**: `https://docs.google.com/spreadsheets/d/{ID}/edit`
- **API de lectura**: `https://sheets.googleapis.com/v4/spreadsheets/{ID}/values/{HOJA}?key={API_KEY}`
- **Apps Script Web App**: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`
