import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { z } from "zod";

const muebleSchema = z.object({
  codigo: z.string().min(1, "El código es obligatorio"),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  categoriaId: z.string().uuid("Categoría inválida"),
});

export async function GET(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const categoriaId = searchParams.get("categoriaId");
  const estado = searchParams.get("estado") ?? "activo";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Number(searchParams.get("pageSize") || 20);

  const where = {
    empresaId,
    estado,
    categoriaId: categoriaId ?? undefined,
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" as const } },
            { codigo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [muebles, total] = await Promise.all([
    prisma.mueble.findMany({
      where,
      orderBy: [{ categoria: { nombre: "asc" } }, { codigo: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        categoria: { select: { nombre: true } },
        _count: { select: { materiales: true, insumos: true } },
      },
    }),
    prisma.mueble.count({ where }),
  ]);

  return NextResponse.json({ muebles, total });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const body = await req.json();
  const parsed = muebleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const existe = await prisma.mueble.findUnique({
    where: { empresaId_codigo: { empresaId, codigo: parsed.data.codigo } },
  });
  if (existe) {
    return NextResponse.json(
      { error: "Ya existe un mueble con ese código" },
      { status: 409 }
    );
  }

  const mueble = await prisma.mueble.create({ data: { ...parsed.data, empresaId } });
  return NextResponse.json(mueble, { status: 201 });
}
