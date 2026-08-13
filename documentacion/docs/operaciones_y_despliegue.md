# Operaciones y Despliegue

**Centro Médico Patagonia — Sistema de Gestión Integral**
*Área de Sistemas e Informática*

---

## 1. Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Frontend | React | 18.x | SPA — Interfaz de usuario |
| Build Tool | Vite | 5.x | Bundler y servidor de desarrollo |
| Estilos | Tailwind CSS | 3.x | Diseño responsive |
| Routing | React Router | 6.x | Navegación SPA |
| Backend | Supabase (BaaS) | — | PostgreSQL + Auth + Storage + Realtime |
| Hosting | Netlify | — | CDN global + redirects |
| Iconos | Lucide React | — | Íconos SVG |
| Notificaciones | Sonner | — | Toast notifications |
| Fechas | date-fns | 3.x | Manipulación de fechas |

---

## 2. Variables de Entorno

El archivo `.env` en la raíz del proyecto contiene las credenciales sensibles. **Nunca debe subirse a Git** (está en `.gitignore`).

```env
# .env
VITE_SUPABASE_URL=https://[TU-PROYECTO-ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Para obtener estos valores: Supabase Dashboard → Settings → API → Project URL y `anon` public key.

### ¿Dónde se usan?

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 3. Instalación desde Cero

### 3.1 Prerrequisitos

- **Node.js** v18 o superior (`node --version`)
- **npm** v9 o superior (`npm --version`)
- Cuenta activa en [Supabase](https://supabase.com)
- Cuenta en [Netlify](https://netlify.com) o [Vercel](https://vercel.com)

### 3.2 Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/[usuario]/sistema-clinica.git
cd sistema-clinica

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env
# Editar .env con los datos del proyecto Supabase

# 4. Verificar configuración
npm run dev
# Abrir http://localhost:5173 en el navegador
```

### 3.3 Configuración de la Base de Datos

Ejecutar en el **SQL Editor de Supabase** en este orden estricto:

```
supabase/migrations/001_new_tables.sql      ← Estructura de tablas
supabase/migrations/003_functions.sql       ← Funciones RPC
supabase/migrations/004_triggers_indices.sql ← Triggers y performance
supabase/migrations/005_storage_rls.sql     ← Políticas de Storage y RLS
supabase/migrations/006_coberturas_iniciales.sql ← Datos iniciales
```

> **Importante:** Ejecutar uno a la vez y verificar que no haya errores antes de continuar con el siguiente.

### 3.4 Configuración de Auth en Supabase

1. Ir a **Supabase Dashboard → Authentication → Providers**.
2. Verificar que el **Email Provider** esté habilitado.
3. Desactivar **"Confirm email"** (para que los usuarios puedan ingresar sin confirmación de email).
4. En **Authentication → URL Configuration**, agregar la URL del sitio en producción.

### 3.5 Crear el Primer Usuario Administrador

Ejecutar el script incluido en el proyecto:

```bash
node make_admin.cjs usuario@clinica.com
```

Este script:
1. Crea el usuario en Supabase Auth si no existe.
2. Asigna el rol `admin` en `app_metadata`.
3. Muestra la contraseña temporal generada.

---

## 4. Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo (hot reload)
npm run dev

# Compilar para producción (genera carpeta dist/)
npm run build

# Vista previa del build de producción (antes de subir)
npm run preview

# Lint del código
npm run lint
```

---

## 5. Despliegue en Netlify

### 5.1 Despliegue Automático (Recomendado)

1. En el **Netlify Dashboard**, hacer clic en **"Add new site" → "Import an existing project"**.
2. Conectar con el repositorio de GitHub.
3. Configurar los parámetros de build:

| Campo | Valor |
|-------|-------|
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |
| **Node version** | `18` |

4. En **Site settings → Environment variables**, agregar:
   - `VITE_SUPABASE_URL` = URL del proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY` = Anon Key

5. Hacer clic en **"Deploy site"**. Cada push al branch `main` disparará un nuevo despliegue automático.

### 5.2 Redirecciones para React Router

Crear el archivo `public/\_redirects` con este contenido (ya incluido en el proyecto):

```
/*    /index.html    200
```

Esto garantiza que el enrutamiento de React Router funcione correctamente en Netlify. Sin este archivo, al acceder directamente a una URL como `/agenda` el servidor devolvería un 404.

### 5.3 Despliegue Manual

```bash
# Compilar
npm run build

# Subir la carpeta 'dist/' manualmente desde el Netlify Dashboard
# arrastrando la carpeta a la zona de deploy
```

---

## 6. Despliegue en Vercel (Alternativa)

```bash
# Instalar CLI de Vercel
npm install -g vercel

# Desplegar (primera vez)
vercel

# Desplegar en producción
vercel --prod
```

Las variables de entorno se configuran en el **Vercel Dashboard → Settings → Environment Variables**.

Vercel maneja automáticamente el routing SPA, por lo que no es necesario el archivo `_redirects`.

---

## 7. Mantenimiento de la Base de Datos (PostgreSQL / Supabase)

### 7.1 Backups

Supabase realiza backups automáticos con **Point-in-Time Recovery (PITR)**:
- **Plan Free**: backups diarios, retención de 7 días.
- **Plan Pro**: PITR continuo, retención de 30 días.

Para restaurar un backup, ir a **Supabase Dashboard → Database → Backups**.

### 7.2 Monitoreo de Performance

```sql
-- Ver las 10 consultas más lentas (requiere extensión pg_stat_statements)
SELECT query, calls, total_time/calls AS avg_time_ms
FROM pg_stat_statements
ORDER BY avg_time_ms DESC
LIMIT 10;
```

```sql
-- Verificar tamaño de las tablas principales
SELECT
  relname AS tabla,
  pg_size_pretty(pg_total_relation_size(relid)) AS tamaño
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### 7.3 Mantenimiento de Índices

```sql
-- Detectar índices sin uso
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%_pkey';

-- Reindexar tabla si hay bloat
REINDEX TABLE turnos;
```

### 7.4 Limpieza de Datos Históricos (Archivado)

Para mantener la performance con el tiempo, archivar turnos de más de 2 años:

```sql
-- Crear tabla de archivo (ejecutar una vez)
CREATE TABLE turnos_archivo AS SELECT * FROM turnos WHERE false;

-- Archivar turnos de más de 2 años
INSERT INTO turnos_archivo
SELECT * FROM turnos
WHERE fecha_turno < NOW() - INTERVAL '2 years';

-- Eliminar de tabla principal (solo después de verificar el archivo)
DELETE FROM turnos
WHERE fecha_turno < NOW() - INTERVAL '2 years';

-- Liberar espacio físico
VACUUM ANALYZE turnos;
```

---

## 8. Actualización de Dependencias

```bash
# Ver dependencias desactualizadas
npm outdated

# Actualizar dependencias menores (seguras)
npm update

# Actualizar una dependencia específica a la última versión
npm install @supabase/supabase-js@latest

# Verificar vulnerabilidades de seguridad
npm audit

# Aplicar correcciones automáticas de seguridad
npm audit fix
```

> Después de actualizar dependencias, siempre ejecutar `npm run build` para verificar que no hay errores de compilación antes de hacer commit.

---

## 9. Resolución de Problemas Comunes

### Error: "No se pudo crear el turno"
- **Causa probable**: La función `crear_turno_seguro` no existe en la BD.
- **Solución**: Ejecutar `supabase/migrations/003_functions.sql` en el SQL Editor de Supabase.

### Error: "Error cargando turnos" en la Agenda
- **Causa probable**: Las políticas RLS no están configuradas.
- **Solución**: Ejecutar `supabase/migrations/005_storage_rls.sql`.

### La agenda no muestra slots disponibles
- **Causa probable**: El profesional no tiene `agenda_reglas` configuradas para ese día.
- **Solución**: Crear las reglas de horario en **Configuración → Profesionales → Agenda**.
- **Alternativa inmediata**: El sistema activará automáticamente el **Modo Manual** de horario.

### La página da 404 al recargar
- **Causa probable**: Falta el archivo `public/_redirects` en Netlify.
- **Solución**: Crear el archivo con el contenido `/*    /index.html    200`.

### Usuarios no pueden iniciar sesión tras un cambio de contraseña
- **Causa probable**: El token anterior puede estar en caché.
- **Solución**: Limpiar el localStorage del navegador (`F12 → Application → Local Storage → Clear`).

---

## 10. Variables de Configuración de Supabase (Referencia)

| Variable | Dónde obtenerla | Uso |
|----------|----------------|-----|
| `Project URL` | Dashboard → Settings → API | `VITE_SUPABASE_URL` |
| `anon key` | Dashboard → Settings → API | `VITE_SUPABASE_ANON_KEY` |
| `service_role key` | Dashboard → Settings → API | Solo scripts de admin — **NO en el frontend** |
| `JWT Secret` | Dashboard → Settings → API | Verificación de tokens externos |
| `Database password` | Dashboard → Settings → Database | Conexión directa a PostgreSQL |

---

*Centro Médico Patagonia — Área de Sistemas e Informática*
*Última actualización: Agosto 2026*
