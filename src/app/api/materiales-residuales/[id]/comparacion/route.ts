import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { compararResidual } from "@/lib/comparacion-residuales";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const residual = await prisma.materialResidual.findUnique({ where: { id } });
  if (!residual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const config = await prisma.configuracionGlobal.findUnique({ where: { id: "1" } });
  const factorDesperdicio = config?.factorDesperdicio ?? 1.1;

  const resultado = await compararResidual(
    residual.insumoId, residual.altoCm, residual.anchoCm,
    factorDesperdicio, id, residual.cantidad
  );

  return NextResponse.json(resultado);
}

// Acepta la lista COMPLETA de cortes deseados (semántica "set").
// Si despieceMaterialIds está vacío → elimina todas las reservas.
const reservaSchema = z.object({
  despieceMaterialIds: z.array(z.string().uuid()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const residual = await prisma.materialResidual.findUnique({ where: { id } });
  if (!residual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = reservaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { despieceMaterialIds } = parsed.data;

  // Si la lista está vacía, solo limpia
  if (despieceMaterialIds.length === 0) {
    await prisma.reservaResidual.deleteMany({ where: { materialResidualId: id } });
    return NextResponse.json({ ok: true, reservadas: 0 });
  }

  // Verificar que no estén ya reservados por OTRO retazo
  const conflictos = await prisma.reservaResidual.findMany({
    where: {
      despieceMaterialId: { in: despieceMaterialIds },
      materialResidualId: { not: id },
    },
    include: { despieceMaterial: { select: { productoNombre: true } } },
  });

  if (conflictos.length > 0) {
    const nombres = conflictos.map((c) => c.despieceMaterial.productoNombre).join(", ");
    return NextResponse.json(
      { error: `Los siguientes cortes ya están reservados en otro retazo: ${nombres}` },
      { status: 409 }
    );
  }

  // Obtener muebleId y cantidad de cada despieceMaterial
  const materiales = await prisma.despieceMaterial.findMany({
    where: { id: { in: despieceMaterialIds } },
    select: { id: true, muebleId: true, cantidad: true },
  });

  // Validar que la suma de cantidades no supere los retazos disponibles
  const totalPiezas = materiales.reduce((s, m) => s + Number(m.cantidad), 0);
  if (totalPiezas > residual.cantidad) {
    return NextResponse.json(
      {
        error: `La cantidad total de piezas a cortar (${totalPiezas}) supera los retazos disponibles (${residual.cantidad}). Reducí la selección o aumentá la cantidad del retazo.`,
      },
      { status: 400 }
    );
  }

  // Reemplazar atómicamente todas las reservas de este retazo
  await prisma.$transaction([
    prisma.reservaResidual.deleteMany({ where: { materialResidualId: id } }),
    ...materiales.map((m) =>
      prisma.reservaResidual.create({
        data: { materialResidualId: id, despieceMaterialId: m.id, muebleId: m.muebleId },
      })
    ),
  ]);

  return NextResponse.json({ ok: true, reservadas: materiales.length });
}

// DELETE: quitar todas las reservas de este retazo (o un subconjunto)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Si hay body con IDs, borra solo esos; si no hay body, borra todos
  let despieceMaterialIds: string[] | null = null;
  try {
    const body = await req.json();
    const parsed = z.object({ despieceMaterialIds: z.array(z.string().uuid()).min(1) }).safeParse(body);
    if (parsed.success) despieceMaterialIds = parsed.data.despieceMaterialIds;
  } catch { /* sin body */ }

  await prisma.reservaResidual.deleteMany({
    where: despieceMaterialIds
      ? { materialResidualId: id, despieceMaterialId: { in: despieceMaterialIds } }
      : { materialResidualId: id },
  });

  return NextResponse.json({ ok: true });
}
