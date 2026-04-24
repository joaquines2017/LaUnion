import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  insumoId: z.string().uuid(),
  altoCm: z.number().positive(),
  anchoCm: z.number().positive(),
  cantidad: z.number().int().positive().default(1),
  nota: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") ?? "disponible";

  const items = await prisma.materialResidual.findMany({
    where: estado !== "todos" ? { estado } : undefined,
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
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.materialResidual.create({ data: parsed.data });
  return NextResponse.json(item, { status: 201 });
}
