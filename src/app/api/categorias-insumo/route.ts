import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(80),
  descripcion: z.string().max(200).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const categorias = await prisma.categoriaInsumo.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { insumos: true } } },
  });

  return NextResponse.json(categorias);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existe = await prisma.categoriaInsumo.findUnique({
    where: { nombre: parsed.data.nombre },
  });
  if (existe)
    return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });

  const categoria = await prisma.categoriaInsumo.create({ data: parsed.data });
  return NextResponse.json(categoria, { status: 201 });
}
