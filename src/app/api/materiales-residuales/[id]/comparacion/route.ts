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
// Ajusta MaterialResidual.cantidad restando o reponiendo piezas según el cambio neto.
const reservaSchema = z.object({
  despieceMaterialIds: z.array(z.string().uuid()),
});

// Suma las cantidades de DespieceMaterial para un conjunto de reservas existentes
async function prevTotalReservado(materialResidualId: string): Promise<number> {
  const reservas = await prisma.reservaResidual.findMany({
    where: { materialResidualId },
    include: { despieceMaterial: { select: { cantidad: true } } },
  });
  return reservas.reduce((s, r) => s + Number(r.despieceMaterial.cantidad), 0);
}

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

  // Cuántas piezas tenía reservadas este retazo antes del cambio
  const prevTotal = await prevTotalReservado(id);

  // Caso: lista vacía → liberar todo y restituir cantidad
  if (despieceMaterialIds.length === 0) {
    await prisma.$transaction([
      prisma.reservaResidual.deleteMany({ where: { materialResidualId: id } }),
      prisma.materialResidual.update({
        where: { id },
        data: { cantidad: { increment: prevTotal } },
      }),
    ]);
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

  // Obtener muebleId y cantidad de cada corte seleccionado
  const materiales = await prisma.despieceMaterial.findMany({
    where: { id: { in: despieceMaterialIds } },
    select: { id: true, muebleId: true, cantidad: true },
  });

  const newTotal = materiales.reduce((s, m) => s + Number(m.cantidad), 0);

  // Capacidad efectiva = retazos libres actualmente + los que ya tenía reservados yo
  const efectivoDisponible = residual.cantidad + prevTotal;
  if (newTotal > efectivoDisponible) {
    return NextResponse.json(
      {
        error: `La cantidad de piezas seleccionadas (${newTotal}) supera la capacidad disponible (${efectivoDisponible}). Reducí la selección.`,
      },
      { status: 400 }
    );
  }

  // Diferencia neta: positivo = se liberan retazos, negativo = se consumen
  const delta = prevTotal - newTotal;

  // Reemplazar atómicamente reservas y ajustar cantidad del retazo
  await prisma.$transaction([
    prisma.reservaResidual.deleteMany({ where: { materialResidualId: id } }),
    ...materiales.map((m) =>
      prisma.reservaResidual.create({
        data: { materialResidualId: id, despieceMaterialId: m.id, muebleId: m.muebleId },
      })
    ),
    prisma.materialResidual.update({
      where: { id },
      data: { cantidad: { increment: delta } },
    }),
  ]);

  return NextResponse.json({ ok: true, reservadas: materiales.length });
}

// DELETE: liberar todas las reservas (o un subconjunto) y restituir cantidad
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  let despieceMaterialIds: string[] | null = null;
  try {
    const body = await req.json();
    const parsed = z.object({ despieceMaterialIds: z.array(z.string().uuid()).min(1) }).safeParse(body);
    if (parsed.success) despieceMaterialIds = parsed.data.despieceMaterialIds;
  } catch { /* sin body */ }

  // Calcular cuántas piezas se van a liberar
  const reservasAEliminar = await prisma.reservaResidual.findMany({
    where: despieceMaterialIds
      ? { materialResidualId: id, despieceMaterialId: { in: despieceMaterialIds } }
      : { materialResidualId: id },
    include: { despieceMaterial: { select: { cantidad: true } } },
  });
  const cantidadARestituir = reservasAEliminar.reduce(
    (s, r) => s + Number(r.despieceMaterial.cantidad), 0
  );

  await prisma.$transaction([
    prisma.reservaResidual.deleteMany({
      where: despieceMaterialIds
        ? { materialResidualId: id, despieceMaterialId: { in: despieceMaterialIds } }
        : { materialResidualId: id },
    }),
    prisma.materialResidual.update({
      where: { id },
      data: { cantidad: { increment: cantidadARestituir } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
