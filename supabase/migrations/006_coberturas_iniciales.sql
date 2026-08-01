-- ============================================
-- MIGRACIÓN 006: Coberturas Iniciales
-- Ejecutar en Supabase SQL Editor
-- ============================================

INSERT INTO coberturas (nombre, codigo) 
SELECT nombre, codigo 
FROM (VALUES 
    ('PAMI', 'PAMI'),
    ('OSDE', 'OSDE'),
    ('Swiss Medical', 'SWISS'),
    ('Medife', 'MEDIFE'),
    ('IOSFA', 'IOSFA'),
    ('OSYC', 'OSYC'),
    ('Accord Salud', 'ACCORD'),
    ('Particular', 'PARTICULAR')
) AS v(nombre, codigo)
WHERE NOT EXISTS (
    SELECT 1 FROM coberturas c WHERE c.nombre = v.nombre
);
