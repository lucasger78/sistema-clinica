# Documentación — Centro Médico Patagonia

**Sistema de Gestión Integral**

Esta carpeta contiene la documentación técnica y operativa del sistema. Todos los documentos están en formato Markdown y pueden visualizarse directamente en GitHub.

---

## Índice de Documentos

| # | Archivo | Audiencia | Descripción |
|---|---------|-----------|-------------|
| 1 | [arquitectura_y_seguridad.md](./arquitectura_y_seguridad.md) | Técnica | Topología SPA + BaaS, autenticación JWT, RBAC, políticas RLS y comunicación Realtime |
| 2 | [diccionario_datos_y_api.md](./diccionario_datos_y_api.md) | Técnica | Esquema completo de tablas SQL, tipos de datos, relaciones y procedimientos almacenados RPC |
| 3 | [manual_usuario_vendedor.md](./manual_usuario_vendedor.md) | Recepción / Secretaría | Operación diaria: agenda, nuevos turnos, búsqueda de pacientes, facturación y comprobantes |
| 4 | [manual_usuario_admin.md](./manual_usuario_admin.md) | Administrador | Configuración del sistema, gestión de usuarios, importaciones, reportes y auditoría |
| 5 | [operaciones_y_despliegue.md](./operaciones_y_despliegue.md) | DevOps / Sistemas | Comandos de build, variables de entorno, despliegue en Netlify/Vercel y mantenimiento de Postgres |

---

## Roles del Sistema

```
admin        → Acceso total (configuración, reportes, auditoría, usuarios)
secretaria   → Operativo (agenda, turnos, pacientes, facturación)
profesional  → Limitado (su agenda + historias clínicas)
```

---

*Centro Médico Patagonia — Área de Sistemas e Informática — Agosto 2026*
