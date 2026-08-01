-- ============================================
-- MIGRACIÓN 001: Nuevas tablas (Desde cero)
-- Centro Médico Patagonia
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla: coberturas médicas
CREATE TABLE IF NOT EXISTS coberturas (
  id      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre  varchar(100) NOT NULL,
  codigo  varchar(40),
  activo  bool DEFAULT true
);

-- Tabla: especialidades
CREATE TABLE IF NOT EXISTS especialidades (
  id      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre  varchar(100) NOT NULL UNIQUE,
  activo  bool DEFAULT true
);

-- Tabla: profesionales
CREATE TABLE IF NOT EXISTS profesionales (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          varchar(120) NOT NULL,
  apellido        varchar(120) NOT NULL,
  especialidad    varchar(100),
  matricula       varchar(60),
  modalidad       varchar(20) DEFAULT 'presencial',
  duracion_slot   int4 DEFAULT 30,
  permite_sobreturnos bool DEFAULT false,
  activo          bool DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Tabla: prestaciones
CREATE TABLE IF NOT EXISTS prestaciones (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre              varchar(100) NOT NULL,
  especialidad_id     uuid REFERENCES especialidades(id),
  duracion_minutos    int4 DEFAULT 30,
  precio_base         numeric(10,2),
  requiere_validacion bool DEFAULT false,
  modalidad           varchar(20) DEFAULT 'presencial',
  color_hex           varchar(7) DEFAULT '#3B82F6',
  activo              bool DEFAULT true
);

-- Tabla: pacientes (Base Bot + Módulo Web)
CREATE TABLE IF NOT EXISTS pacientes (
  -- Columnas Base (Bot)
  id                serial PRIMARY KEY,
  dni               int4 UNIQUE,
  nombre            varchar(120),
  email             varchar(120),
  telefono          varchar(60),
  fecha_nacimiento  date,
  
  -- Columnas Extendidas (Sistema Panel)
  apellido          varchar(120),
  sexo              varchar(20),
  localidad         varchar(100),
  domicilio         text,
  cobertura_id      uuid REFERENCES coberturas(id),
  nro_afiliado      varchar(60),
  estado            varchar(20) DEFAULT 'activo',
  observaciones     text,
  acepta_comunicaciones bool DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Tabla: turnos (Base Bot + Módulo Web)
CREATE TABLE IF NOT EXISTS turnos (
  -- Columnas Base (Bot)
  id                    serial PRIMARY KEY,
  fecha_turno           date,
  hora                  time,
  dni                   int4,
  servicios             text,
  precio                numeric(10,2),
  nombre                varchar(120),
  email                 varchar(120),
  telefono              varchar(60),
  paciente              bool DEFAULT false,
  comprobante_recibido  bool DEFAULT false,
  cancelado             bool DEFAULT false,

  -- Columnas Extendidas (Sistema Panel)
  profesional_id        uuid REFERENCES profesionales(id),
  prestacion_id         uuid REFERENCES prestaciones(id),
  estado                varchar(40) DEFAULT 'reservado',
  canal_origen          varchar(40) DEFAULT 'bot',
  es_sobreturno         bool DEFAULT false,
  motivo_sobreturno     text,
  es_primera_vez        bool DEFAULT true,
  observaciones         text,
  creado_por            uuid REFERENCES auth.users(id),
  updated_at            timestamptz DEFAULT now()
);

-- Tabla: reglas de agenda
CREATE TABLE IF NOT EXISTS agenda_reglas (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profesional_id  uuid REFERENCES profesionales(id) ON DELETE CASCADE,
  dia_semana      int4,
  fecha_especifica date,
  hora_inicio     time NOT NULL,
  hora_fin        time NOT NULL,
  duracion_slot   int4 DEFAULT 30,
  buffer_minutos  int4 DEFAULT 0,
  max_turnos      int4,
  activo          bool DEFAULT true,
  fecha_desde     date,
  fecha_hasta     date
);

-- Tabla: bloqueos de agenda
CREATE TABLE IF NOT EXISTS agenda_bloqueos (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profesional_id  uuid REFERENCES profesionales(id) ON DELETE CASCADE,
  fecha_inicio    timestamptz NOT NULL,
  fecha_fin       timestamptz NOT NULL,
  motivo          text,
  creado_por      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

-- Tabla: historia clínica (una fila por paciente)
CREATE TABLE IF NOT EXISTS historia_clinica (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id int4 REFERENCES pacientes(id) ON DELETE CASCADE UNIQUE,
  contenido   text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Tabla: archivos de historia clínica
CREATE TABLE IF NOT EXISTS historia_clinica_archivos (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  historia_clinica_id uuid REFERENCES historia_clinica(id) ON DELETE CASCADE,
  nombre_archivo      varchar(255) NOT NULL,
  tipo                varchar(20) NOT NULL,
  storage_path        text NOT NULL,
  tamanio_bytes       int8,
  subido_por          uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now()
);

-- Tabla: logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tabla            varchar(80) NOT NULL,
  registro_id      text NOT NULL,
  accion           varchar(20) NOT NULL,
  datos_anteriores jsonb,
  datos_nuevos     jsonb,
  usuario_id       uuid REFERENCES auth.users(id),
  created_at       timestamptz DEFAULT now()
);

-- Tabla: lista de espera
CREATE TABLE IF NOT EXISTS lista_espera (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id     int4 REFERENCES pacientes(id),
  profesional_id  uuid REFERENCES profesionales(id),
  especialidad_id uuid REFERENCES especialidades(id),
  prioridad       int4 DEFAULT 5,
  estado          varchar(30) DEFAULT 'activa',
  notas           text,
  created_at      timestamptz DEFAULT now()
);

-- Tabla: pagos (facturación básica)
CREATE TABLE IF NOT EXISTS pagos (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id        int4 REFERENCES turnos(id),
  monto           numeric(10,2) NOT NULL,
  metodo_pago     varchar(30) NOT NULL DEFAULT 'efectivo',
  estado_pago     varchar(20) DEFAULT 'pendiente',
  cobertura_id    uuid REFERENCES coberturas(id),
  nro_autorizacion varchar(60),
  observaciones   text,
  creado_por      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);
