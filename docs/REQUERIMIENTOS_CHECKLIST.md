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
| RNFS-003 | Security headers HTTP en `next.config.ts`: CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, HSTS (cuando haya HTTPS). | ALTA | ✅ Completado | `next.config.ts`: headers globales vía `headers()`. CSP permisiva (`unsafe-inline`/`unsafe-eval`, requerido por Next.js sin nonces). HSTS declarado para cuando RNFS-004 esté activo. |
| RNFS-004 | HTTPS con certificado SSL: contenedor `nginx-proxy` con Certbot o certificado autofirmado para red interna. | ALTA | ⬜ Pendiente | |
| RNFS-005 | Instalar y configurar Fail2ban en ambos servidores: banear IPs con +3 intentos fallidos SSH en 5 min. | ALTA | ⬜ Pendiente | |
| RNFS-006 | Aumentar mínimo de contraseña de 6 a 8 caracteres + al menos 1 número o carácter especial (auth.ts y schema de usuarios). | MEDIA | ✅ Completado | `src/lib/password.ts`: nuevo `passwordSchema` (8+ caracteres, ≥1 número o símbolo) usado en alta/edición de usuarios y admin de empresa. El login (`auth.ts`) mantiene mínimo 6 a propósito para no bloquear cuentas existentes; la seguridad del login se refuerza con RNFS-002. |

## Backups (RNFB) — Diferido

| ID | Descripción | Prioridad | Estado | Notas |
|----|-------------|-----------|--------|-------|
| RNFB-001 | Backup automático diario de la BD: cron + `pg_dump` 2:00 AM, gzip, retención 30 días en `/var/backups/launion/`. | CRÍTICA | ⏸️ Diferido | |
| RNFB-002 | Documentar y probar el proceso de restauración (runbook). | ALTA | ⏸️ Diferido | |
| RNFB-003 | Backup de `public/uploads/muebles` (imágenes de muebles), no cubierto por el backup de BD. | MEDIA | ⏸️ Diferido | |

## Performance (RNFP)

| ID | Descripción | Prioridad | Estado | Notas |
|----|-------------|-----------|--------|-------|
| RNFP-001 | Migración Prisma: índices en FKs críticas (despiece_materiales, despiece_insumos, insumos.categoriaId, insumos.precioSeleccionadoId, muebles.categoriaId, usuarios.empresaId, historial_precios.precioProveedorId, mueble_imagenes.muebleId, materiales_residuales.insumoId, versiones_despiece.muebleId). | ALTA | ✅ Completado | Migración `20260610120000_add_fk_indexes` aplicada en producción (12 índices verificados con `pg_indexes`). |
| RNFP-002 | Optimizar `recalcularCascada`: reemplazar el bucle de queries individuales por fetch masivo + `Promise.all` + agrupación en memoria. | ALTA | ✅ Completado | `src/lib/recalculo-cascada.ts`: las actualizaciones de `despieceMaterial`/`despieceInsumo` ahora corren en paralelo con `Promise.all` (antes secuenciales en un `for...of`). El paso de recálculo de `costoActual` por mueble pasó de 3×N queries (findUnique + 2 findMany por mueble, dentro de un loop) a 3 queries totales (`findMany` con `id: { in: muebleIds }`) + agrupación en memoria con `Map`. Verificado en producción: se disparó el recálculo real vía `POST /api/precios` para un insumo usado en 3 muebles (18 líneas de despiece, incluye cálculo de placa), y `costoActual` resultante coincide exactamente con la suma de `costoTotal` de sus líneas (466962.94 = 28162.94 + 438800.00). |
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
| RFO-001 | Envolver `POST /api/importar` en una única `prisma.$transaction` global (evita datos inconsistentes ante fallos parciales). | ALTA | ✅ Completado | `src/app/api/importar/route.ts`: las 9 secciones (categorías, proveedores, insumos, precios, muebles, despiece x3 formatos, residuales, recálculo de costoActual) corren dentro de un único `prisma.$transaction(async (tx) => {...}, { maxWait: 10000, timeout: 120000 })`. `timeout` elevado a 120s por la cantidad de queries secuenciales. Verificado: build limpio, 57 tests OK, `/api/importar` (preview) parsea correctamente la plantilla real descargada vía `/api/importar/plantilla`. |
| RFO-002 | Crear `.env.test` con valores mock para que vitest corra sin EACCES sobre el `.env` de producción. | MEDIA | ✅ Completado | `env-test/.env.test` + `vitest.config.ts` con `envDir` apuntando ahí (evita que vite intente leer el `.env` 600 de `launion`). Verificado: `npm test` corre sin EACCES como usuario `joaquin`. |
| RFO-003 | Implementar `GET /api/health` con estado de la BD, versión de la app y uptime. | MEDIA | ✅ Completado | `src/app/api/health/route.ts` (`SELECT 1`, version desde package.json, uptime). Excluido de auth en `proxy.ts`. |

---

## Recomendación general

No incorporar empresas reales al sistema hasta completar RFF-001 y RFF-002
(único bloqueante funcional real). El resto de las mejoras pueden
implementarse de forma incremental sin interrumpir el servicio.

## Historial de cambios de este checklist

- **2026-06-10**: Creación del checklist. Inicio de la implementación
  (se difieren RNFS-001 y RNFB-001/002/003 al final).
- **2026-06-10**: Completados RFO-002, RNFP-001, RNFS-006, RFO-003, RNFS-003.
  53→57 tests OK. Migración de índices aplicada en producción.
- **2026-06-11**: Completado RNFP-002 (recalcularCascada sin N+1). Además se
  corrigió un bug preexistente en `scripts/deploy.sh` (el `cp -r` de
  `public`/`static` al directorio `standalone` corría como root y anidaba
  `public/public`, bloqueando el siguiente `npm run build` con EACCES); ahora
  corre como `$APP_USER` y limpia el destino antes de copiar.
- **2026-06-11**: Completado RFO-001 (transacción global en `/api/importar`).
