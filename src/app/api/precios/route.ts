import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { recalcularCascada } from "@/lib/recalculo-cascada";

const precioSchema = z.object({
  insumoId: z.string().uuid(),
  proveedorId: z.string().uuid(),
  precio: z.number().positive("El precio debe ser mayor a 0"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = precioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { insumoId, proveedorId, precio } = parsed.data;

  // Upsert: crear o actualizar precio vigente
  const precioExistente = await prisma.precioProveedor.findUnique({
    where: { proveedorId_insumoId: { proveedorId, insumoId } },
  });

  let result;
  if (precioExistente) {
    // Guardar histórico
    await prisma.historialPrecio.create({
      data: {
        precioProveedorId: precioExistente.id,
        precioAnterior: precioExistente.precio,
        precioNuevo: precio,
        usuarioId: (session.user as { id?: string }).id ?? "sistema",
      },
    });

    result = await prisma.precioProveedor.update({
      where: { id: precioExistente.id },
      data: { precio, fechaVigencia: new Date() },
    });
  } else {
    result = await prisma.precioProveedor.create({
      data: { insumoId, proveedorId, precio },
    });
  }

  // Recálculo en cascada: actualizar todos los muebles que usan este insumo
  const config = await prisma.configuracionGlobal.findUnique({ where: { id: "1" } });
  const factorDesperdicio = config?.factorDesperdicio ?? 1.1;

  const cascada = await recalcularCascada(insumoId, precio, factorDesperdicio);

  return NextResponse.json(
    { precio: result, cascada },
    { status: precioExistente ? 200 : 201 }
  );
}
