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
| RNFS-002 | Rate limiting en endpoints de autenticación: máx. 5 intentos fallidos por IP en 15 min con bloqueo temporal. | CRÍTICA | ✅ Completado | `src/lib/rate-limit.ts`: contador en memoria por IP con ventana deslizante de 15 min (máx. 5 intentos fallidos), suficiente porque la app corre como una única instancia systemd. `src/lib/auth.ts`: `authorize(credentials, request)` obtiene la IP desde `x-forwarded-for` (Next.js standalone la completa automáticamente con `req.socket.remoteAddress` si no viene seteada por un proxy). Si la IP está bloqueada, lanza `TooManyAttemptsError` (subclase de `CredentialsSignin` con `code: "too-many-attempts"`) antes de validar credenciales — el bloqueo aplica incluso con credenciales correctas. Cada intento fallido (input inválido, usuario inexistente/inactivo, password incorrecta) suma al contador; un login exitoso lo limpia. `src/app/login/page.tsx` muestra un mensaje específico para ese código. Verificado en producción: build limpio, 57 tests OK, deploy OK; 6 intentos fallidos consecutivos desde la misma IP devuelven `error=CredentialsSignin&code=too-many-attempts` a partir del 6º, y un intento posterior con credenciales correctas también es bloqueado mientras dure la ventana. |
| RNFS-003 | Security headers HTTP en `next.config.ts`: CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, HSTS (cuando haya HTTPS). | ALTA | ✅ Completado | `next.config.ts`: headers globales vía `headers()`. CSP permisiva (`unsafe-inline`/`unsafe-eval`, requerido por Next.js sin nonces). HSTS declarado para cuando RNFS-004 esté activo. |
| RNFS-004 | HTTPS con certificado SSL: contenedor `nginx-proxy` con Certbot o certificado autofirmado para red interna. | ALTA | ✅ Completado | Se eligió la alternativa "certificado autofirmado para red interna" (no hay dominio público ni port-forwarding en la red `192.168.100.x`). Nuevo `scripts/setup-nginx-selfsigned.sh`: instala nginx directamente en el contenedor de la app (`.191`, no se crea un contenedor `nginx-proxy` dedicado), genera un certificado autofirmado (10 años, CN/SAN `192.168.100.191`) y configura un vhost que redirige `:80 → :443` y hace `proxy_pass` a `127.0.0.1:3000` con `X-Forwarded-*`. `scripts/service/launion.service` ahora bindea `HOSTNAME=127.0.0.1` (puerto 3000 deja de estar expuesto en la LAN, sin depender del firewall de RNFS-001). `NEXTAUTH_URL` actualizado a `https://192.168.100.191`. Los headers de seguridad (incl. `Strict-Transport-Security` de RNFS-003) llegan sin cambios vía proxy. La arquitectura documentada en `README.md`/`setup-proxy.sh` (contenedor `nginx-proxy` + Certbot + No-IP DDNS) queda como opción futura si se expone un dominio público. Los navegadores muestran advertencia de certificado no confiable (esperado; hay que aceptar la excepción una vez). Verificado en producción: `nginx -t` OK, `curl -Ik http://192.168.100.191` → 301 a https, `curl -Ik https://192.168.100.191` → 200 con todos los security headers, `curl http://192.168.100.191:3000` ya no responde, `/login` 200 OK, `journalctl` de `launion` y `nginx` sin errores. |
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
| RNFP-003 | Paginación (`?page=N&pageSize=M`) en `/api/insumos`, `/api/muebles`, `/api/proveedores`, `/api/log-auditoria`. | ALTA | ✅ Completado | `/api/muebles` y `/api/auditoria` (el endpoint real de log de auditoría) ya tenían paginación completa (`page`/`pageSize`, `skip`/`take`, `count`). Se agregó el mismo patrón a `/api/insumos` y `/api/proveedores`: ambos ahora aceptan `?page=N&pageSize=M` y devuelven `{insumos, total}` / `{proveedores, total}` en lugar de un array plano. Se actualizó `AutocompletarInsumo.tsx` (único consumidor del GET de `/api/insumos`) para leer `data.insumos`. Verificado en producción: `tsc`/`eslint`/`npm test` (57/57) limpios, build y deploy OK, `GET /api/insumos?pageSize=3` y `GET /api/proveedores?pageSize=3` devuelven la nueva forma con `total` correcto, y `?buscar=Moldura&estado=activo` (usado por el autocompletado) sigue funcionando. |
| RNFP-004 | Cache de sesión en middleware (proxy.ts) para reducir llamadas de `auth()` a la BD. | MEDIA | ✅ Completado | `src/lib/session-cache.ts`: cache en memoria de la sesión decodificada por `auth()`, indexado por el header `Cookie` completo (idéntico entre requests del mismo navegador/sesión), con TTL de 10s y límite de 500 entradas (se vacía si se supera). `proxy.ts` corre en todas las requests que matchea — incluidas las múltiples llamadas paralelas a `/api/*` que dispara una sola carga de página — y ahora usa `getCachedSession(request)` en lugar de `auth()` directo, evitando decodificar/verificar el JWT repetidamente para ese conjunto de requests casi simultáneas. El cache se invalida solo por TTL o porque el `Cookie` cambia (login/logout cambian el valor de la cookie de sesión). Verificado: build limpio, 57 tests OK, deploy OK; flujo completo probado en producción (`/` sin cookie → 307 a `/login`, login OK, `/` y `/insumos` con cookie → 200, `/api/insumos` responde correctamente). |

## Funcionales — Multi-tenant (RFF)

| ID | Descripción | Prioridad | Estado | Notas |
|----|-------------|-----------|--------|-------|
| RFF-001 | **Crítico.** Aislamiento de datos por empresa: agregar `empresaId` a insumos, muebles, proveedores, categorias_insumo, categorias_mueble, unidades_medida, configuracion_global, materiales_residuales. Filtrar todos los GET/POST/PATCH/DELETE por la empresa del usuario autenticado. | CRÍTICA | ✅ Completado | Migración `20260612000000_empresa_data_isolation` (hand-written): crea la empresa por defecto "La Union" (UUID fijo `bdbadb48-173b-45ff-a60d-ef8be6f335c4`) y migra TODOS los datos existentes (2 usuarios, 68 insumos, 3 muebles, 8 proveedores, 18 categorias_insumo, 11 categorias_mueble, 9 unidades_medida, 2 materiales_residuales, 1 configuracion_global) a esa empresa. Agrega `empresaId` a las 8 tablas de negocio + `log_auditoria` (nullable), con FK `ON DELETE RESTRICT` (negocio) / `SET NULL` (configuracion_global, log_auditoria), e índices únicos compuestos `(empresaId, nombre)` / `(empresaId, codigo)` reemplazando los simples. Nuevo helper `src/lib/empresa.ts` (`requireEmpresa()` para API routes, `requireEmpresaPage()` para Server Components). Las ~22 rutas API y ~14 páginas server-component filtran por `empresaId` (o hacen `findFirst({id, empresaId})` + 404 para ownership en rutas de detalle). Se agregó auth (antes inexistente) a `POST /api/muebles/[id]/imagenes` y `DELETE .../imagenes/[imagenId]`. Se filtró `prisma.usuario.findMany` en `configuracion/usuarios` por `empresaId`. **Hallazgo adicional corregido**: `/api/lista-corte`, `/excel`, `/pdf` y `getListaCorte()` (`src/lib/lista-corte.ts`) no filtraban por empresa — cualquier usuario autenticado podía ver/exportar la lista de corte de TODOS los muebles de TODAS las empresas; ahora `getListaCorte(empresaId, filters?)` exige `mueble: { empresaId }`. `prisma/seed.ts` actualizado (orden: empresa antes de configuracionGlobal/categorías/insumos, todos los upserts usan `empresaId_nombre`/`empresaId_codigo`). Verificado local: `tsc`/`prisma generate` limpios, lint sin errores nuevos (4 errores/10 warnings preexistentes en archivos no tocados), 57/57 tests, build OK. Desplegado en producción: migración aplicada (12→13 migraciones), build y restart OK, `journalctl` sin errores. Verificado en prod: 1 empresa "La Union", 2 usuarios con `empresaId` correcto, los 8 conteos de tablas intactos y con `empresaId` poblado, índices únicos compuestos creados (`insumos_empresaId_codigo_key`, `categorias_insumo_empresaId_nombre_key`, etc.) e índices `empresaId_idx` presentes. Login + smoke test de 11 páginas/endpoints (dashboard, insumos, muebles, proveedores, precios, categorias, unidades-medida, residuales, reportes, auditoria, lista-corte, despiece) → todos 200 con `empresaId` correcto en las respuestas. |
| RFF-002 | Migrar `ConfiguracionGlobal` de singleton (id="1") a configuración por empresa (factor_desperdicio, moneda, vigencia_precios). | CRÍTICA | ✅ Completado | `ConfiguracionGlobal` deja de ser singleton: `empresaId` pasa de `String? @unique` a `String @unique` (1:1 obligatorio con `Empresa`), `id` cambia de `@default("1")` a `@default(uuid())` (sin migración SQL — el default `uuid()` de Prisma para `String` en PostgreSQL se genera client-side en el INSERT, no como `DEFAULT` de columna; la DB conserva el `Default: '1'::text` preexistente en `id`, inocuo), y el FK pasa de `ON DELETE SET NULL` a `ON DELETE CASCADE` (la config es un detalle de la empresa, no tiene sentido sin ella). Migración `20260612010000_configuracion_global_por_empresa`: `ALTER COLUMN "empresaId" SET NOT NULL` + recrear el FK con `ON DELETE CASCADE` (el índice único `configuracion_global_empresaId_key` ya existía desde RFF-001). Los 11 sitios de lectura/escritura en 10 archivos (`/api/configuracion` reescrito con `requireEmpresa()` + `upsert({ where: { empresaId } })`, `configuracion/page.tsx`, dashboard, `insumos/[id]`, `muebles/[id]`, `proveedores/[id]`, `precios/page.tsx`, `/api/precios`, `/api/insumos/[id]`, `/api/materiales-residuales/[id]/comparacion`) pasan de `findUnique({ where: { id: "1" } })` a `findUnique`/`upsert({ where: { empresaId } })`, reutilizando el `empresaId` ya disponible desde `requireEmpresa()`/`requireEmpresaPage()` (RFF-001). `prisma/seed.ts` actualizado al mismo patrón. No se modificó `/api/superadmin/empresas` (POST): la config de una empresa nueva se crea de forma perezosa en su primer acceso vía `upsert`. Verificado local: `prisma generate`/`tsc`/lint (mismos 14 issues preexistentes)/`npm test` (57/57)/`build` OK. Desplegado (commit `16d3b3f`, migración 13/13 aplicada, build y restart OK). Verificado en producción: fila de `configuracion_global` preservada (`vigenciaPrecioDias=60`, valor previamente configurado por un usuario, intacto tras la migración), `empresaId` NOT NULL sin default, índice único e índice FK `ON DELETE CASCADE` correctos; login + `GET`/`PATCH /api/configuracion` (`{"id":"1","empresaId":"bdbadb48-...","factorDesperdicio":1.1,"moneda":"ARS","vigenciaPrecioDias":60}`) + 6 páginas (dashboard, configuración, precios, detalle de insumo/mueble/proveedor) → 200; `journalctl` sin errores. |
| RFF-003 | Endpoints `/api/superadmin/empresas/[id]/*` operan en el contexto de la empresa especificada, no en el global. | ALTA | ✅ Completado | Los endpoints ya operaban correctamente sobre los datos de la empresa especificada por `[id]`; el gap real estaba en la **auditoría**: 4 de los 5 `registrarLog()` disparados por `/api/superadmin/empresas/[id]/*` (PATCH/DELETE de empresa → `EMPRESA_MODIFICADA`/`EMPRESA_DESACTIVADA`, y PATCH/POST de `.../admin` → `ADMIN_EMPRESA_MODIFICADO`/`CREDENCIALES_REENVIADAS`) no pasaban `empresaId`, quedando con `empresaId: null` ("contexto global"). Como `GET /api/auditoria` filtra por `empresaId` para usuarios `administrador` (desde RFF-001), esas acciones de superadmin sobre una empresa nunca aparecían en el log de auditoría del administrador de esa empresa. Fix: se agregó `empresaId: id` (el id de la ruta `[id]`) a los 4 `registrarLog()`, replicando el patrón ya usado en `EMPRESA_CREADA` (`/api/superadmin/empresas` POST). Sin cambios de schema/migración (`LogAuditoria.empresaId` ya era nullable desde RFF-001). Verificado local: `tsc`/lint (mismos 14 issues preexistentes)/`npm test` (57/57)/`build` OK. Desplegado (commit `d270e7f`). Verificado en producción: se promovió `joaquin.nes@gmail.com` a `rol=superadmin` (mantiene su `empresaId` de "La Union", sigue operando como usuario de negocio normal), se editó el dominio de "La Union" desde `/superadmin`, y el `log_auditoria` resultante (`EMPRESA_MODIFICADA`) quedó con `empresaId = bdbadb48-...` (antes hubiera quedado `NULL`). `journalctl` sin errores. |

## Operacionales (RFO)

| ID | Descripción | Prioridad | Estado | Notas |
|----|-------------|-----------|--------|-------|
| RFO-001 | Envolver `POST /api/importar` en una única `prisma.$transaction` global (evita datos inconsistentes ante fallos parciales). | ALTA | ✅ Completado | `src/app/api/importar/route.ts`: las 9 secciones (categorías, proveedores, insumos, precios, muebles, despiece x3 formatos, residuales, recálculo de costoActual) corren dentro de un único `prisma.$transaction(async (tx) => {...}, { maxWait: 10000, timeout: 120000 })`. `timeout` elevado a 120s por la cantidad de queries secuenciales. Verificado: build limpio, 57 tests OK, `/api/importar` (preview) parsea correctamente la plantilla real descargada vía `/api/importar/plantilla`. |
| RFO-002 | Crear `.env.test` con valores mock para que vitest corra sin EACCES sobre el `.env` de producción. | MEDIA | ✅ Completado | `env-test/.env.test` + `vitest.config.ts` con `envDir` apuntando ahí (evita que vite intente leer el `.env` 600 de `launion`). Verificado: `npm test` corre sin EACCES como usuario `joaquin`. |
| RFO-003 | Implementar `GET /api/health` con estado de la BD, versión de la app y uptime. | MEDIA | ✅ Completado | `src/app/api/health/route.ts` (`SELECT 1`, version desde package.json, uptime). Excluido de auth en `proxy.ts`. |

---

## Recomendación general

RFF-001, RFF-002 y RFF-003 están completos: el sistema queda con aislamiento
de datos por empresa, configuración (`factorDesperdicio`, `moneda`,
`vigenciaPrecioDias`) por empresa, y las acciones de superadmin sobre una
empresa quedan correctamente auditadas en el contexto de esa empresa. El
sistema está listo para incorporar nuevas empresas reales (la creación de la
config por defecto es perezosa, al primer acceso de cada empresa). No queda
ningún requerimiento funcional (RFF) crítico/alto pendiente. RNFS-004 (HTTPS)
también está completo, vía nginx + certificado autofirmado en `.191`. Queda
pendiente RNFS-005 (Fail2ban), y diferidos al final RNFS-001 (firewall) y
RNFB-001/002/003 (backups), que pueden implementarse de forma incremental sin
interrumpir el servicio.

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
- **2026-06-11**: Completado RNFP-003 (paginación). `/api/muebles` y
  `/api/auditoria` ya estaban paginados; se agregó el mismo patrón a
  `/api/insumos` y `/api/proveedores` (`{insumos, total}` /
  `{proveedores, total}`), actualizando `AutocompletarInsumo.tsx`.
- **2026-06-12**: Completado RNFS-002 (rate limiting de login). Nuevo
  `src/lib/rate-limit.ts` (contador en memoria por IP, ventana de 15 min,
  máx. 5 intentos); `authorize()` en `src/lib/auth.ts` lo consulta usando la
  IP de `x-forwarded-for`. Verificado en producción con 6+ intentos fallidos
  consecutivos.
- **2026-06-12**: Completado RNFP-004 (cache de sesión en `proxy.ts`). Nuevo
  `src/lib/session-cache.ts` (cache en memoria de `auth()` por header
  `Cookie`, TTL 10s, máx. 500 entradas). Verificado en producción: flujo de
  login/redirects/páginas autenticadas funciona igual que antes.
- **2026-06-12**: Completado RFF-001 (aislamiento multi-tenant por
  `empresaId`). Migración `20260612000000_empresa_data_isolation` crea la
  empresa "La Union" (UUID fijo) y migra todos los datos existentes. Nuevo
  helper `src/lib/empresa.ts`. ~22 rutas API + ~14 páginas server-component
  filtran por `empresaId`. Corregido hallazgo de fuga cross-tenant en
  `/api/lista-corte/*`. `prisma/seed.ts` actualizado. Desplegado y verificado
  en producción (54 archivos, 630/-247 líneas). Próxima tarea: RFF-002
  (`ConfiguracionGlobal` por empresa).
- **2026-06-12**: Completado RFF-002 (`ConfiguracionGlobal` por empresa).
  Migración `20260612010000_configuracion_global_por_empresa`: `empresaId`
  pasa a `NOT NULL @unique` (1:1 con `Empresa`), FK `ON DELETE SET NULL` →
  `CASCADE`, `id` pasa de `@default("1")` a `@default(uuid())`. 11 sitios de
  lectura/escritura en 10 archivos migrados de `where: { id: "1" }` a
  `where: { empresaId }` (incl. `/api/configuracion` reescrito con
  `requireEmpresa()` + `upsert`). `prisma/seed.ts` actualizado. Desplegado y
  verificado en producción (commit `16d3b3f`, 13/13 migraciones, valor previo
  `vigenciaPrecioDias=60` preservado). Próxima tarea: RFF-003 (endpoints
  superadmin por contexto de empresa).
- **2026-06-12**: Completado RFF-003 (auditoría de acciones de superadmin con
  `empresaId`). `PATCH`/`DELETE /api/superadmin/empresas/[id]` y
  `PATCH`/`POST .../admin` ahora pasan `empresaId: id` a `registrarLog()`
  (antes quedaban con `empresaId: null`, invisibles en el
  `/api/auditoria` del administrador de esa empresa). Sin cambios de schema.
  Desplegado (commit `d270e7f`) y verificado en producción: edición de
  dominio de "La Union" desde `/superadmin` generó un `EMPRESA_MODIFICADA`
  con `empresaId` poblado. Con esto no queda ningún RFF crítico/alto
  pendiente.
- **2026-06-13**: Completado RNFS-004 (HTTPS). Nuevo
  `scripts/setup-nginx-selfsigned.sh`: nginx en el contenedor `.191` con
  certificado autofirmado (CN/SAN `192.168.100.191`), vhost `:80 → :443` y
  `proxy_pass` a `127.0.0.1:3000`. `scripts/service/launion.service` bindea
  `HOSTNAME=127.0.0.1`; `NEXTAUTH_URL` actualizado a `https://`. Se eligió la
  alternativa "certificado autofirmado para red interna" del propio
  requerimiento, sin crear el contenedor `nginx-proxy` dedicado descrito en
  `README.md` (queda como opción futura si se expone un dominio público).
  Commit `3ff2d17`. Verificado en producción: redirect HTTP→HTTPS, headers de
  seguridad presentes vía proxy, puerto 3000 ya no accesible desde la LAN,
  `/login` 200, logs sin errores.
