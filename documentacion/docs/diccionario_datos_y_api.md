# Diccionario de Datos y API

**Centro Médico Patagonia — Sistema de Gestión Integral**
*Área de Sistemas e Informática*

---

## 1. Esquema General de la Base de Datos

```
pacientes ──┬──► turnos ──────────► profesionales
            │         └──────────► agenda_reglas
            │         └──────────► agenda_bloqueos
            └──► historia_clinica
                      └──► historia_clinica_archivos
            └──► lista_espera ─────► especialidades
                      └──────────► profesionales

coberturas ──────────────────────► pacientes
prestaciones ─────────────────────► turnos
pagos ──────────────────────────► turnos
audit_logs ──────────────────────► auth.users
```

---

## 2. Tablas del Esquema Público

### 2.1 `pacientes`

Almacena información demográfica y clínica básica de cada paciente.

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `serial` | NO | PK autoincremental |
| `dni` | `int4` | SÍ | DNI único (restricción UNIQUE). Compartido con el bot |
| `nombre` | `varchar(120)` | SÍ | Nombre/s del paciente |
| `apellido` | `varchar(120)` | SÍ | Apellido/s |
| `email` | `varchar(120)` | SÍ | Dirección de email (UNIQUE) |
| `telefono` | `varchar(60)` | SÍ | Teléfono de contacto |
| `fecha_nacimiento` | `date` | SÍ | Fecha de nacimiento |
| `sexo` | `varchar(20)` | SÍ | `masculino` \| `femenino` \| `otro` |
| `localidad` | `varchar(100)` | SÍ | Ciudad o localidad |
| `domicilio` | `text` | SÍ | Dirección completa |
| `cobertura_id` | `uuid` | SÍ | FK → `coberturas.id` |
| `nro_afiliado` | `varchar(60)` | SÍ | Número de afiliado a la obra social |
| `estado` | `varchar(20)` | NO | `activo` (default) \| `inactivo` |
| `observaciones` | `text` | SÍ | Notas internas del personal |
| `acepta_comunicaciones` | `bool` | NO | Consentimiento para mensajes WhatsApp (default `true`) |
| `created_at` | `timestamptz` | NO | Fecha de creación del registro |
| `updated_at` | `timestamptz` | NO | Última modificación |

**Índices:**
- `PRIMARY KEY (id)`
- `UNIQUE (dni)`
- `UNIQUE (email)`

---

### 2.2 `turnos`

Tabla central de la agenda. Unifica los turnos del bot y del panel web.

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `serial` | NO | PK autoincremental |
| `fecha_turno` | `date` | SÍ | Fecha del turno (YYYY-MM-DD) |
| `hora` | `time` | SÍ | Hora del turno (HH:MM:SS) |
| `dni` | `int4` | SÍ | DNI del paciente (referencia desnormalizada para el bot) |
| `nombre` | `varchar(120)` | SÍ | Nombre completo (desnormalizado) |
| `email` | `varchar(120)` | SÍ | Email (desnormalizado) |
| `telefono` | `varchar(60)` | SÍ | Teléfono (desnormalizado) |
| `servicios` | `text` | SÍ | Descripción del servicio / prestación |
| `precio` | `numeric(10,2)` | SÍ | Precio acordado |
| `paciente` | `bool` | NO | Fue atendido como paciente (legado del bot) |
| `comprobante_recibido` | `bool` | NO | El paciente envió comprobante de pago por WhatsApp |
| `cancelado` | `bool` | NO | Flag principal de cancelación (compatibilidad bot) |
| `profesional_id` | `uuid` | SÍ | FK → `profesionales.id` |
| `prestacion_id` | `uuid` | SÍ | FK → `prestaciones.id` |
| `estado` | `varchar(40)` | NO | `reservado` \| `confirmado` \| `asistido` \| `ausente` \| `cancelado` |
| `canal_origen` | `varchar(40)` | NO | `bot` \| `panel` \| `web` |
| `es_sobreturno` | `bool` | NO | Se forzó el slot ya ocupado |
| `motivo_sobreturno` | `text` | SÍ | Justificación del sobreturno |
| `es_primera_vez` | `bool` | NO | Primera consulta del paciente |
| `observaciones` | `text` | SÍ | Notas adicionales del turno |
| `creado_por` | `uuid` | SÍ | FK → `auth.users.id` — Quién creó el turno desde el panel |
| `updated_at` | `timestamptz` | NO | Última modificación |

**Índices importantes:**
```sql
CREATE INDEX ON turnos (fecha_turno, profesional_id);
CREATE INDEX ON turnos (cancelado, estado);
```

---

### 2.3 `profesionales`

Catálogo de profesionales de salud activos en la clínica.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` | PK (gen_random_uuid) |
| `nombre` | `varchar(120)` | Nombre del profesional |
| `apellido` | `varchar(120)` | Apellido |
| `especialidad` | `varchar(100)` | Especialidad médica principal |
| `matricula` | `varchar(60)` | Número de matrícula profesional |
| `modalidad` | `varchar(20)` | `presencial` \| `virtual` \| `híbrida` |
| `duracion_slot` | `int4` | Duración de cada turno en minutos (default: 30) |
| `permite_sobreturnos` | `bool` | Si se permiten sobreturnos para este profesional |
| `activo` | `bool` | Si el profesional está activo en el sistema |
| `created_at` | `timestamptz` | Fecha de alta en el sistema |

---

### 2.4 `agenda_reglas`

Define los horarios de atención de cada profesional. El procedimiento `get_slots_disponibles` la consulta para generar los slots de cada día.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` | PK |
| `profesional_id` | `uuid` | FK → `profesionales.id` |
| `dia_semana` | `int4` | 0=Domingo, 1=Lunes … 6=Sábado (`NULL` si es fecha específica) |
| `fecha_especifica` | `date` | Fecha puntual (anula `dia_semana`) |
| `hora_inicio` | `time` | Inicio del bloque horario |
| `hora_fin` | `time` | Fin del bloque horario |
| `duracion_slot` | `int4` | Minutos por turno (sobreescribe el del profesional) |
| `buffer_minutos` | `int4` | Minutos de buffer entre turnos |
| `max_turnos` | `int4` | Máximo de turnos permitidos (NULL = sin límite) |
| `activo` | `bool` | Si la regla está vigente |
| `fecha_desde` | `date` | Validez desde esta fecha |
| `fecha_hasta` | `date` | Validez hasta esta fecha |

---

### 2.5 `coberturas`

Catálogo de obras sociales / prepagas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` | PK |
| `nombre` | `varchar(100)` | Nombre de la cobertura (ej: "PAMI", "OSDE 210") |
| `codigo` | `varchar(40)` | Código interno o código de la obra social |
| `activo` | `bool` | Si está habilitada para asignar a pacientes |

---

### 2.6 `historia_clinica`

Un registro por paciente. El contenido es acumulativo y nunca se elimina.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` | PK |
| `paciente_id` | `int4` | FK → `pacientes.id` (UNIQUE — una HC por paciente) |
| `contenido` | `text` | Texto acumulativo con evoluciones y notas médicas |
| `created_at` | `timestamptz` | Fecha de creación |
| `updated_at` | `timestamptz` | Última modificación |

---

### 2.7 `pagos`

Registro de transacciones de facturación por turno.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` | PK |
| `turno_id` | `int4` | FK → `turnos.id` |
| `monto` | `numeric(10,2)` | Monto cobrado |
| `metodo_pago` | `varchar(30)` | `efectivo` \| `tarjeta` \| `transferencia` \| `obra_social` |
| `estado_pago` | `varchar(20)` | `pendiente` \| `pagado` \| `parcial` \| `anulado` |
| `cobertura_id` | `uuid` | FK → `coberturas.id` (si se cobró por obra social) |
| `nro_autorizacion` | `varchar(60)` | Número de autorización de la obra social |
| `observaciones` | `text` | Notas del cobro |
| `creado_por` | `uuid` | FK → `auth.users.id` |
| `created_at` | `timestamptz` | Timestamp del cobro |

---

## 3. Procedimientos Almacenados (RPC Functions)

### 3.1 `crear_turno_seguro` — Reserva Atómica con Control de Concurrencia

Esta es la función crítica del sistema. Evita doble booking usando bloqueo optimista con `FOR UPDATE SKIP LOCKED`.

**Signatura:**
```sql
CREATE OR REPLACE FUNCTION crear_turno_seguro(
  p_fecha_turno        date,
  p_hora               time,
  p_dni                int4,
  p_nombre             varchar,
  p_email              varchar,
  p_telefono           varchar,
  p_servicios          text,
  p_precio             numeric,
  p_profesional_id     uuid,
  p_canal_origen       varchar,
  p_forzar_sobreturno  bool DEFAULT false,
  p_motivo_sobreturno  text DEFAULT NULL
) RETURNS json
```

**Lógica:**
1. Intenta bloquear el slot con `FOR UPDATE SKIP LOCKED` (evita deadlocks).
2. Verifica si existe un turno activo en el mismo slot.
3. Si está ocupado y el origen es `'bot'` o no se forzó sobreturno → devuelve `{"ok": false, "error": "SLOT_OCUPADO"}`.
4. Si se forzó sobreturno → inserta el nuevo turno con `es_sobreturno = true`.
5. Devuelve `{"ok": true, "id": <nuevo_id>}`.

**Llamada desde React:**
```js
const { data, error } = await supabase.rpc('crear_turno_seguro', {
  p_fecha_turno: '2026-08-15',
  p_hora: '09:30:00',
  p_dni: 12345678,
  p_nombre: 'Juan Pérez',
  p_email: 'juan@email.com',
  p_telefono: '2996123456',
  p_servicios: 'Cardiología',
  p_precio: 5000,
  p_profesional_id: 'uuid-del-profesional',
  p_canal_origen: 'panel',
  p_forzar_sobreturno: false,
  p_motivo_sobreturno: null,
})
```

---

### 3.2 `get_slots_disponibles` — Generación de Agenda Disponible

Genera los slots horarios para un profesional en una fecha dada, marcando cuáles están ocupados.

**Signatura:**
```sql
CREATE OR REPLACE FUNCTION get_slots_disponibles(
  p_profesional_id uuid,
  p_fecha          date
) RETURNS TABLE(hora_slot time, disponible boolean)
```

**Lógica:**
1. Busca en `agenda_reglas` una regla activa para ese profesional y día de la semana / fecha específica.
2. Verifica si hay bloqueos en `agenda_bloqueos` para ese día → si los hay, devuelve vacío.
3. Genera iterativamente los slots desde `hora_inicio` hasta `hora_fin` en intervalos de `duracion_slot` minutos.
4. Para cada slot, verifica si existe un turno activo (no cancelado, no sobreturno) → `disponible = false`.

**Llamada desde React:**
```js
const { data } = await supabase.rpc('get_slots_disponibles', {
  p_profesional_id: 'uuid-del-profesional',
  p_fecha: '2026-08-15'
})
// Retorna: [{ hora_slot: '08:00:00', disponible: true }, ...]
```

---

### 3.3 `agregar_nota_hc` — Nota Médica Acumulativa e Inmutable

Agrega texto a la historia clínica sin sobreescribir el contenido anterior. Cada nota incluye timestamp y firma automática.

**Signatura:**
```sql
CREATE OR REPLACE FUNCTION agregar_nota_hc(
  p_paciente_id int4,
  p_texto       text
) RETURNS void
```

**Lógica:**
1. Si no existe historia clínica para el paciente, la crea.
2. Concatena al contenido existente el separador `--- DD/MM/YYYY HH:MM ---` seguido del texto.
3. Actualiza `updated_at`.

---

## 4. API REST Automática (PostgREST)

Supabase expone automáticamente cada tabla como endpoints REST. La URL base es:
```
https://[PROYECTO].supabase.co/rest/v1/
```

### Ejemplos de Queries Comunes

**Obtener turnos del día con datos del profesional:**
```
GET /rest/v1/turnos?select=*,profesionales(nombre,apellido)&fecha_turno=eq.2026-08-15&order=hora
Authorization: Bearer <JWT>
apikey: <anon_key>
```

**Buscar paciente por nombre (búsqueda parcial):**
```
GET /rest/v1/pacientes?nombre=ilike.*Juan*&limit=10
```

**Cancelar un turno:**
```
PATCH /rest/v1/turnos?id=eq.1234
Content-Type: application/json
{ "cancelado": true, "estado": "cancelado" }
```

---

*Centro Médico Patagonia — Área de Sistemas e Informática*
*Última actualización: Agosto 2026*
