-- CreateTable
CREATE TABLE "mueble_imagenes" (
    "id" TEXT NOT NULL,
    "muebleId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mueble_imagenes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mueble_imagenes" ADD CONSTRAINT "mueble_imagenes_muebleId_fkey" FOREIGN KEY ("muebleId") REFERENCES "muebles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
