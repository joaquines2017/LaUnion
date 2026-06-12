import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
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
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { searchParams } = new URL(req.url);
  const buscar = searchParams.get("buscar") ?? "";
  const incluirInactivos = searchParams.get("inactivos") === "true";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Number(searchParams.get("pageSize") || 20);

  const where = {
    empresaId,
    estado: incluirInactivos ? undefined : "activo",
    nombre: buscar ? { contains: buscar, mode: "insensitive" as const } : undefined,
  };

  const [proveedores, total] = await Promise.all([
    prisma.proveedor.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { precios: { where: { estado: "vigente" } } } },
      },
    }),
    prisma.proveedor.count({ where }),
  ]);

  return NextResponse.json({ proveedores, total });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const body = await req.json();
  const parsed = proveedorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const proveedor = await prisma.proveedor.create({ data: { ...parsed.data, empresaId } });
  return NextResponse.json(proveedor, { status: 201 });
}
