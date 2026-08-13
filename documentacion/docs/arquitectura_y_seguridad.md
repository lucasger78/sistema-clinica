# Arquitectura y Seguridad

**Centro Médico Patagonia — Sistema de Gestión Integral**
*Área de Sistemas e Informática*

---

## 1. Topología General: SPA + BaaS

El sistema está construido sobre una arquitectura **Single Page Application (SPA)** en el frontend desacoplada completamente del backend, el cual es provisto por **Supabase** como plataforma Backend-as-a-Service (BaaS).

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                           │
│                                                                     │
│   React 18 + Vite ──► React Router v6 ──► react-hot-toast           │
│   Tailwind CSS         Lucide Icons        date-fns                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │  HTTPS (TLS 1.3)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (BaaS - Backend)                        │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │  REST API   │  │  Auth (JWT)  │  │  Realtime    │  │ Storage │ │
│  │ PostgREST   │  │  GoTrue      │  │  WebSockets  │  │  S3-compat│ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘ │
│         │                │                  │               │      │
│  ┌──────▼────────────────▼──────────────────▼───────────────▼────┐ │
│  │              PostgreSQL 15 (Base de Datos)                     │ │
│  │              RLS Policies activas en todas las tablas          │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                             │  REST API
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   BOT WHATSAPP (ManyChat)                           │
│                   Service Role Key — sin RLS                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Autenticación con JWT (GoTrue)

Supabase Auth utiliza **GoTrue**, un microservicio de autenticación que emite tokens **JWT (JSON Web Tokens)** con firma RS256.

### 2.1 Flujo de Autenticación

```
Usuario ingresa credenciales
       │
       ▼
POST /auth/v1/token  (email + password)
       │
       ▼
GoTrue verifica en tabla auth.users
       │
       ▼
Retorna:  access_token (JWT)  ← expira en 1 hora
          refresh_token       ← expira en 7 días
       │
       ▼
El cliente React almacena tokens en localStorage
y los refresca automáticamente mediante supabase-js
```

### 2.2 Estructura del JWT

```json
{
  "header": {
    "alg": "RS256",
    "kid": "supabase-key-id"
  },
  "payload": {
    "sub": "uuid-del-usuario",
    "email": "usuario@clinica.com",
    "role": "authenticated",
    "app_metadata": {
      "rol": "admin"    // ← Custom claim: 'admin' | 'secretaria' | 'profesional'
    },
    "iat": 1700000000,
    "exp": 1700003600
  }
}
```

> **Importante:** el campo `app_metadata.rol` es asignado por el Administrador desde Configuración → Usuarios, y solo puede ser modificado con la **Service Role Key** (server-side), nunca desde el cliente.

---

## 3. Control de Acceso Basado en Roles (RBAC)

### 3.1 Roles del Sistema

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| `admin` | Total | Configuración, reportes, gestión de usuarios |
| `secretaria` | Operativo | Agenda, turnos, facturación, pacientes |
| `profesional` | Limitado | Solo agenda propia + historias clínicas |

### 3.2 Implementación en el Frontend

El hook `useAuth()` expone el rol actual leído del JWT:

```js
// src/hooks/useAuth.js
const rol = session?.user?.app_metadata?.rol ?? 'profesional'
```

Las rutas protegidas en `App.jsx` utilizan el componente `<ProtectedRoute allowedRoles={[...]} />` que redirige al Dashboard si el rol no coincide.

---

## 4. Row Level Security (RLS)

**RLS** es la capa de seguridad a nivel de base de datos PostgreSQL. Garantiza que los datos se filtren correctamente incluso si hay un error en el código frontend.

### 4.1 Principio de Funcionamiento

Cada consulta SQL ejecutada por PostgREST incluye el JWT del usuario. PostgreSQL evalúa las políticas RLS antes de devolver filas:

```sql
-- Ejemplo de política RLS en la tabla 'turnos'
CREATE POLICY "autenticados_ven_turnos"
ON turnos
FOR SELECT
TO authenticated
USING (true);  -- Todos los usuarios autenticados pueden ver turnos

CREATE POLICY "solo_admin_secretaria_inserta"
ON turnos
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'rol') IN ('admin', 'secretaria')
);
```

### 4.2 Políticas por Tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `turnos` | authenticated | admin, secretaria | admin, secretaria | admin |
| `pacientes` | authenticated | admin, secretaria | authenticated | admin |
| `historia_clinica` | authenticated | authenticated | authenticated | admin |
| `historia_clinica_archivos` | authenticated | authenticated | — | authenticated |
| `profesionales` | authenticated | admin | admin | admin |
| `pagos` | admin, secretaria | admin, secretaria | admin | admin |
| `audit_logs` | admin | system | — | — |

### 4.3 Storage Bucket: `historia-clinica`

Los archivos adjuntos (estudios, radiografías) son almacenados en el bucket privado `historia-clinica`. Las políticas de acceso exigen:
1. Token JWT válido (usuario autenticado).
2. URL firmada con expiración de 60 minutos para descarga directa.

```sql
-- Política Storage
CREATE POLICY "solo_autenticados_descargan"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'historia-clinica');
```

---

## 5. Seguridad de la Clave de API

| Clave | Uso | Permisos | Dónde se usa |
|-------|-----|----------|--------------|
| `anon key` | Frontend React | Sujeta a RLS | Variable `VITE_SUPABASE_ANON_KEY` |
| `service_role key` | Bot WhatsApp / Scripts | Sin RLS (superusuario) | ManyChat / servidor Node.js |

> **⚠️ Advertencia:** La `service_role key` **nunca** debe exponerse en el código frontend ni en repositorios Git. Se considera equivalente al acceso root de la base de datos.

---

## 6. Comunicación en Tiempo Real (Supabase Realtime)

El módulo de Agenda usa WebSockets a través de Supabase Realtime para actualizar la UI automáticamente cuando:
- El bot de WhatsApp cancela un turno.
- Un profesional cambia el estado de un paciente.

```js
// AgendaPage.jsx
const channel = supabase
  .channel('turnos-realtime')
  .on('postgres_changes', {
    event: '*',        // INSERT | UPDATE | DELETE
    schema: 'public',
    table: 'turnos'
  }, () => fetchTurnos())
  .subscribe()
```

---

*Centro Médico Patagonia — Área de Sistemas e Informática*
*Última actualización: Agosto 2026*
