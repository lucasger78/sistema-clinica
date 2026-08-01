# Centro Médico Patagonia — Sistema de Gestión Integral

Sistema web de gestión para centros médicos. Frontend React + Vite desplegado en Netlify, backend exclusivamente Supabase.

## Requisitos previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (plan Pro recomendado ~$25/mes)
- Cuenta en [Netlify](https://netlify.com) (plan gratuito)

---

## Deploy paso a paso

### 1. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar los scripts en este orden:
   - `supabase/migrations/001_new_tables.sql`
   - `supabase/migrations/002_alter_existing.sql`
   - `supabase/migrations/003_functions.sql`
   - `supabase/migrations/004_triggers_indices.sql`
   - `supabase/migrations/005_storage_rls.sql`
3. Ir a **Authentication → Users → Add user** y crear:
   - Email: `lucasgconti@gmail.com`
   - Password: `Lucasger78@`
4. En SQL Editor ejecutar:
   ```sql
   UPDATE auth.users 
   SET raw_user_meta_data = '{"rol": "admin"}'
   WHERE email = 'lucasgconti@gmail.com';
   ```

### 2. Configurar variables de entorno

Copiar `.env.example` como `.env` y completar:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Los valores se encuentran en **Supabase → Settings → API**.

### 3. Desarrollo local

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`

### 4. Deploy en Netlify

1. Subir el código a un repositorio GitHub
2. Ir a [netlify.com](https://netlify.com) → **Add new site → Import an existing project**
3. Conectar el repositorio
4. Configurar:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Agregar las variables de entorno en **Site settings → Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Hacer deploy

### 5. Configurar redirecciones (SPA)

Crear archivo `public/_redirects` con:
```
/* /index.html 200
```

---

## Stack tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Frontend | React 18 + Vite |
| Estilos | Tailwind CSS |
| Routing | React Router v6 |
| Estado servidor | TanStack React Query |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Gráficos | Recharts |
| Exportación | SheetJS (xlsx) |
| Notificaciones | Sonner |
| Íconos | Lucide React |

## Módulos

1. **Login** — Autenticación con Supabase Auth
2. **Dashboard** — Resumen del día con estadísticas
3. **Pacientes** — CRUD con búsqueda en tiempo real
4. **Profesionales** — CRUD con configuración de agenda
5. **Agenda** — Vista diaria/semanal con Realtime
6. **Turnos** — Asistente de 4 pasos con sobreturnos
7. **Historia Clínica** — Notas acumulativas + archivos
8. **Lista de Espera** — Gestión por prioridad
9. **Facturación** — Cobros y cierre de caja
10. **Reportes** — Gráficos + exportación Excel
11. **Configuración** — Usuarios, especialidades, coberturas
