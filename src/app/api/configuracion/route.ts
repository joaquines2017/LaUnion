import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  factorDesperdicio: z.number().min(1).max(2),
  vigenciaPrecioDias: z.number().int().min(1).max(365),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const config = await prisma.configuracionGlobal.upsert({
    where: { id: "1" },
    update: {},
    create: { id: "1" },
  });

  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detail: parsed.error.flatten() }, { status: 400 });
  }

  const config = await prisma.configuracionGlobal.upsert({
    where: { id: "1" },
    update: parsed.data,
    create: { id: "1", ...parsed.data },
  });

  return NextResponse.json(config);
}
