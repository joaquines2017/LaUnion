import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  nombre: z.string().min(1).max(40).optional(),
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

  // Si cambia el nombre, actualizar también los insumos que la referenciaban
  const antes = await prisma.unidadMedida.findUnique({ where: { id } });
  if (!antes) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (parsed.data.nombre && parsed.data.nombre !== antes.nombre) {
    const existe = await prisma.unidadMedida.findFirst({
      where: { nombre: parsed.data.nombre, NOT: { id } },
    });
    if (existe)
      return NextResponse.json({ error: "Ya existe una unidad con ese nombre" }, { status: 409 });

    // Actualizar insumos en cascada
    await prisma.insumo.updateMany({
      where: { unidadMedida: antes.nombre },
      data: { unidadMedida: parsed.data.nombre },
    });
  }

  const unidad = await prisma.unidadMedida.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(unidad);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const unidad = await prisma.unidadMedida.findUnique({ where: { id } });
  if (!unidad) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const count = await prisma.insumo.count({ where: { unidadMedida: unidad.nombre } });
  if (count > 0)
    return NextResponse.json(
      { error: `No se puede eliminar: ${count} insumo${count !== 1 ? "s" : ""} la usan` },
      { status: 409 }
    );

  await prisma.unidadMedida.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
