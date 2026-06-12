-- RFF-002: ConfiguracionGlobal pasa de singleton (id="1") a configuración
-- por empresa. empresaId pasa a ser obligatorio (1:1 con Empresa); el FK
-- pasa de ON DELETE SET NULL a ON DELETE CASCADE (la config es un detalle
-- de la empresa, no tiene sentido sin ella). El índice único
-- "configuracion_global_empresaId_key" ya existe desde RFF-001.

ALTER TABLE "configuracion_global" ALTER COLUMN "empresaId" SET NOT NULL;

ALTER TABLE "configuracion_global" DROP CONSTRAINT "configuracion_global_empresaId_fkey";
ALTER TABLE "configuracion_global" ADD CONSTRAINT "configuracion_global_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
