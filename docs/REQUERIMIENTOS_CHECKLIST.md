# LaUnion — Checklist de Requerimientos (Plan de Mejoras)

Este documento hace seguimiento del plan de mejoras definido en el análisis de
arquitectura (`LaUnion_Analisis_y_Requerimientos.docx`). Cada vez que se
completa un requerimiento se actualiza su estado, se agrega una breve nota
técnica y, si corresponde, se referencia el commit/migración asociada.

**Convención de estados:** ⬜ Pendiente · 🟨 En progreso · ✅ Completado · ⏸️ Diferido

**Orden de implementación acordado (2026-06-10):** se difieren al final
RNFS-001 (firewall) y RNFB-001/002/003 (backups). El resto se implementa en
el orden de la tabla.

---

## Seguridad (RNFS)

| ID | Descripción | Prioridad | Estado | Notas |
|----|-------------|-----------|--------|-------|
| RNFS-001 | Implementar Firewall (UFW) en ambos servidores: SSH:2190 desde LAN, puerto 3000 desde red interna, bloquear el resto. | CRÍTICA | ⏸️ Diferido | Se resuelve al final del plan. |
| RNFS-002 | Rate limiting en endpoints de autenticación: máx. 5 intentos fallidos por IP en 15 min con bloqueo temporal. | CRÍTICA | ⬜ Pendiente | |
| RNFS-003 | Security headers HTTP en `next.config.ts`: CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, HSTS (cuando haya HTTPS). | ALTA | ⬜ Pendiente | |
| RNFS-004 | HTTPS con certificado SSL: contenedor `nginx-proxy` con Certbot o certificado autofirmado para red interna. | ALTA | ⬜ Pendiente | |
| RNFS-005 | Instalar y configurar Fail2ban en ambos servidores: banear IPs con +3 intentos fallidos SSH en 5 min. | ALTA | ⬜ Pendiente | |
| RNFS-006 | Aumentar mínimo de contraseña de 6 a 8 caracteres + al menos 1 número o carácter especial (auth.ts y schema de usuarios). | MEDIA | ⬜ Pendiente | |

## Backups (RNFB) — Diferido

| ID | Descripción | Prioridad | Estado | Notas |
|----|-------------|-----------|--------|-------|
| RNFB-001 | Backup automático diario de la BD: cron + `pg_dump` 2:00 AM, gzip, retención 30 días en `/var/backups/launion/`. | CRÍTICA | ⏸️ Diferido | |
| RNFB-002 | Documentar y probar el proceso de restauración (runbook). | ALTA | ⏸️ Diferido | |
| RNFB-003 | Backup de `public/uploads/muebles` (imágenes de muebles), no cubierto por el backup de BD. | MEDIA | ⏸️ Diferido | |

## Performance (RNFP)

| ID | Descripción | Prioridad | Estado | Notas |
|----|-------------|-----------|--------|-------|
| RNFP-001 | Migración Prisma: índices en FKs críticas (despiece_materiales, despiece_insumos, insumos.categoriaId, insumos.precioSeleccionadoId, muebles.categoriaId, usuarios.empresaId, historial_precios.precioProveedorId, mueble_imagenes.muebleId, materiales_residuales.insumoId, versiones_despiece.muebleId). | ALTA | ⬜ Pendiente | |
| RNFP-002 | Optimizar `recalcularCascada`: reemplazar el bucle de queries individuales por fetch masivo + `Promise.all` + agrupación en memoria. | ALTA | ⬜ Pendiente | |
| RNFP-003 | Paginación (`?page=N&pageSize=M`) en `/api/insumos`, `/api/muebles`, `/api/proveedores`, `/api/log-auditoria`. | ALTA | ⬜ Pendiente | |
| RNFP-004 | Cache de sesión en middleware (proxy.ts) para reducir llamadas de `auth()` a la BD. | MEDIA | ⬜ Pendiente | |

## Funcionales — Multi-tenant (RFF)

| ID | Descripción | Prioridad | Estado | Notas |
|----|-------------|-----------|--------|-------|
| RFF-001 | **Crítico.** Aislamiento de datos por empresa: agregar `empresaId` a insumos, muebles, proveedores, categorias_insumo, categorias_mueble, unidades_medida, configuracion_global, materiales_residuales. Filtrar todos los GET/POST/PATCH/DELETE por la empresa del usuario autenticado. | CRÍTICA | ⬜ Pendiente | |
| RFF-002 | Migrar `ConfiguracionGlobal` de singleton (id="1") a configuración por empresa (factor_desperdicio, moneda, vigencia_precios). | CRÍTICA | ⬜ Pendiente | Depende de RFF-001. |
| RFF-003 | Endpoints `/api/superadmin/empresas/[id]/*` operan en el contexto de la empresa especificada, no en el global. | ALTA | ⬜ Pendiente | Depende de RFF-001/002. |

## Operacionales (RFO)

| ID | Descripción | Prioridad | Estado | Notas |
|----|-------------|-----------|--------|-------|
| RFO-001 | Envolver `POST /api/importar` en una única `prisma.$transaction` global (evita datos inconsistentes ante fallos parciales). | ALTA | ⬜ Pendiente | |
| RFO-002 | Crear `.env.test` con valores mock para que vitest corra sin EACCES sobre el `.env` de producción. | MEDIA | ⬜ Pendiente | |
| RFO-003 | Implementar `GET /api/health` con estado de la BD, versión de la app y uptime. | MEDIA | ⬜ Pendiente | |

---

## Recomendación general

No incorporar empresas reales al sistema hasta completar RFF-001 y RFF-002
(único bloqueante funcional real). El resto de las mejoras pueden
implementarse de forma incremental sin interrumpir el servicio.

## Historial de cambios de este checklist

- **2026-06-10**: Creación del checklist. Inicio de la implementación
  (se difieren RNFS-001 y RNFB-001/002/003 al final).
