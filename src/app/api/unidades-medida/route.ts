import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(40),
  descripcion: z.string().max(200).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const unidades = await prisma.unidadMedida.findMany({
    orderBy: { nombre: "asc" },
  });

  // Enriquecer con el conteo de insumos que las usan
  const conConteo = await Promise.all(
    unidades.map(async (u) => ({
      ...u,
      _count: { insumos: await prisma.insumo.count({ where: { unidadMedida: u.nombre } }) },
    }))
  );

  return NextResponse.json(conConteo);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });

  const existe = await prisma.unidadMedida.findUnique({
    where: { nombre: parsed.data.nombre },
  });
  if (existe)
    return NextResponse.json({ error: "Ya existe una unidad con ese nombre" }, { status: 409 });

  const unidad = await prisma.unidadMedida.create({ data: parsed.data });
  return NextResponse.json(unidad, { status: 201 });
}
