-- Redesign reservas_residual: assignment is at mueble level, not despiece_material level.
-- Drop and recreate the table to clear inconsistent data.

DROP TABLE IF EXISTS "reservas_residual";

CREATE TABLE "reservas_residual" (
    "id"                 TEXT NOT NULL,
    "materialResidualId" TEXT NOT NULL,
    "muebleId"           TEXT NOT NULL,
    "cantidadAsignada"   INTEGER NOT NULL DEFAULT 1,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_residual_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reservas_residual_materialResidualId_muebleId_key"
    ON "reservas_residual"("materialResidualId", "muebleId");

ALTER TABLE "reservas_residual"
    ADD CONSTRAINT "reservas_residual_materialResidualId_fkey"
    FOREIGN KEY ("materialResidualId") REFERENCES "materiales_residuales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservas_residual"
    ADD CONSTRAINT "reservas_residual_muebleId_fkey"
    FOREIGN KEY ("muebleId") REFERENCES "muebles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
