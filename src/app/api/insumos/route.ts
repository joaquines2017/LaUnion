import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const insumoSchema = z.object({
  codigo: z.string().min(1, "El código es obligatorio"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  categoriaId: z.string().uuid("Categoría inválida"),
  unidadMedida: z.string().default("unidad"),
  espesormm: z.number().positive().optional(),
  altoM: z.number().positive().optional(),
  anchoM: z.number().positive().optional(),
  precioBase: z.number().positive().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const buscar = searchParams.get("buscar") ?? "";
  const categoriaId = searchParams.get("categoriaId");

  const insumos = await prisma.insumo.findMany({
    where: {
      estado: "activo",
      categoriaId: categoriaId ?? undefined,
      OR: buscar
        ? [
            { descripcion: { contains: buscar, mode: "insensitive" } },
            { codigo: { contains: buscar, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ categoria: { nombre: "asc" } }, { descripcion: "asc" }],
    include: {
      categoria: { select: { nombre: true } },
      precios: {
        where: { estado: "vigente" },
        orderBy: { precio: "asc" },
        include: { proveedor: { select: { nombre: true } } },
        take: 1, // precio mínimo
      },
    },
  });

  return NextResponse.json(insumos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = insumoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verificar que el código no exista
  const existe = await prisma.insumo.findUnique({
    where: { codigo: parsed.data.codigo },
  });
  if (existe) {
    return NextResponse.json(
      { error: "Ya existe un insumo con ese código" },
      { status: 409 }
    );
  }

  const insumo = await prisma.insumo.create({ data: parsed.data });
  return NextResponse.json(insumo, { status: 201 });
}
