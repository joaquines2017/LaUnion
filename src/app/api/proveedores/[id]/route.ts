import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { z } from "zod";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  cuit: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  direccion: z.string().optional(),
  observaciones: z.string().optional(),
  estado: z.enum(["activo", "inactivo"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;
  const proveedor = await prisma.proveedor.findFirst({
    where: { id, empresaId },
    include: {
      precios: {
        where: { estado: "vigente" },
        include: { insumo: { select: { codigo: true, descripcion: true } } },
        orderBy: { insumo: { descripcion: "asc" } },
      },
    },
  });

  if (!proveedor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(proveedor);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const existe = await prisma.proveedor.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const proveedor = await prisma.proveedor.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(proveedor);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;

  const existe = await prisma.proveedor.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Baja lógica — no eliminar si tiene precios vigentes
  const preciosVigentes = await prisma.precioProveedor.count({
    where: { proveedorId: id, estado: "vigente" },
  });

  if (preciosVigentes > 0) {
    // Marcar como inactivo en vez de eliminar
    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: { estado: "inactivo" },
    });
    return NextResponse.json(proveedor);
  }

  await prisma.proveedor.update({ where: { id }, data: { estado: "inactivo" } });
  return NextResponse.json({ ok: true });
}
