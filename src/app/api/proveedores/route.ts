import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const proveedorSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  cuit: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: z.string().optional(),
  observaciones: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const buscar = searchParams.get("buscar") ?? "";
  const incluirInactivos = searchParams.get("inactivos") === "true";

  const proveedores = await prisma.proveedor.findMany({
    where: {
      estado: incluirInactivos ? undefined : "activo",
      nombre: buscar ? { contains: buscar, mode: "insensitive" } : undefined,
    },
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { precios: { where: { estado: "vigente" } } } },
    },
  });

  return NextResponse.json(proveedores);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = proveedorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const proveedor = await prisma.proveedor.create({ data: parsed.data });
  return NextResponse.json(proveedor, { status: 201 });
}
