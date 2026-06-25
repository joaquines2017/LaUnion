import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const nombre = body.nombre?.trim();

  if (!nombre) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({
    where: { id: ctx.empresaId },
    data: { nombre },
  });

  return NextResponse.json(empresa);
}
