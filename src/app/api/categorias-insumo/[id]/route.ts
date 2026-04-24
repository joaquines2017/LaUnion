import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  nombre: z.string().min(1).max(80).optional(),
  descripcion: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.nombre) {
    const existe = await prisma.categoriaInsumo.findFirst({
      where: { nombre: parsed.data.nombre, NOT: { id } },
    });
    if (existe)
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
  }

  const categoria = await prisma.categoriaInsumo.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(categoria);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const count = await prisma.insumo.count({ where: { categoriaId: id } });
  if (count > 0)
    return NextResponse.json(
      { error: `No se puede eliminar: ${count} insumo${count !== 1 ? "s" : ""} la usan` },
      { status: 409 }
    );

  await prisma.categoriaInsumo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
