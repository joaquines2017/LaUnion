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
    factorDesperdicio, id
  );

  return NextResponse.json(resultado);
}

const reservaSchema = z.object({
  despieceMaterialIds: z.array(z.string().uuid()).min(1),
});

// POST: crear reservas para este retazo
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

  // Obtener muebleId de cada despieceMaterial
  const materiales = await prisma.despieceMaterial.findMany({
    where: { id: { in: despieceMaterialIds } },
    select: { id: true, muebleId: true },
  });

  // Upsert: si ya existe reserva de este retazo en ese corte, no duplicar
  await prisma.$transaction(
    materiales.map((m) =>
      prisma.reservaResidual.upsert({
        where: { despieceMaterialId: m.id },
        create: { materialResidualId: id, despieceMaterialId: m.id, muebleId: m.muebleId },
        update: { materialResidualId: id },
      })
    )
  );

  return NextResponse.json({ ok: true, reservadas: despieceMaterialIds.length });
}

// DELETE: quitar reservas específicas de este retazo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = reservaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.reservaResidual.deleteMany({
    where: {
      materialResidualId: id,
      despieceMaterialId: { in: parsed.data.despieceMaterialIds },
    },
  });

  return NextResponse.json({ ok: true });
}
