-- RNFP-001: Indices en columnas de clave foranea sin indice explicito.
-- Mejora el rendimiento de joins y filtros usados en recalcularCascada,
-- listados y reportes.

-- AlterTable: insumos
CREATE INDEX "insumos_categoriaId_idx" ON "insumos"("categoriaId");
CREATE INDEX "insumos_precioSeleccionadoId_idx" ON "insumos"("precioSeleccionadoId");

-- AlterTable: historial_precios
CREATE INDEX "historial_precios_precioProveedorId_idx" ON "historial_precios"("precioProveedorId");

-- AlterTable: muebles
CREATE INDEX "muebles_categoriaId_idx" ON "muebles"("categoriaId");

-- AlterTable: mueble_imagenes
CREATE INDEX "mueble_imagenes_muebleId_idx" ON "mueble_imagenes"("muebleId");

-- AlterTable: despiece_materiales
CREATE INDEX "despiece_materiales_muebleId_idx" ON "despiece_materiales"("muebleId");
CREATE INDEX "despiece_materiales_insumoId_idx" ON "despiece_materiales"("insumoId");

-- AlterTable: despiece_insumos
CREATE INDEX "despiece_insumos_muebleId_idx" ON "despiece_insumos"("muebleId");
CREATE INDEX "despiece_insumos_insumoId_idx" ON "despiece_insumos"("insumoId");

-- AlterTable: versiones_despiece
CREATE INDEX "versiones_despiece_muebleId_idx" ON "versiones_despiece"("muebleId");

-- AlterTable: materiales_residuales
CREATE INDEX "materiales_residuales_insumoId_idx" ON "materiales_residuales"("insumoId");

-- AlterTable: usuarios
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");
