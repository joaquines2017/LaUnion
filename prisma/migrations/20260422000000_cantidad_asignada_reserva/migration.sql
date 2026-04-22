-- Agregar cantidadAsignada con default 1
ALTER TABLE "reservas_residual" ADD COLUMN "cantidadAsignada" INTEGER NOT NULL DEFAULT 1;

-- Poblar con la cantidad real del DespieceMaterial para filas existentes
UPDATE "reservas_residual" rr
SET "cantidadAsignada" = FLOOR(dm.cantidad)::INTEGER
FROM "despiece_materiales" dm
WHERE rr."despieceMaterialId" = dm.id
  AND FLOOR(dm.cantidad)::INTEGER > 0;

-- Eliminar el unique constraint anterior sobre solo despieceMaterialId
DROP INDEX IF EXISTS "reservas_residual_despieceMaterialId_key";

-- Crear el nuevo unique compuesto (materialResidualId, despieceMaterialId)
CREATE UNIQUE INDEX "reservas_residual_materialResidualId_despieceMaterialId_key"
  ON "reservas_residual"("materialResidualId", "despieceMaterialId");
