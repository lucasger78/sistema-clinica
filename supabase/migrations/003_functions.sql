-- ============================================
-- MIGRACIÓN 003: Funciones PostgreSQL
-- ============================================

-- 1. Crear turno con control de concurrencia
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
) RETURNS json AS $$
DECLARE
  v_turno_existente int4;
  v_nuevo_id int4;
BEGIN
  -- Lock con SKIP LOCKED para evitar deadlocks
  PERFORM id FROM turnos
  WHERE profesional_id = p_profesional_id
    AND fecha_turno = p_fecha_turno
    AND hora = p_hora
    AND cancelado = false
  FOR UPDATE SKIP LOCKED;

  -- Verificar si el slot está ocupado
  SELECT id INTO v_turno_existente
  FROM turnos
  WHERE profesional_id = p_profesional_id
    AND fecha_turno = p_fecha_turno
    AND hora = p_hora
    AND cancelado = false;

  IF v_turno_existente IS NOT NULL THEN
    IF p_canal_origen = 'bot' OR NOT p_forzar_sobreturno THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'SLOT_OCUPADO',
        'mensaje', 'El horario seleccionado ya no está disponible.'
      );
    END IF;
  END IF;

  -- Insertar el turno
  INSERT INTO turnos (
    fecha_turno, hora, dni, nombre, email, telefono,
    servicios, precio, paciente, comprobante_recibido, cancelado,
    profesional_id, canal_origen, es_sobreturno, motivo_sobreturno,
    estado
  ) VALUES (
    p_fecha_turno, p_hora, p_dni, p_nombre, p_email, p_telefono,
    p_servicios, p_precio, true, false, false,
    p_profesional_id, p_canal_origen,
    (v_turno_existente IS NOT NULL AND p_forzar_sobreturno),
    p_motivo_sobreturno,
    'reservado'
  ) RETURNING id INTO v_nuevo_id;

  RETURN json_build_object('ok', true, 'id', v_nuevo_id);
END;
$$ LANGUAGE plpgsql;


-- 2. Calcular slots disponibles de un profesional
CREATE OR REPLACE FUNCTION get_slots_disponibles(
  p_profesional_id uuid,
  p_fecha          date
) RETURNS TABLE(hora_slot time, disponible boolean) AS $$
DECLARE
  v_regla agenda_reglas%ROWTYPE;
  v_slot  time;
BEGIN
  -- Buscar regla activa para este profesional y fecha
  SELECT * INTO v_regla FROM agenda_reglas
  WHERE profesional_id = p_profesional_id
    AND activo = true
    AND (dia_semana = EXTRACT(DOW FROM p_fecha)::int4 OR fecha_especifica = p_fecha)
    AND (fecha_desde IS NULL OR fecha_desde <= p_fecha)
    AND (fecha_hasta IS NULL OR fecha_hasta >= p_fecha)
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- Verificar bloqueos
  IF EXISTS (
    SELECT 1 FROM agenda_bloqueos
    WHERE profesional_id = p_profesional_id
      AND fecha_inicio::date <= p_fecha
      AND fecha_fin::date >= p_fecha
  ) THEN RETURN; END IF;

  -- Generar slots
  v_slot := v_regla.hora_inicio;
  WHILE v_slot < v_regla.hora_fin LOOP
    hora_slot := v_slot;
    disponible := NOT EXISTS (
      SELECT 1 FROM turnos
      WHERE profesional_id = p_profesional_id
        AND fecha_turno = p_fecha
        AND hora = v_slot
        AND cancelado = false
        AND es_sobreturno = false
    );
    RETURN NEXT;
    v_slot := v_slot + (v_regla.duracion_slot || ' minutes')::interval;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- 3. Agregar nota a historia clínica (texto acumulativo, nunca se borra)
CREATE OR REPLACE FUNCTION agregar_nota_hc(
  p_paciente_id int4,
  p_texto       text
) RETURNS void AS $$
DECLARE
  v_hc_id uuid;
  v_timestamp text;
BEGIN
  v_timestamp := to_char(now() AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI');

  -- Crear registro si no existe
  INSERT INTO historia_clinica (paciente_id, contenido)
  VALUES (p_paciente_id, '')
  ON CONFLICT (paciente_id) DO NOTHING;

  -- Agregar nota al final (nunca reemplazar)
  UPDATE historia_clinica
  SET
    contenido = contenido || E'\n\n--- ' || v_timestamp || E' ---\n' || p_texto,
    updated_at = now()
  WHERE paciente_id = p_paciente_id;
END;
$$ LANGUAGE plpgsql;
