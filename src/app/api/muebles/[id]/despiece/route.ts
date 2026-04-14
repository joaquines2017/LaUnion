import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const materialSchema = z.object({
  id: z.string().uuid().optional(),
  insumoId: z.string().uuid().nullable().optional(),
  productoNombre: z.string().min(1),
  medidas: z.string().nullable().optional(),
  cantidad: z.number().min(0),
  costoUnitario: z.number().min(0),
  costoTotal: z.number().min(0),
  orden: z.number().int().default(0),
});

const insumoLineaSchema = z.object({
  id: z.string().uuid().optional(),
  insumoId: z.string().uuid().nullable().optional(),
  descripcion: z.string().min(1),
  cantidad: z.number().min(0),
  costoUnitario: z.number().min(0),
  costoTotal: z.number().min(0),
  orden: z.number().int().default(0),
});

const despieceSchema = z.object({
  materiales: z.array(materialSchema),
  insumos: z.array(insumoLineaSchema),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const [materiales, insumos] = await Promise.all([
    prisma.despieceMaterial.findMany({
      where: { muebleId: id },
      orderBy: { orden: "asc" },
      include: {
        insumo: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            unidadMedida: true,
            altoM: true,
            anchoM: true,
            precios: {
              where: { estado: "vigente" },
              orderBy: { precio: "asc" },
              take: 1,
              select: { precio: true },
            },
          },
        },
      },
    }),
    prisma.despieceInsumo.findMany({
      where: { muebleId: id },
      orderBy: { orden: "asc" },
      include: {
        insumo: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            unidadMedida: true,
            precios: {
              where: { estado: "vigente" },
              orderBy: { precio: "asc" },
              take: 1,
              select: { precio: true },
            },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ materiales, insumos });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: muebleId } = await params;
  const body = await req.json();
  const parsed = despieceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { materiales, insumos } = parsed.data;

  // Calcular costo total del mueble
  const costoTotal =
    materiales.reduce((s, m) => s + m.costoTotal, 0) +
    insumos.reduce((s, i) => s + i.costoTotal, 0);

  // Reemplazar todo el despiece en una transacción
  await prisma.$transaction(async (tx) => {
    // Borrar los existentes
    await tx.despieceMaterial.deleteMany({ where: { muebleId } });
    await tx.despieceInsumo.deleteMany({ where: { muebleId } });

    // Insertar materiales nuevos
    if (materiales.length > 0) {
      await tx.despieceMaterial.createMany({
        data: materiales.map((m, i) => ({
          muebleId,
          insumoId: m.insumoId ?? null,
          productoNombre: m.productoNombre,
          medidas: m.medidas ?? null,
          cantidad: new Decimal(m.cantidad),
          costoUnitario: new Decimal(m.costoUnitario),
          costoTotal: new Decimal(m.costoTotal),
          orden: m.orden ?? i,
        })),
      });
    }

    // Insertar insumos nuevos
    if (insumos.length > 0) {
      await tx.despieceInsumo.createMany({
        data: insumos.map((ins, i) => ({
          muebleId,
          insumoId: ins.insumoId ?? null,
          descripcion: ins.descripcion,
          cantidad: new Decimal(ins.cantidad),
          costoUnitario: new Decimal(ins.costoUnitario),
          costoTotal: new Decimal(ins.costoTotal),
          orden: ins.orden ?? i,
        })),
      });
    }

    // Actualizar costo total del mueble
    await tx.mueble.update({
      where: { id: muebleId },
      data: { costoActual: new Decimal(costoTotal) },
    });
  });

  return NextResponse.json({ ok: true, costoTotal });
}
