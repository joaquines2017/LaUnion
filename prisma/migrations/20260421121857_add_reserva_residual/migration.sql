-- CreateTable
CREATE TABLE "reservas_residual" (
    "id" TEXT NOT NULL,
    "materialResidualId" TEXT NOT NULL,
    "despieceMaterialId" TEXT NOT NULL,
    "muebleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_residual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservas_residual_despieceMaterialId_key" ON "reservas_residual"("despieceMaterialId");

-- AddForeignKey
ALTER TABLE "reservas_residual" ADD CONSTRAINT "reservas_residual_materialResidualId_fkey" FOREIGN KEY ("materialResidualId") REFERENCES "materiales_residuales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_residual" ADD CONSTRAINT "reservas_residual_despieceMaterialId_fkey" FOREIGN KEY ("despieceMaterialId") REFERENCES "despiece_materiales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_residual" ADD CONSTRAINT "reservas_residual_muebleId_fkey" FOREIGN KEY ("muebleId") REFERENCES "muebles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
