import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { compararResidual } from "@/lib/comparacion-residuales";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;
  const residual = await prisma.materialResidual.findFirst({ where: { id, empresaId } });
  if (!residual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const config = await prisma.configuracionGlobal.findUnique({ where: { empresaId } });
  const factorDesperdicio = config?.factorDesperdicio ?? 1.1;

  const resultado = await compararResidual(
    empresaId, residual.insumoId, residual.altoCm, residual.anchoCm,
    factorDesperdicio, id, residual.cantidad
  );

  return NextResponse.json(resultado);
}

// POST: set completo de asignaciones para este retazo a nivel mueble.
// Acepta lista de { muebleId, cantidad } — lista vacía elimina todas las asignaciones.
const asignacionSchema = z.object({
  asignaciones: z.array(z.object({
    muebleId: z.string().uuid(),
    cantidad: z.number().int().min(1),
  })),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;
  const residual = await prisma.materialResidual.findFirst({ where: { id, empresaId } });
  if (!residual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = asignacionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });

  const { asignaciones } = parsed.data;

  if (asignaciones.length > 0) {
    const muebleIds = asignaciones.map((a) => a.muebleId);
    const count = await prisma.mueble.count({ where: { id: { in: muebleIds }, empresaId } });
    if (count !== new Set(muebleIds).size) {
      return NextResponse.json({ error: "Uno o más muebles no son válidos" }, { status: 400 });
    }
  }

  // Cuántas piezas tenía asignadas este retazo antes del cambio
  const prevAsignaciones = await prisma.reservaResidual.findMany({
    where: { materialResidualId: id },
    select: { cantidadAsignada: true },
  });
  const prevTotal = prevAsignaciones.reduce((s, r) => s + r.cantidadAsignada, 0);

  // Lista vacía → limpiar todo
  if (asignaciones.length === 0) {
    await prisma.$transaction([
      prisma.reservaResidual.deleteMany({ where: { materialResidualId: id } }),
      prisma.materialResidual.update({
        where: { id },
        data: { cantidad: { increment: prevTotal } },
      }),
    ]);
    return NextResponse.json({ ok: true, reservadas: 0 });
  }

  const newTotal = asignaciones.reduce((s, a) => s + a.cantidad, 0);
  const efectivoDisponible = residual.cantidad + prevTotal;

  if (newTotal > efectivoDisponible) {
    return NextResponse.json(
      { error: `Las piezas asignadas (${newTotal}) superan la capacidad disponible (${efectivoDisponible}).` },
      { status: 400 }
    );
  }

  const delta = prevTotal - newTotal;

  // Reemplazar atómicamente: eliminar las del retazo actual y crear las nuevas
  await prisma.$transaction([
    prisma.reservaResidual.deleteMany({ where: { materialResidualId: id } }),
    ...asignaciones.map((a) =>
      prisma.reservaResidual.create({
        data: {
          materialResidualId: id,
          muebleId: a.muebleId,
          cantidadAsignada: a.cantidad,
        },
      })
    ),
    prisma.materialResidual.update({
      where: { id },
      data: { cantidad: { increment: delta } },
    }),
  ]);

  return NextResponse.json({ ok: true, reservadas: asignaciones.length });
}

// DELETE: liberar todas las asignaciones de este retazo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;

  const residual = await prisma.materialResidual.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!residual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const prev = await prisma.reservaResidual.findMany({
    where: { materialResidualId: id },
    select: { cantidadAsignada: true },
  });
  const prevTotal = prev.reduce((s, r) => s + r.cantidadAsignada, 0);

  await prisma.$transaction([
    prisma.reservaResidual.deleteMany({ where: { materialResidualId: id } }),
    prisma.materialResidual.update({
      where: { id },
      data: { cantidad: { increment: prevTotal } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
