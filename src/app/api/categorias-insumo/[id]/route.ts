import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { z } from "zod";

const schema = z.object({
  nombre: z.string().min(1).max(80).optional(),
  descripcion: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;

  const existe = await prisma.categoriaInsumo.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.nombre) {
    const duplicado = await prisma.categoriaInsumo.findFirst({
      where: { empresaId, nombre: parsed.data.nombre, NOT: { id } },
    });
    if (duplicado)
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
  }

  const categoria = await prisma.categoriaInsumo.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(categoria);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;

  const existe = await prisma.categoriaInsumo.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const count = await prisma.insumo.count({ where: { categoriaId: id } });
  if (count > 0)
    return NextResponse.json(
      { error: `No se puede eliminar: ${count} insumo${count !== 1 ? "s" : ""} la usan` },
      { status: 409 }
    );

  await prisma.categoriaInsumo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
