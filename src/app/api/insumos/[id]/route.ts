import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { recalcularCascada } from "@/lib/recalculo-cascada";

const updateSchema = z.object({
  descripcion: z.string().min(1).optional(),
  categoriaId: z.string().uuid().optional(),
  unidadMedida: z.string().optional(),
  espesormm: z.number().positive().nullable().optional(),
  altoM: z.number().positive().nullable().optional(),
  anchoM: z.number().positive().nullable().optional(),
  precioBase: z.number().positive().nullable().optional(),
  estado: z.enum(["activo", "inactivo"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const insumo = await prisma.insumo.findUnique({
    where: { id },
    include: {
      categoria: true,
      precios: {
        include: { proveedor: { select: { id: true, nombre: true } } },
        orderBy: { precio: "asc" },
      },
    },
  });

  if (!insumo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(insumo);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    // Leer precioBase actual antes de actualizar (para detectar cambio)
    const actual = await prisma.insumo.findUnique({
      where: { id },
      select: { precioBase: true },
    });

    const insumo = await prisma.insumo.update({ where: { id }, data: parsed.data });

    // Si cambió el precioBase, recalcular costos en cascada
    const precioBaseAnterior = actual?.precioBase != null ? Number(actual.precioBase) : null;
    const precioBaseNuevo = parsed.data.precioBase !== undefined
      ? (parsed.data.precioBase != null ? Number(parsed.data.precioBase) : null)
      : precioBaseAnterior;

    let cascada = null;
    if (precioBaseNuevo != null && precioBaseNuevo !== precioBaseAnterior) {
      const config = await prisma.configuracionGlobal.findUnique({ where: { id: "1" } });
      const factorDesperdicio = config?.factorDesperdicio ?? 1.1;
      cascada = await recalcularCascada(id, precioBaseNuevo, Number(factorDesperdicio));
    }

    return NextResponse.json({ insumo, cascada });
  } catch (err) {
    console.error("Error al actualizar insumo:", err);
    return NextResponse.json({ error: "Error al guardar el insumo" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // No se puede dar de baja si está en despieces activos
  const enUso = await prisma.despieceMaterial.count({ where: { insumoId: id } });
  if (enUso > 0) {
    await prisma.insumo.update({ where: { id }, data: { estado: "inactivo" } });
    return NextResponse.json({ ok: true, marcadoInactivo: true });
  }

  await prisma.insumo.update({ where: { id }, data: { estado: "inactivo" } });
  return NextResponse.json({ ok: true });
}
