# Manual de Usuario — Recepción / Secretaría

**Centro Médico Patagonia — Sistema de Gestión Integral**
*Área de Sistemas e Informática*

---

## Introducción

Este manual está orientado al personal de **Recepción y Secretaría** (rol `secretaria`). Describe las operaciones cotidianas que realizará en el sistema: registro de pacientes, gestión de la agenda, cobros y manejo de comprobantes.

---

## 1. Ingreso al Sistema

1. Abrir el navegador web (preferentemente Chrome o Edge) y dirigirse a la URL de producción.
2. Ingresar **Email** y **Contraseña** provistos por el Administrador del sistema.
3. Hacer clic en **"Ingresar"**.

> Si olvidó su contraseña, comuníquese con el Administrador para que la restablezca desde **Configuración → Usuarios**.

---

## 2. Dashboard — Vista General del Día

Al ingresar, verá el **Dashboard** que muestra:

| Tarjeta | Qué indica |
|---------|-----------|
| **Turnos hoy** | Total de turnos activos del día seleccionado |
| **Confirmados** | Turnos que el paciente confirmó asistencia |
| **Pendientes** | Turnos reservados que aún no confirmaron |
| **Ausentes** | Pacientes que no se presentaron |
| **Cancelados** | Cancelaciones del día (bot + panel) |
| **Pac. nuevos (mes)** | Primeras consultas en el mes en curso |

**Cambiar la fecha del Dashboard:** Hay un selector de fecha al lado del título "Dashboard". Al cambiarlo, todas las estadísticas se actualizarán automáticamente.

---

## 3. Agenda — Gestión de Turnos del Día

### 3.1 Acceder a la Agenda

Hacer clic en **Agenda** en el menú lateral izquierdo.

### 3.2 Vistas Disponibles

| Vista | Descripción |
|-------|-------------|
| **Diaria** | Lista cronológica de todos los turnos del día. Recomendada para la operación diaria |
| **Semanal** | Grilla de 6 días (Lun–Sáb) con franjas horarias. Ideal para ver disponibilidad rápida |
| **Mensual** | Grilla por días del mes con todos los horarios configurados. Útil para planificación |

### 3.3 Navegar por Fechas

- Use los botones **← →** para ir al día anterior o siguiente.
- Use el **selector de fecha** para ir a un día específico.
- El botón **"Hoy"** vuelve a la fecha actual.

### 3.4 Filtrar por Profesional

Utilice el desplegable **"Profesional:"** en la barra de controles para ver solo los turnos de un médico en particular, o seleccione **"Todos"** para ver la agenda completa de la clínica.

### 3.5 Crear un Nuevo Turno Manualmente

**Desde la agenda (clic en un slot vacío):**
- En la vista **Semanal** o **Mensual**, hacer clic en cualquier celda vacía. El sistema abrirá el formulario de nuevo turno con la fecha y hora prellenadas.

**Desde el botón "Nuevo Turno":**
1. Hacer clic en el botón azul **"Nuevo Turno"** en la esquina superior derecha de la Agenda, o en el menú lateral.
2. Seguir el asistente de 4 pasos:

#### Paso 1 — Buscar Paciente
- Tipear nombre, DNI o teléfono en la barra de búsqueda.
- Hacer clic en el paciente encontrado para seleccionarlo.
- Si el paciente no existe, hacer clic en **"Registrar Nuevo Paciente"** y completar el formulario mínimo (nombre + DNI o teléfono).

#### Paso 2 — Profesional y Fecha
- Seleccionar el **profesional** del desplegable.
- Elegir la **fecha** del turno.
- Ingresar el **Servicio/Prestación** (ej: "Cardiología", "Control de presión").
- Ingresar el **Precio** si corresponde.

#### Paso 3 — Horario
Se presentan dos modos:

**Modo Automático (slots):** El sistema muestra los horarios disponibles del profesional según su configuración de agenda. Los slots en **blanco** están libres, los en **rojo** están ocupados.

**Modo Manual:** Hacer clic en el botón **"Ingresar manualmente"** para escribir cualquier hora libre. El sistema verificará en tiempo real si ese horario está disponible:
- ✅ **"Horario disponible"** → se puede continuar directamente.
- ⚠️ **"Horario ocupado"** → se habilita la opción de **"Forzar sobreturno"**. Tildar la casilla e ingresar el motivo obligatorio (ej: "Urgencia por dolor agudo").

> El modo manual se activa automáticamente cuando el profesional no tiene horarios configurados para el día seleccionado.

#### Paso 4 — Confirmar
Revisar el resumen del turno y hacer clic en **"Confirmar Turno"**. El turno aparecerá instantáneamente en la agenda.

---

### 3.6 Cambiar el Estado de un Turno

Al hacer clic sobre cualquier turno en la lista diaria o en los slots de la grilla, se abrirá el **panel de detalle del turno**.

Los estados disponibles son:

| Estado | Color | Cuándo usarlo |
|--------|-------|---------------|
| `Reservado` | Gris azulado | Estado inicial al crear el turno |
| `Confirmado` | Verde | El paciente confirmó que vendrá |
| `Asistido` | Verde oscuro | El paciente se presentó y fue atendido |
| `Ausente` | Rojo | El paciente no se presentó |
| `Cancelado` | Gris | El turno fue cancelado |

Para cambiar el estado: En el panel de detalle, hacer clic en el botón del nuevo estado deseado.

### 3.7 Reasignar Profesional

Dentro del panel de detalle del turno, hay un desplegable **"Profesional Asignado"**. Al cambiar la selección, el turno se reasigna inmediatamente.

### 3.8 Turnos con SOBRETURNO

Los turnos marcados como sobreturno se distinguen visualmente con:
- Un badge naranja **"ST"** junto al nombre del paciente.
- Borde izquierdo naranja en la vista de lista.

---

## 4. Gestión de Pacientes

### 4.1 Buscar un Paciente

1. Ir a **Pacientes** en el menú lateral.
2. Usar la barra de búsqueda: escribir nombre, apellido o DNI.
3. Hacer clic en el paciente para abrir su ficha completa.

### 4.2 Registrar un Nuevo Paciente

1. Hacer clic en el botón **"Nuevo Paciente"** en la sección Pacientes.
2. Completar los campos obligatorios: **Nombre**, **Apellido**, y al menos **DNI** o **Teléfono**.
3. Opcionalmente agregar: Email, Fecha de nacimiento, Cobertura médica, Número de afiliado, Domicilio.
4. Hacer clic en **"Guardar"**.

### 4.3 Editar Datos de un Paciente

1. Buscar y abrir la ficha del paciente.
2. Hacer clic en el ícono de **edición (lápiz)**.
3. Modificar los datos necesarios y hacer clic en **"Guardar cambios"**.

### 4.4 Asignar / Cambiar Cobertura Médica

Dentro de la ficha del paciente, en el campo **"Cobertura"** seleccionar la obra social del desplegable. Si la cobertura no aparece en la lista, solicitar al Administrador que la agregue desde **Configuración → Coberturas**.

---

## 5. Lista de Espera

### 5.1 ¿Qué es la Lista de Espera?

Cuando un paciente solicita un turno pero no hay disponibilidad inmediata, puede ser agregado a la lista de espera para ser contactado cuando se libere un slot.

### 5.2 Agregar a Lista de Espera

1. Ir a **Lista de Espera** en el menú lateral.
2. Hacer clic en **"Agregar"**.
3. Seleccionar paciente, especialidad/profesional preferido y prioridad.
4. Agregar notas si corresponde (ej: "Solo puede venir a la mañana").

### 5.3 Gestionar la Lista

- Cuando se cancele o libere un turno, revisar la lista de espera para contactar al siguiente paciente.
- Una vez que se le asignó un turno, cambiar su estado a **"Asignado"** para sacarlo de la lista activa.

---

## 6. Facturación

### 6.1 Registrar un Cobro

1. Ir a **Facturación** en el menú lateral.
2. Localizar el turno correspondiente.
3. Hacer clic en **"Registrar Pago"**.
4. Seleccionar el **método de pago**: Efectivo, Tarjeta, Transferencia u Obra Social.
5. Ingresar el **monto** cobrado.
6. Si es obra social: ingresar el **número de autorización**.
7. Hacer clic en **"Confirmar Pago"**.

### 6.2 Comprobantes de WhatsApp

El bot de WhatsApp puede solicitar al paciente que envíe el comprobante de transferencia. Cuando lo hace, el flag `comprobante_recibido` del turno se activa automáticamente, visible en el panel de detalle del turno.

---

## 7. Atajos y Tips Útiles

- **Clic en slot vacío** en la grilla semanal → Abre el formulario de nuevo turno con fecha y hora prellenadas.
- **Ctrl + clic** en el nombre de un paciente en la agenda → Abre su historia clínica en nueva pestaña (funcionalidad futura).
- Los turnos cancelados por el **bot** se marcan automáticamente en gris tachado gracias a la sincronización en tiempo real.
- Si la agenda no se actualiza, refrescar la página (F5).

---

*Centro Médico Patagonia — Área de Sistemas e Informática*
*Última actualización: Agosto 2026*
