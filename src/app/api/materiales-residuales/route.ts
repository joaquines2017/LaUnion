import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { z } from "zod";

const createSchema = z.object({
  insumoId: z.string().uuid(),
  altoCm: z.number().positive(),
  anchoCm: z.number().positive(),
  cantidad: z.number().int().positive().default(1),
  nota: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") ?? "disponible";

  const items = await prisma.materialResidual.findMany({
    where: estado !== "todos" ? { empresaId, estado } : { empresaId },
    orderBy: { createdAt: "desc" },
    include: {
      insumo: {
        select: {
          id: true,
          codigo: true,
          descripcion: true,
          unidadMedida: true,
          altoM: true,
          anchoM: true,
          espesormm: true,
        },
      },
      reservas: {
        select: {
          muebleId: true,
          cantidadAsignada: true,
          mueble: { select: { nombre: true, codigo: true } },
        },
      },
    },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const insumo = await prisma.insumo.findFirst({ where: { id: parsed.data.insumoId, empresaId }, select: { id: true } });
  if (!insumo) return NextResponse.json({ error: "Insumo no encontrado" }, { status: 404 });

  const item = await prisma.materialResidual.create({ data: { ...parsed.data, empresaId } });
  return NextResponse.json(item, { status: 201 });
}
