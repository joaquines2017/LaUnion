import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { registrarLog } from "@/lib/auditoria";

const editarSchema = z.object({
  nombre:  z.string().min(2).optional(),
  dominio: z.string().nullable().optional(),
  estado:  z.enum(["activo", "inactivo"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = editarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({
    where: { id },
    data:  parsed.data,
  });

  registrarLog({
    usuarioId: (session.user as { id?: string }).id ?? "sistema",
    accion:    "EMPRESA_MODIFICADA",
    entidad:   "Empresa",
    entidadId: id,
    empresaId: id,
    datosNuevos: parsed.data,
  });

  return NextResponse.json(empresa);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  // Desactivar empresa y sus usuarios
  await prisma.$transaction([
    prisma.empresa.update({ where: { id }, data: { estado: "inactivo" } }),
    prisma.usuario.updateMany({ where: { empresaId: id }, data: { estado: "inactivo" } }),
  ]);

  registrarLog({
    usuarioId: (session.user as { id?: string }).id ?? "sistema",
    accion:    "EMPRESA_DESACTIVADA",
    entidad:   "Empresa",
    entidadId: id,
    empresaId: id,
  });

  return NextResponse.json({ ok: true });
}
