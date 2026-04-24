import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { registrarLog } from "@/lib/auditoria";

const crearSchema = z.object({
  nombreUsuario: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  rol: z.enum(["administrador", "operador", "lectura"]),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const usuarios = await prisma.usuario.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nombreUsuario: true,
      email: true,
      rol: true,
      estado: true,
      createdAt: true,
    },
  });

  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = crearSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const usuario = await prisma.usuario.create({
      data: { ...rest, passwordHash },
      select: { id: true, nombreUsuario: true, email: true, rol: true, estado: true, createdAt: true },
    });
    registrarLog({
      usuarioId: (session.user as { id?: string }).id ?? "sistema",
      accion: "USUARIO_CREADO",
      entidad: "Usuario",
      entidadId: usuario.id,
      datosNuevos: { nombreUsuario: rest.nombreUsuario, email: rest.email, rol: rest.rol },
    });
    return NextResponse.json(usuario, { status: 201 });
  } catch {
    return NextResponse.json({ error: "El email o nombre de usuario ya existe" }, { status: 409 });
  }
}
