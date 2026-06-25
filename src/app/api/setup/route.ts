import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const CATEGORIAS_INSUMO = [
  { nombre: "Melamina",          descripcion: "Placas de melamina en distintos colores y espesores" },
  { nombre: "MDF",               descripcion: "Placas de MDF crudo o melamínico" },
  { nombre: "Fibrofácil",        descripcion: "Placas de fibrocemento para fondos" },
  { nombre: "Aglomerado",        descripcion: "Placas de aglomerado de madera" },
  { nombre: "Ranurado",          descripcion: "Placas ranuradas para estanterías" },
  { nombre: "Bisagras",          descripcion: "Bisagras de distintos tipos y ángulos" },
  { nombre: "Correderas",        descripcion: "Rieles y correderas para cajones" },
  { nombre: "Tornillería",       descripcion: "Tornillos y fijaciones" },
  { nombre: "Cerraduras",        descripcion: "Cerraduras para cajones y vitrinas" },
  { nombre: "Tiradores",         descripcion: "Tiradores y manijas" },
  { nombre: "Vidrios y Espejos", descripcion: "Vidrios float y espejos varios" },
  { nombre: "Patas y Ruedas",    descripcion: "Patas y ruedas para muebles" },
  { nombre: "Iluminación",       descripcion: "Componentes eléctricos para muebles" },
  { nombre: "Kits",              descripcion: "Kits pre-armados para placards y corredizas" },
  { nombre: "Tapa Canto",        descripcion: "Cintas de borde para melamina" },
  { nombre: "Placas Especiales", descripcion: "Placas con tratamientos especiales" },
  { nombre: "Accesorios",        descripcion: "Escuadras, molduras, silicona y varios" },
];

const CATEGORIAS_MUEBLE = [
  "Placard", "Biblioteca", "Cajonera", "Mostrador",
  "Mesa", "Estante", "Vitrina", "Aparador",
  "Botinero", "Espejo", "Otro",
];

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

    await tx.categoriaInsumo.createMany({
      data: CATEGORIAS_INSUMO.map((c) => ({ ...c, empresaId: empresa.id })),
    });

    await tx.categoriaMueble.createMany({
      data: CATEGORIAS_MUEBLE.map((nombre) => ({ nombre, empresaId: empresa.id })),
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
