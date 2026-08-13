# Manual de Usuario — Administrador

**Centro Médico Patagonia — Sistema de Gestión Integral**
*Área de Sistemas e Informática*

---

## Introducción

Este manual está destinado al **Administrador del sistema** (rol `admin`). El administrador tiene acceso irrestricto a todas las funciones del sistema, incluyendo configuración avanzada, gestión de usuarios, reportes y auditoría.

---

## 1. Panel de Configuración

Acceder desde **Configuración** en el menú lateral (solo visible para el rol `admin`).

### 1.1 Gestión de Profesionales

#### Alta de un Nuevo Profesional
1. Ir a **Configuración → Profesionales**.
2. Hacer clic en **"Agregar Profesional"**.
3. Completar los datos:
   - **Nombre y Apellido** (obligatorios)
   - **Especialidad** (seleccionar del listado o ingresar una nueva)
   - **Matrícula profesional**
   - **Modalidad**: Presencial / Virtual / Híbrida
   - **Duración del slot**: Tiempo en minutos por turno (15, 20, 30, 45, 60)
   - **Permite sobreturnos**: Activar si el profesional acepta que se fuercen sobreturnos
4. Guardar. El profesional estará disponible en toda la agenda.

#### Configurar Horarios de Atención (Agenda)
1. En la ficha del profesional, ir a la pestaña **"Agenda"**.
2. Hacer clic en **"Nueva Regla de Horario"**.
3. Configurar:
   - **Día de la semana** (Lunes a Domingo) o una **fecha específica** para excepciones.
   - **Hora de inicio** y **Hora de fin** del bloque de atención.
   - **Duración del slot** (puede diferir del default del profesional).
   - **Vigencia**: Desde/Hasta (útil para horarios estacionales o temporales).
4. Guardar. Los slots aparecerán en la agenda del formulario de Nuevo Turno.

#### Registrar un Bloqueo de Agenda
Los bloqueos anulan todos los slots de un periodo dado (vacaciones, congresos, licencias).
1. En la ficha del profesional → pestaña **"Agenda"** → **"Agregar Bloqueo"**.
2. Seleccionar **Fecha y hora de inicio** y **Fecha y hora de fin**.
3. Ingresar el **Motivo** (ej: "Vacaciones", "Congreso de Cardiología").
4. Guardar. Durante ese período, la función `get_slots_disponibles` devuelve sin resultados y el modo manual se activa automáticamente.

#### Dar de Baja a un Profesional
En la ficha del profesional, desactivar el toggle **"Activo"**. El profesional no se elimina (se conservan sus turnos históricos), pero deja de aparecer en el formulario de nuevos turnos.

---

### 1.2 Gestión de Especialidades

1. Ir a **Configuración → Especialidades**.
2. Las especialidades son usadas para categorizar profesionales y para la lista de espera.
3. Hacer clic en **"Nueva Especialidad"**, ingresar el nombre y guardar.
4. Para desactivar una especialidad sin borrarla, usar el toggle **"Activa"**.

**Especialidades iniciales sugeridas:**
- Clínica General / Medicina General
- Cardiología
- Pediatría
- Ginecología
- Traumatología
- Kinesiología
- Psicología
- Nutrición
- Odontología

---

### 1.3 Gestión de Coberturas Médicas

1. Ir a **Configuración → Coberturas**.
2. Hacer clic en **"Nueva Cobertura"**.
3. Ingresar el **Nombre** (ej: "PAMI") y el **Código** (ej: "001").
4. Guardar.

Para desactivar una cobertura (que ya no opera con la clínica), usar el toggle **"Activa"**. Los pacientes que ya la tenían asignada mantienen el dato histórico.

---

### 1.4 Gestión de Usuarios del Sistema

> ⚠️ Esta es una tarea sensible. Los cambios de rol tienen efecto inmediato.

#### Crear un Nuevo Usuario
1. Ir a **Configuración → Usuarios**.
2. Hacer clic en **"Nuevo Usuario"**.
3. Ingresar el **Email** del nuevo empleado.
4. Asignar el **Rol**: `admin`, `secretaria` o `profesional`.
5. Hacer clic en **"Enviar Invitación"**. El usuario recibirá un email para establecer su contraseña.

#### Cambiar el Rol de un Usuario
1. En la lista de usuarios, localizar al empleado.
2. Usar el desplegable de **Rol** para cambiar su nivel de acceso.
3. El cambio aplica en el próximo inicio de sesión del usuario.

#### Deshabilitar un Usuario
Cuando un empleado deja de trabajar en la clínica:
1. Localizar al usuario en la lista.
2. Hacer clic en **"Desactivar"**. El usuario no podrá iniciar sesión.

> Nunca eliminar usuarios que tengan turnos o auditorías asociadas; solo desactivarlos.

---

## 2. Importación Masiva de Datos

### 2.1 Importar Pacientes desde CSV

Permite incorporar bases de pacientes de sistemas anteriores.

**Formato requerido del CSV:**
```csv
dni,nombre,apellido,telefono,email,fecha_nacimiento
12345678,Juan,Pérez,2996123456,juan@email.com,1985-03-15
23456789,María,García,2996234567,,1990-07-22
```

**Pasos:**
1. Ir a **Configuración → Importación**.
2. Seleccionar **"Importar Pacientes"**.
3. Cargar el archivo CSV (máximo 5.000 filas por lote).
4. El sistema realizará una **validación previa**:
   - DNI duplicados → se omiten y se reportan.
   - Email duplicados → se omiten y se reportan.
   - Campos obligatorios faltantes → se omiten.
5. Confirmar la importación y descargar el **reporte de errores** si corresponde.

### 2.2 Importar Turnos desde CSV (Migración)

Para migrar una agenda histórica:

**Formato requerido:**
```csv
fecha_turno,hora,dni,nombre,servicios,precio,profesional_apellido
2026-08-15,09:00,12345678,Juan Pérez,Cardiología,5000,González
```

> El campo `profesional_apellido` debe coincidir exactamente con un profesional activo en el sistema.

---

## 3. Reportes y Estadísticas

Acceder desde **Reportes** en el menú lateral.

### 3.1 Reportes Disponibles

| Reporte | Descripción | Exportación |
|---------|-------------|-------------|
| **Turnos por período** | Total de turnos, estados, sobreturnos | CSV / PDF |
| **Ausentismo** | Tasa de ausentes y cancelaciones por profesional | CSV |
| **Ingresos** | Facturación total, por método de pago, por cobertura | CSV / PDF |
| **Pacientes nuevos** | Altas por mes, por cobertura, por profesional | CSV |
| **Rendimiento por profesional** | Turnos atendidos vs. cancelados vs. ausentes | CSV |

### 3.2 Exportar un Reporte

1. Seleccionar el tipo de reporte.
2. Definir el **período** (Hoy / Esta semana / Este mes / Rango personalizado).
3. Opcionalmente filtrar por **Profesional** o **Cobertura**.
4. Hacer clic en **"Generar"**.
5. Descargar en el formato deseado.

---

## 4. Auditoría del Sistema

La tabla `audit_logs` registra automáticamente todas las operaciones sensibles (mediante triggers de PostgreSQL).

### 4.1 Qué se Registra

- Cancelaciones de turnos (quién, cuándo, desde qué canal).
- Cobros y modificaciones de pagos.
- Cambios de rol de usuarios.
- Modificaciones en la historia clínica.

### 4.2 Revisar Logs de Auditoría

1. Ir a **Configuración → Auditoría**.
2. Filtrar por **Tabla**, **Acción** (`INSERT`, `UPDATE`, `DELETE`) o **Usuario**.
3. Usar el filtro de **Fecha** para acotar el período.

**Revisiones recomendadas:**

| Frecuencia | Qué revisar |
|------------|-------------|
| Diaria | Cancelaciones inusuales o masivas |
| Semanal | Modificaciones en la tabla `pagos` |
| Mensual | Cambios de roles de usuarios |

---

## 5. Mantenimiento General

### 5.1 Verificar el Estado del Sistema

- **Supabase Dashboard** (`app.supabase.com`): Revisar el uso de base de datos, conexiones activas y logs de errores.
- **Estado de las funciones RPC**: Ejecutar `SELECT * FROM pg_proc WHERE proname LIKE 'crear_%' OR proname LIKE 'get_%'` en el SQL Editor para verificar que las funciones existan.

### 5.2 Restablecer Contraseña de un Usuario

1. Ir a **Configuración → Usuarios**.
2. Localizar al usuario y hacer clic en **"Resetear contraseña"**.
3. El usuario recibirá un email con un enlace para establecer una nueva contraseña (válido por 24 horas).

### 5.3 Agregar un Nuevo Turno de Emergencia

Para crear un turno de forma rápida sin pasar por el asistente de 4 pasos (futuro):
- Usar el botón **"Nuevo Turno"** en la Agenda.
- Activar el **"Modo Manual"** en el Paso 3 para ingresar cualquier horario.
- El sistema verificará en tiempo real si hay conflicto y ofrecerá forzar sobreturno de ser necesario.

---

*Centro Médico Patagonia — Área de Sistemas e Informática*
*Última actualización: Agosto 2026*
