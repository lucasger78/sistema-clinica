-- ============================================
-- MIGRACIÓN 005: Storage y RLS
-- ============================================

-- Bucket para archivos de historia clínica
INSERT INTO storage.buckets (id, name, public)
VALUES ('historia-clinica', 'historia-clinica', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso al bucket
CREATE POLICY "Usuarios autenticados pueden subir archivos" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'historia-clinica');

CREATE POLICY "Usuarios autenticados pueden ver archivos" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'historia-clinica');

CREATE POLICY "Usuarios autenticados pueden eliminar archivos" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'historia-clinica');

-- RLS básico para las tablas principales
-- NOTA: Ajustar según necesidad. Por ahora se permite acceso completo a usuarios autenticados.

ALTER TABLE profesionales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado profesionales" ON profesionales FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE especialidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado especialidades" ON especialidades FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE prestaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado prestaciones" ON prestaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE agenda_reglas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado agenda_reglas" ON agenda_reglas FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE agenda_bloqueos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado agenda_bloqueos" ON agenda_bloqueos FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE historia_clinica ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado historia_clinica" ON historia_clinica FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE historia_clinica_archivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado hc_archivos" ON historia_clinica_archivos FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado audit_logs" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE coberturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado coberturas" ON coberturas FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado lista_espera" ON lista_espera FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado pagos" ON pagos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS para turnos (tabla central de la agenda)
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven turnos"
ON turnos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Autenticados insertan turnos"
ON turnos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Autenticados actualizan turnos"
ON turnos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS para pacientes
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso autenticado pacientes" ON pacientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
