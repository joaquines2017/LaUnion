-- RFF-001: Aislamiento de datos por empresa. Agrega empresaId a insumos,
-- muebles, proveedores, categorias_insumo, categorias_mueble,
-- unidades_medida, configuracion_global, materiales_residuales y
-- log_auditoria. Crea la empresa por defecto "La Union" y migra TODOS los
-- datos existentes (incluidos los 2 usuarios, hoy con empresaId NULL).

-- ── 1. Empresa por defecto ───────────────────────────────────────────────
INSERT INTO "empresas" ("id", "nombre", "estado", "createdAt")
VALUES ('bdbadb48-173b-45ff-a60d-ef8be6f335c4', 'La Union', 'activo', CURRENT_TIMESTAMP);

-- ── 2. usuarios existentes (ambos con empresaId NULL) ───────────────────────
UPDATE "usuarios"
SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4'
WHERE "empresaId" IS NULL;

-- ── 3. proveedores ───────────────────────────────────────────────────────────
ALTER TABLE "proveedores" ADD COLUMN "empresaId" TEXT;
UPDATE "proveedores" SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4';
ALTER TABLE "proveedores" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "proveedores_empresaId_idx" ON "proveedores"("empresaId");

-- ── 4. categorias_insumo ─────────────────────────────────────────────────────
ALTER TABLE "categorias_insumo" ADD COLUMN "empresaId" TEXT;
UPDATE "categorias_insumo" SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4';
ALTER TABLE "categorias_insumo" ALTER COLUMN "empresaId" SET NOT NULL;
DROP INDEX IF EXISTS "categorias_insumo_nombre_key";
ALTER TABLE "categorias_insumo" ADD CONSTRAINT "categorias_insumo_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "categorias_insumo_empresaId_idx" ON "categorias_insumo"("empresaId");
CREATE UNIQUE INDEX "categorias_insumo_empresaId_nombre_key" ON "categorias_insumo"("empresaId", "nombre");

-- ── 5. categorias_mueble ─────────────────────────────────────────────────────
ALTER TABLE "categorias_mueble" ADD COLUMN "empresaId" TEXT;
UPDATE "categorias_mueble" SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4';
ALTER TABLE "categorias_mueble" ALTER COLUMN "empresaId" SET NOT NULL;
DROP INDEX IF EXISTS "categorias_mueble_nombre_key";
ALTER TABLE "categorias_mueble" ADD CONSTRAINT "categorias_mueble_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "categorias_mueble_empresaId_idx" ON "categorias_mueble"("empresaId");
CREATE UNIQUE INDEX "categorias_mueble_empresaId_nombre_key" ON "categorias_mueble"("empresaId", "nombre");

-- ── 6. unidades_medida ───────────────────────────────────────────────────────
ALTER TABLE "unidades_medida" ADD COLUMN "empresaId" TEXT;
UPDATE "unidades_medida" SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4';
ALTER TABLE "unidades_medida" ALTER COLUMN "empresaId" SET NOT NULL;
DROP INDEX IF EXISTS "unidades_medida_nombre_key";
ALTER TABLE "unidades_medida" ADD CONSTRAINT "unidades_medida_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "unidades_medida_empresaId_idx" ON "unidades_medida"("empresaId");
CREATE UNIQUE INDEX "unidades_medida_empresaId_nombre_key" ON "unidades_medida"("empresaId", "nombre");

-- ── 7. insumos ───────────────────────────────────────────────────────────────
ALTER TABLE "insumos" ADD COLUMN "empresaId" TEXT;
UPDATE "insumos" SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4';
ALTER TABLE "insumos" ALTER COLUMN "empresaId" SET NOT NULL;
DROP INDEX IF EXISTS "insumos_codigo_key";
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "insumos_empresaId_idx" ON "insumos"("empresaId");
CREATE UNIQUE INDEX "insumos_empresaId_codigo_key" ON "insumos"("empresaId", "codigo");

-- ── 8. muebles ───────────────────────────────────────────────────────────────
ALTER TABLE "muebles" ADD COLUMN "empresaId" TEXT;
UPDATE "muebles" SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4';
ALTER TABLE "muebles" ALTER COLUMN "empresaId" SET NOT NULL;
DROP INDEX IF EXISTS "muebles_codigo_key";
ALTER TABLE "muebles" ADD CONSTRAINT "muebles_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "muebles_empresaId_idx" ON "muebles"("empresaId");
CREATE UNIQUE INDEX "muebles_empresaId_codigo_key" ON "muebles"("empresaId", "codigo");

-- ── 9. materiales_residuales ─────────────────────────────────────────────────
ALTER TABLE "materiales_residuales" ADD COLUMN "empresaId" TEXT;
UPDATE "materiales_residuales" SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4';
ALTER TABLE "materiales_residuales" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "materiales_residuales" ADD CONSTRAINT "materiales_residuales_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "materiales_residuales_empresaId_idx" ON "materiales_residuales"("empresaId");

-- ── 10. configuracion_global (nullable, reescritura completa en RFF-002) ────
ALTER TABLE "configuracion_global" ADD COLUMN "empresaId" TEXT;
UPDATE "configuracion_global" SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4' WHERE "id" = '1';
ALTER TABLE "configuracion_global" ADD CONSTRAINT "configuracion_global_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "configuracion_global_empresaId_key" ON "configuracion_global"("empresaId");

-- ── 11. log_auditoria (nullable — acciones de superadmin sin empresa) ──────
ALTER TABLE "log_auditoria" ADD COLUMN "empresaId" TEXT;
UPDATE "log_auditoria" SET "empresaId" = 'bdbadb48-173b-45ff-a60d-ef8be6f335c4';
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "log_auditoria_empresaId_idx" ON "log_auditoria"("empresaId");
