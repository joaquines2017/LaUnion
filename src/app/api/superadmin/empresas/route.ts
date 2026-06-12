import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generarPasswordSeguro } from "@/lib/password";
import { enviarPasswordInicial } from "@/lib/email";
import { registrarLog } from "@/lib/auditoria";

const crearSchema = z.object({
  nombre:        z.string().min(2, "Nombre obligatorio"),
  dominio:       z.string().optional(),
  adminEmail:    z.string().email("Email del administrador inválido"),
  adminNombre:   z.string().min(2, "Nombre del administrador obligatorio"),
});

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const empresas = await prisma.empresa.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { usuarios: true } },
    },
  });

  return NextResponse.json(empresas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = crearSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const { nombre, dominio, adminEmail, adminNombre } = parsed.data;

  const emailExiste = await prisma.usuario.findUnique({ where: { email: adminEmail } });
  if (emailExiste) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const password = generarPasswordSeguro(12);
  const passwordHash = await bcrypt.hash(password, 10);

  const empresa = await prisma.$transaction(async (tx) => {
    const emp = await tx.empresa.create({
      data: { nombre, dominio: dominio || null },
    });
    await tx.usuario.create({
      data: {
        nombreUsuario: adminNombre,
        email:         adminEmail,
        passwordHash,
        rol:           "administrador",
        empresaId:     emp.id,
      },
    });
    return emp;
  });

  // Enviar email — devuelve advertencia si falla pero no bloquea la creación
  let emailError: string | null = null;
  try {
    await enviarPasswordInicial({
      email:         adminEmail,
      nombreUsuario: adminNombre,
      nombreEmpresa: nombre,
      password,
      dominio,
    });
  } catch (err) {
    console.error("Error enviando email:", err);
    emailError = err instanceof Error ? err.message : "Error desconocido al enviar email";
  }

  registrarLog({
    usuarioId: (session.user as { id?: string }).id ?? "sistema",
    accion:    "EMPRESA_CREADA",
    entidad:   "Empresa",
    entidadId: empresa.id,
    empresaId: empresa.id,
    datosNuevos: { nombre, dominio, adminEmail },
  });

  return NextResponse.json({ ...empresa, emailError }, { status: 201 });
}
