import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { z } from "zod";

const patchSchema = z.object({
  estado: z.enum(["disponible", "usado"]).optional(),
  nota: z.string().nullish(),
  altoCm: z.number().positive().optional(),
  anchoCm: z.number().positive().optional(),
  cantidad: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const existe = await prisma.materialResidual.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const item = await prisma.materialResidual.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(item);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;

  const existe = await prisma.materialResidual.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.materialResidual.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
