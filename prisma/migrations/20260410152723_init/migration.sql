-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cuit" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_insumo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "categorias_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL DEFAULT 'unidad',
    "espesormm" DOUBLE PRECISION,
    "altoM" DOUBLE PRECISION,
    "anchoM" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precios_proveedor" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "fechaVigencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'vigente',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,

    CONSTRAINT "precios_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_precios" (
    "id" TEXT NOT NULL,
    "precioProveedorId" TEXT NOT NULL,
    "precioAnterior" DECIMAL(12,2) NOT NULL,
    "precioNuevo" DECIMAL(12,2) NOT NULL,
    "fechaCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "historial_precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_mueble" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "categorias_mueble_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "muebles" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "costoActual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "muebles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despiece_materiales" (
    "id" TEXT NOT NULL,
    "muebleId" TEXT NOT NULL,
    "insumoId" TEXT,
    "proveedorId" TEXT,
    "productoNombre" TEXT NOT NULL,
    "medidas" TEXT,
    "cantidad" DECIMAL(10,4) NOT NULL,
    "costoUnitario" DECIMAL(12,2) NOT NULL,
    "costoTotal" DECIMAL(12,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "despiece_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despiece_insumos" (
    "id" TEXT NOT NULL,
    "muebleId" TEXT NOT NULL,
    "insumoId" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(10,4) NOT NULL,
    "costoUnitario" DECIMAL(12,2) NOT NULL,
    "costoTotal" DECIMAL(12,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "despiece_insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versiones_despiece" (
    "id" TEXT NOT NULL,
    "muebleId" TEXT NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "motivo" TEXT,
    "snapshotMateriales" JSONB NOT NULL,
    "snapshotInsumos" JSONB NOT NULL,

    CONSTRAINT "versiones_despiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombreUsuario" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'operador',
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_global" (
    "id" TEXT NOT NULL DEFAULT '1',
    "factorDesperdicio" DOUBLE PRECISION NOT NULL DEFAULT 1.10,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "vigenciaPrecioDias" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "configuracion_global_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "datosAnteriores" JSONB,
    "datosNuevos" JSONB,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_insumo_nombre_key" ON "categorias_insumo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "insumos_codigo_key" ON "insumos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "precios_proveedor_proveedorId_insumoId_key" ON "precios_proveedor"("proveedorId", "insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_mueble_nombre_key" ON "categorias_mueble"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "muebles_codigo_key" ON "muebles"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nombreUsuario_key" ON "usuarios"("nombreUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_proveedor" ADD CONSTRAINT "precios_proveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_proveedor" ADD CONSTRAINT "precios_proveedor_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_precios" ADD CONSTRAINT "historial_precios_precioProveedorId_fkey" FOREIGN KEY ("precioProveedorId") REFERENCES "precios_proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muebles" ADD CONSTRAINT "muebles_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_mueble"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despiece_materiales" ADD CONSTRAINT "despiece_materiales_muebleId_fkey" FOREIGN KEY ("muebleId") REFERENCES "muebles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despiece_materiales" ADD CONSTRAINT "despiece_materiales_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despiece_insumos" ADD CONSTRAINT "despiece_insumos_muebleId_fkey" FOREIGN KEY ("muebleId") REFERENCES "muebles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despiece_insumos" ADD CONSTRAINT "despiece_insumos_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versiones_despiece" ADD CONSTRAINT "versiones_despiece_muebleId_fkey" FOREIGN KEY ("muebleId") REFERENCES "muebles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
