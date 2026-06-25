import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const count = await prisma.empresa.count();
  if (count > 0) {
    return NextResponse.json(
      { error: "El sistema ya está configurado" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const { empresaNombre, adminNombre, adminEmail, adminPassword } = body;

  if (!empresaNombre?.trim() || !adminNombre?.trim() || !adminEmail?.trim() || !adminPassword) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }
  if (adminPassword.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: { nombre: empresaNombre.trim(), estado: "activo" },
    });

    await tx.configuracionGlobal.create({
      data: {
        empresaId: empresa.id,
        factorDesperdicio: 1.1,
        moneda: "ARS",
        vigenciaPrecioDias: 30,
      },
    });

    const hash = await bcrypt.hash(adminPassword, 12);
    await tx.usuario.create({
      data: {
        nombreUsuario: adminNombre.trim(),
        email: adminEmail.trim().toLowerCase(),
        passwordHash: hash,
        rol: "administrador",
        estado: "activo",
        empresaId: empresa.id,
      },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
