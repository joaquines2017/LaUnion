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
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Number(searchParams.get("pageSize") || 20);

  const where = {
    estado: "activo" as const,
    categoriaId: categoriaId ?? undefined,
    OR: buscar
      ? [
          { descripcion: { contains: buscar, mode: "insensitive" as const } },
          { codigo: { contains: buscar, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const [insumos, total] = await Promise.all([
    prisma.insumo.findMany({
      where,
      orderBy: [{ categoria: { nombre: "asc" } }, { descripcion: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        categoria: { select: { nombre: true } },
        precios: {
          where: { estado: "vigente" },
          orderBy: { precio: "asc" },
          include: { proveedor: { select: { nombre: true } } },
        },
      },
    }),
    prisma.insumo.count({ where }),
  ]);

  // Si el insumo tiene un precio seleccionado manualmente, devolverlo primero.
  // Si no, el primero del array ya es el mínimo (orderBy asc).
  const resultado = insumos.map((i) => {
    if (i.precioSeleccionadoId) {
      const seleccionado = i.precios.find(
        (p) => p.id === i.precioSeleccionadoId && p.estado === "vigente"
      );
      if (seleccionado) {
        const resto = i.precios.filter((p) => p.id !== seleccionado.id);
        return { ...i, precios: [seleccionado, ...resto] };
      }
    }
    return i;
  });

  return NextResponse.json({ insumos: resultado, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = insumoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
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
