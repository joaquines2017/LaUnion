import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  categoriaId: z.string().uuid().optional(),
  estado: z.enum(["activo", "inactivo"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const mueble = await prisma.mueble.findUnique({
    where: { id },
    include: {
      categoria: true,
      materiales: { orderBy: { orden: "asc" } },
      insumos: { orderBy: { orden: "asc" } },
    },
  });

  if (!mueble) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(mueble);
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

  const mueble = await prisma.mueble.update({ where: { id }, data: parsed.data });
  return NextResponse.json(mueble);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.mueble.update({ where: { id }, data: { estado: "inactivo" } });
  return NextResponse.json({ ok: true });
}
