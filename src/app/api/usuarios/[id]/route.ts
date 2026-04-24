import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { registrarLog } from "@/lib/auditoria";

const editarSchema = z.object({
  nombreUsuario: z.string().min(2).optional(),
  email: z.string().email().optional(),
  rol: z.enum(["administrador", "operador", "lectura"]).optional(),
  estado: z.enum(["activo", "inactivo"]).optional(),
  password: z.string().min(6).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = editarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;

  // Evitar que el último admin quede sin rol administrador
  if (rest.rol && rest.rol !== "administrador") {
    const totalAdmins = await prisma.usuario.count({ where: { rol: "administrador", estado: "activo" } });
    const esEsteAdmin = await prisma.usuario.findUnique({ where: { id, rol: "administrador" } });
    if (totalAdmins <= 1 && esEsteAdmin) {
      return NextResponse.json({ error: "No podés cambiar el rol del único administrador" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nombreUsuario: true, email: true, rol: true, estado: true, createdAt: true },
    });
    registrarLog({
      usuarioId: (session.user as { id?: string }).id ?? "sistema",
      accion: "USUARIO_MODIFICADO",
      entidad: "Usuario",
      entidadId: id,
      datosNuevos: { ...rest, passwordCambiado: !!password },
    });
    return NextResponse.json(usuario);
  } catch {
    return NextResponse.json({ error: "El email o nombre de usuario ya existe" }, { status: 409 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const { id } = await params;

  // No eliminar el propio usuario
  if ((session.user as { id?: string }).id === id) {
    return NextResponse.json({ error: "No podés eliminar tu propio usuario" }, { status: 409 });
  }

  // No eliminar el último admin
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (usuario?.rol === "administrador") {
    const totalAdmins = await prisma.usuario.count({ where: { rol: "administrador", estado: "activo" } });
    if (totalAdmins <= 1) {
      return NextResponse.json({ error: "No podés eliminar el único administrador" }, { status: 409 });
    }
  }

  await prisma.usuario.delete({ where: { id } });
  registrarLog({
    usuarioId: (session.user as { id?: string }).id ?? "sistema",
    accion: "USUARIO_ELIMINADO",
    entidad: "Usuario",
    entidadId: id,
  });
  return NextResponse.json({ ok: true });
}
