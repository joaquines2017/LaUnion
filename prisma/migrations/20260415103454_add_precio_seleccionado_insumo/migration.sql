-- AlterTable
ALTER TABLE "insumos" ADD COLUMN     "precioSeleccionadoId" TEXT;

-- AddForeignKey
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_precioSeleccionadoId_fkey" FOREIGN KEY ("precioSeleccionadoId") REFERENCES "precios_proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
