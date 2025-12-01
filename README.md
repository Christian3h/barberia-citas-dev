# 🏪 Sistema de Agendamiento para Barbería

Sistema completo de agendamiento de citas para barbería con **React + TypeScript**, usando **Google Sheets** como base de datos y **Wulshis** como backend.

## 🚀 Características

- ✅ Reserva de citas en línea
- ✅ Selección de servicio, barbero, fecha y hora
- ✅ Validación de disponibilidad en tiempo real
- ✅ Panel de administración para barberos
- ✅ Gestión de días/horarios bloqueados
- ✅ Configuración flexible del negocio
- ✅ Archivado automático de citas antiguas
- ✅ Responsive design (móvil y desktop)

## 📁 Estructura del Proyecto

```
barberia/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── BarberSelector/
│   │   ├── ConfirmationModal/
│   │   ├── CustomerForm/
│   │   ├── DatePicker/
│   │   ├── ServiceSelector/
│   │   └── TimeSlotPicker/
│   ├── hooks/               # Custom hooks
│   │   ├── useAppointments.ts
│   │   ├── useBarbers.ts
│   │   ├── useServices.ts
│   │   ├── useSettings.ts
│   │   ├── useSlots.ts
│   │   └── useUnavailable.ts
│   ├── pages/               # Páginas principales
│   │   ├── AdminDashboard/
│   │   └── BookingPage/
│   ├── services/            # Servicios de API
│   │   ├── api.ts           # Cliente API (Wulshis)
│   │   ├── googleSheets.ts  # Lectura de Google Sheets
│   │   └── slots.ts         # Lógica de slots
│   ├── types/               # Tipos TypeScript
│   │   └── models.ts
│   ├── utils/               # Utilidades
│   │   └── dateUtils.ts
│   ├── config/              # Configuración
│   │   └── index.ts
│   └── styles/              # Estilos globales
│       └── globals.css
├── scripts/
│   └── AppsScript.js        # Google Apps Script
├── package.json
└── README.md
```

## 🛠️ Instalación

### 1. Clonar e instalar dependencias

```bash
cd barberia
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
VITE_GOOGLE_SPREADSHEET_ID=tu_spreadsheet_id
VITE_GOOGLE_API_KEY=tu_api_key
VITE_WULSHIS_URL=http://localhost:3001
```

### 3. Iniciar servidor de desarrollo

```bash
npm run dev
```

La app estará en `http://localhost:5173`

## 📊 Configuración de Google Sheets

### Crear el Spreadsheet

1. Crear un nuevo Google Spreadsheet
2. Crear las siguientes hojas (tabs):

#### Hoja: `Appointments`
| id | created_at | date | time | datetime_iso | duration_min | customer_name | phone | email | service | barber_id | status | notes |
|----|------------|------|------|--------------|--------------|---------------|-------|-------|---------|-----------|--------|-------|

#### Hoja: `Users`
| id | name | email | phone | role | active |
|----|------|-------|-------|------|--------|

Ejemplo de datos:
```
1 | Juan Pérez   | juan@email.com   | 3001234567 | barber | TRUE
2 | Carlos López | carlos@email.com | 3009876543 | barber | TRUE
3 | Admin        | admin@email.com  | 3001111111 | admin  | TRUE
```

#### Hoja: `Unavailable`
| id | barber_id | start_date | end_date | start_time | end_time | full_day | reason |
|----|-----------|------------|----------|------------|----------|----------|--------|

#### Hoja: `Settings`
| key | value |
|-----|-------|
| slot_interval_min | 15 |
| business_start | 09:00 |
| business_end | 20:00 |
| timezone | America/Bogota |
| purge_after_days | 7 |
| max_book_ahead_days | 30 |

#### Hoja: `Services`
| id | name | duration_min | price | description |
|----|------|--------------|-------|-------------|
| 1 | Corte de cabello | 30 | 25000 | Corte clásico o moderno |
| 2 | Barba | 20 | 15000 | Perfilado y afeitado |
| 3 | Corte + Barba | 45 | 35000 | Combo completo |

#### Hoja: `Archive`
(Mismo esquema que Appointments, se llena automáticamente)

### Configurar API de Google

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto
3. Habilitar "Google Sheets API"
4. Crear credenciales (API Key)
5. Copiar el ID del Spreadsheet de la URL
6. Hacer el Spreadsheet público (lectura) o configurar OAuth

## 🔧 Configuración de Wulshis (Backend)

Wulshis actúa como intermediario para escritura en Google Sheets.

### Endpoints requeridos

```
GET  /api/slots?date=YYYY-MM-DD&barber_id=X&duration_min=Y
GET  /api/appointments
POST /api/appointments
DELETE /api/appointments/:id
GET  /api/unavailable
POST /api/unavailable
DELETE /api/unavailable/:id
GET  /api/settings
PATCH /api/settings
GET  /api/users
GET  /api/services
```

## 📜 Google Apps Script (Purga automática)

Para archivar automáticamente las citas antiguas:

1. Abrir el Spreadsheet
2. Ir a **Extensiones > Apps Script**
3. Pegar el contenido de `scripts/AppsScript.js`
4. Ejecutar `setupDailyPurgeTrigger()` una vez
5. Autorizar los permisos necesarios

## 🎨 Personalización

### Cambiar colores

Editar `src/styles/globals.css`:

```css
:root {
  --color-primary: #4a4a4a;
  --color-accent: #d4af37;
  /* ... */
}
```

### Agregar servicios

Editar la hoja `Services` en Google Sheets o `src/config/index.ts`:

```typescript
export const DEFAULT_SERVICES = [
  { id: '1', name: 'Mi Servicio', duration_min: 30, price: 20000 },
  // ...
];
```

## 📱 Uso

### Cliente (Reservar cita)

1. Ir a `/`
2. Seleccionar servicio
3. Seleccionar barbero
4. Elegir fecha y hora disponible
5. Completar datos de contacto
6. Confirmar cita

### Administrador

1. Ir a `/admin`
2. Ver y gestionar citas del día
3. Crear bloqueos de horario
4. Modificar configuración del sistema

## 🏗️ Build para producción

```bash
npm run build
```

Los archivos se generan en `dist/`

## 🧪 Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Vista previa del build
npm run lint     # Verificar código
```

## 📄 Licencia

MIT

---

**Desarrollado con ❤️ para tu barbería**
