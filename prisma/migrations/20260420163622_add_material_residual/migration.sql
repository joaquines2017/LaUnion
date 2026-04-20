-- CreateTable
CREATE TABLE "materiales_residuales" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "altoCm" DOUBLE PRECISION NOT NULL,
    "anchoCm" DOUBLE PRECISION NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "nota" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiales_residuales_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "materiales_residuales" ADD CONSTRAINT "materiales_residuales_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
