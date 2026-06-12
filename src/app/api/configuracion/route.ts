import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { z } from "zod";

const schema = z.object({
  factorDesperdicio: z.number().min(1).max(2),
  vigenciaPrecioDias: z.number().int().min(1).max(365),
});

export async function GET() {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const config = await prisma.configuracionGlobal.upsert({
    where: { empresaId },
    update: {},
    create: { empresaId },
  });

  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const body = await req.json();
  const parsed = schema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const config = await prisma.configuracionGlobal.upsert({
    where: { empresaId },
    update: parsed.data,
    create: { empresaId, ...parsed.data },
  });

  return NextResponse.json(config);
}
