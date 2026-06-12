import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { z } from "zod";
import { registrarLog } from "@/lib/auditoria";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  categoriaId: z.string().uuid().optional(),
  estado: z.enum(["activo", "inactivo"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;
  const mueble = await prisma.mueble.findFirst({
    where: { id, empresaId },
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
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId, session } = ctx;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const existe = await prisma.mueble.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const mueble = await prisma.mueble.update({ where: { id }, data: parsed.data });
  registrarLog({
    usuarioId: (session.user as { id?: string }).id ?? "sistema",
    accion: "MUEBLE_MODIFICADO",
    entidad: "Mueble",
    entidadId: id,
    empresaId,
    datosNuevos: parsed.data,
  });
  return NextResponse.json(mueble);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId, session } = ctx;

  const { id } = await params;

  const existe = await prisma.mueble.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.mueble.update({ where: { id }, data: { estado: "inactivo" } });
  registrarLog({
    usuarioId: (session.user as { id?: string }).id ?? "sistema",
    accion: "MUEBLE_DESACTIVADO",
    entidad: "Mueble",
    entidadId: id,
    empresaId,
  });
  return NextResponse.json({ ok: true });
}
