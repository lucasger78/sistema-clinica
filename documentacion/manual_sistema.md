---
title: "Documentación Integral del Sistema"
author: "Centro Médico Patagonia"
date: "Marzo 2026"
---

# Sistema de Gestión Integral
**Centro Médico Patagonia**


---

## 1. Relevamiento Funcional

### 1.1 Objetivo del Sistema
El sistema tiene como propósito centralizar, digitalizar y optimizar la gestión operativa, médica y administrativa del **Centro Médico Patagonia**. Se enfoca en gestionar turnos, historias clínicas, facturación de obras sociales y la comunicación automática mediante un Bot de WhatsApp integrado en tiempo real.

### 1.2 Roles y Permisos
El sistema cuenta con un modelo de seguridad basado en (RBAC - Role Based Access Control), dividido en tres roles principales:
- **Administrador**: Acceso hiper-privilegiado. Puede gestionar configuraciones sensibles, obras sociales, alta de nuevos profesionales, especialidades, y auditar toda la facturación y reportes estadísticos.
- **Secretaria/o**: Rol operativo administrativo. Encargado de la admisión de pacientes, gestión general de la agenda de todos los profesionales, cobros en mostrador, confirmación/cancelación de turnos y manejo de sala de espera.
- **Profesional (Médico)**: Rol centrado en la atención. Solo puede visualizar su propia agenda de turnos diarios y tiene permisos exclusivos para editar, crear e imprimir las Historias Clínicas de los pacientes que atiende.

### 1.3 Módulos Principales
1. **Agenda y Turnos**: Visualización diaria/semanal, manejo de sobreturnos, estados de asistencia (Reservado, Confirmado, Asistido, Ausente, Cancelado).
2. **Pacientes**: Registro demográfico, validación de DNI único, asignación de coberturas médicas, historial de atención.
3. **Historia Clínica Electrónica**: Carga de evoluciones médicas, antecedentes, adjuntos (PDFs/Imágenes) almacenados de forma segura, e impresión de recetas con membrete de la clínica.
4. **Facturación y Caja**: Registro de pagos, copagos, reportes para obras sociales y control de ingresos.
5. **Dashboard Analítico**: Indicadores de rendimiento del día y del mes en curso, altas de pacientes y monitoreo en frío.
6. **Configuración**: Autogestión de profesionales, especialidades, tiempos de atención, coberturas y usuarios del sistema.

---

## 2. API Documentada (Backend as a Service - Supabase)

El sistema carece de un servidor Node.js/Python intermedio. La base de datos PostgreSQL en Supabase actúa como el único origen de verdad y expone una API REST/GraphQL automática.

### 2.1 Tablas Principales (Esquema Público)
* `pacientes`: Almacena información demográfica y la vinculación a su `cobertura_id`.
* `turnos`: Núcleo de la agenda. Guarda `fecha_turno`, `hora`, `estado`, relacionándose por DNI (para el Bot) y UUID (internamente). 
* `historia_clinica`: Registros médicos enlazados al paciente y al turno.
* `coberturas`: Catálogo de Obras Sociales activas/inactivas.

### 2.2 Sincronización Bot de WhatsApp (Integración ManyChat)
El bot de WhatsApp interactúa con la base de datos de manera directa a través de la API REST que ofrece Supabase mediante las _Service Role Keys_.
- **Lectura de Agenda**: El bot lee los turnos disponibles filtrando `cancelado = false`.
- **Cancelaciones**: Cuando el paciente cancela, el bot actualiza el flag `cancelado = true` en la tabla `turnos`. El panel web de React captura este estado mediante Supabase Realtime y pinta el turno de color gris y tachado inmediatamente.

### 2.3 Seguridad y Reglas de Nivel de Fila (RLS)
Todas las consultas HTTP generadas por el cliente de React pasan por el filtro **Row Level Security (RLS)** de PostgreSQL.
- Se exige un `JWT (JSON Web Token)` válido para ejecutar cualquier `SELECT`, `INSERT`, `UPDATE` o `DELETE`.
- Archivos en el Storage (bucket `historia-clinica`) solo se devuelven si la petición es firmada por un usuario autenticado.

---

## 3. Instalación y Mantenimiento

### 3.1 Requisitos del Sistema
- Node.js versión 18+ y npm/yarn.
- Proyecto activo en **Supabase** (Base de datos PostgreSQL + Auth + Storage).
- Cuenta en **Netlify** o **Vercel** para despliegue del panel web frontend.

### 3.2 Pasos de Instalación
1. **Clonar Repositorio**: `git clone [url-repo] Sistema-Ok`
2. **Dependencias**: Ejecutar `npm install` en la raíz del proyecto.
3. **Variables de Entorno**: Crear el archivo `.env` tomando como base `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://[TU-PROYECTO].supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
   ```
4. **Base de Datos**: Desde el "SQL Editor" de Supabase, ejecutar en orden estricto las migraciones que se encuentran en la carpeta `/supabase/migrations/`:
   - `001_new_tables.sql`
   - `003_seed_data.sql`
   - `004_triggers_indices.sql`
   - `005_storage_rls.sql`
   - `006_coberturas_iniciales.sql`
5. **Autenticación (Auth)**: Habilitar "Email Provider" y desactivar "Confirm Email".
6. **Ejecución Local**: Ejecutar `npm run dev` para lanzar el servidor de prueba.

### 3.3 Mantenimiento y Backup
- **Respaldos (Backups)**: Supabase realiza *Point-in-Time Recovery* automático diariamente.
- Para escalar el mantenimiento de dependencias del frontend, ejecutar periódicamente `npm update`. 
- Revisar semanalmente la tabla `audit_logs` en busca de comportamientos extraños en las cancelaciones o pagos.

---

## 4. Manual Básico de Uso

### 4.1 Ingreso al Sistema
Diríjase a la URL de producción ingresando su Email y Contraseña brindados por la clínica. Si usted entra por primera vez, pida al Administrador que le genere un usuario desde el panel de "Configuración".

### 4.2 Agenda (Gestión Diaria)
Es la pantalla donde pasará la mayor parte de su tiempo.
1. Haga clic en la pestaña **Agenda** en el menú izquierdo.
2. Posee dos modos visuales (Diaria y Semanal), controlables desde los botones superiores derechos.
3. **Nuevo Turno**: Presione en un horario vacío para crear un sobreturno, o el botón azul "Nuevo Turno". Seleccione el paciente y la fecha.
4. **Cambio de Estado**: Al hacer clic sobre cualquier bloque ocupado, el estado del paciente puede mutar a: *Confirmado* (verde claro), *Ausente* (rojo), o *Asistido* (pasó al consultorio).

### 4.3 Gestión de Pacientes y Coberturas
1. Ingrese al módulo **Pacientes**. Utilice la barra de búsqueda para ubicar a una persona rápidamente por su nombre o DNI.
2. **Añadir/Editar Cobertura**: Dentro de la ficha del paciente, puede seleccionar obras sociales como PAMI, OSDE, Swiss Medical. Si falta una obra social en el listado, el Administrador debe añadirla en *Configuración -> Coberturas*.
3. **Ver Historial**: Al presionar en el "ojo" junto al nombre de un paciente, podrá ver sus últimos 10 turnos sacados y si faltó o si canceló alguno a través del Bot de WhatsApp.

### 4.4 Historia Clínica
A este módulo entran típicamente los **Profesionales (Médicos)**.
1. Al terminar la consulta de la Agenda, el profesional debe dar clic en "Historia Clínica".
2. **Nueva Evolución**: Añada síntomas, diagnóstico y el tratamiento indicado. Quedará sellado con la fecha, hora, y la firma digital del profesional logueado. Es inalterable post-grabado (salvo para correcciones formales inmediatas).
3. **Archivos Adjuntos**: Puede hacer clic para subir estudios (análisis de sangre en PDF, radiografías en JPG/PNG). Éstos pasan a la bóveda encriptada del servidor para uso futuro.
4. **Impresión de Recetas**: Al redactar un medicamento, el botón "Imprimir" generará un PDF automático listando la clínica, logo, fecha actual e indicaciones claras para que el paciente lo presente en la farmacia.

---
*Centro Médico Patagonia - Área de Sistemas e Informática.*
