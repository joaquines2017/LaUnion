import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generarPasswordSeguro } from "@/lib/password";
import { enviarPasswordInicial } from "@/lib/email";
import { registrarLog } from "@/lib/auditoria";
import { passwordSchema } from "@/lib/password";

type Params = { params: Promise<{ id: string }> };

// GET — obtener el admin de la empresa
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const admin = await prisma.usuario.findFirst({
    where: { empresaId: id, rol: "administrador" },
    select: { id: true, nombreUsuario: true, email: true, estado: true },
  });

  if (!admin) return NextResponse.json({ error: "Sin administrador" }, { status: 404 });
  return NextResponse.json(admin);
}

const editarAdminSchema = z.object({
  nombreUsuario: z.string().min(2).optional(),
  email:         z.string().email().optional(),
  password:      passwordSchema.optional(),
});

// PATCH — editar datos del admin
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = editarAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const admin = await prisma.usuario.findFirst({
    where: { empresaId: id, rol: "administrador" },
  });
  if (!admin) return NextResponse.json({ error: "Sin administrador" }, { status: 404 });

  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  try {
    const actualizado = await prisma.usuario.update({
      where: { id: admin.id },
      data,
      select: { id: true, nombreUsuario: true, email: true, estado: true },
    });

    registrarLog({
      usuarioId: (session.user as { id?: string }).id ?? "sistema",
      accion:    "ADMIN_EMPRESA_MODIFICADO",
      entidad:   "Usuario",
      entidadId: admin.id,
      datosNuevos: { ...rest, passwordCambiado: !!password },
    });

    return NextResponse.json(actualizado);
  } catch {
    return NextResponse.json({ error: "El email ya está en uso por otro usuario" }, { status: 409 });
  }
}

// POST — reenviar credenciales (genera nueva contraseña y envía email)
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const soloReenviar = body.soloReenviar === true;

  const [empresa, admin] = await Promise.all([
    prisma.empresa.findUnique({ where: { id } }),
    prisma.usuario.findFirst({ where: { empresaId: id, rol: "administrador" } }),
  ]);

  if (!empresa || !admin) {
    return NextResponse.json({ error: "Empresa o administrador no encontrado" }, { status: 404 });
  }

  // Generar nueva contraseña si no es solo reenvío
  const password = generarPasswordSeguro(12);
  if (!soloReenviar) {
    await prisma.usuario.update({
      where: { id: admin.id },
      data:  { passwordHash: await bcrypt.hash(password, 10) },
    });
  }

  let emailError: string | null = null;
  try {
    await enviarPasswordInicial({
      email:         admin.email,
      nombreUsuario: admin.nombreUsuario,
      nombreEmpresa: empresa.nombre,
      password,
      dominio:       empresa.dominio,
    });
  } catch (err) {
    console.error("Error enviando email:", err);
    emailError = err instanceof Error ? err.message : "Error al enviar email";
  }

  registrarLog({
    usuarioId: (session.user as { id?: string }).id ?? "sistema",
    accion:    "CREDENCIALES_REENVIADAS",
    entidad:   "Usuario",
    entidadId: admin.id,
  });

  return NextResponse.json({ ok: true, emailError });
}
