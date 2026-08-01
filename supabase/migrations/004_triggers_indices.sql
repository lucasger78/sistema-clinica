-- ============================================
-- MIGRACIÓN 004: Triggers de auditoría e índices de performance
-- ============================================

-- Trigger de auditoría en turnos
CREATE OR REPLACE FUNCTION fn_audit_turnos() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs(tabla, registro_id, accion, datos_anteriores, datos_nuevos)
  VALUES (
    'turnos',
    COALESCE(NEW.id, OLD.id)::text,
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_turnos ON turnos;
CREATE TRIGGER trg_audit_turnos
AFTER INSERT OR UPDATE OR DELETE ON turnos
FOR EACH ROW EXECUTE FUNCTION fn_audit_turnos();

-- Trigger para actualizar updated_at en turnos
CREATE OR REPLACE FUNCTION fn_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_turnos_updated ON turnos;
CREATE TRIGGER trg_turnos_updated
BEFORE UPDATE ON turnos
FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

DROP TRIGGER IF EXISTS trg_pacientes_updated ON pacientes;
CREATE TRIGGER trg_pacientes_updated
BEFORE UPDATE ON pacientes
FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_pacientes_dni ON pacientes(dni);
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombre);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_prof ON turnos(fecha_turno, profesional_id);
CREATE INDEX IF NOT EXISTS idx_turnos_dni ON turnos(dni);
CREATE INDEX IF NOT EXISTS idx_hc_paciente ON historia_clinica(paciente_id);
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
CREATE INDEX IF NOT EXISTS idx_agenda_reglas_prof ON agenda_reglas(profesional_id, activo);
CREATE INDEX IF NOT EXISTS idx_agenda_bloqueos_prof ON agenda_bloqueos(profesional_id);
CREATE INDEX IF NOT EXISTS idx_pagos_turno ON pagos(turno_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_estado ON lista_espera(estado);
