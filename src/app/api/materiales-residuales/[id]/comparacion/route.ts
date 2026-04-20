import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { compararResidual } from "@/lib/comparacion-residuales";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const residual = await prisma.materialResidual.findUnique({ where: { id } });
  if (!residual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const config = await prisma.configuracionGlobal.findUnique({ where: { id: "1" } });
  const factorDesperdicio = config?.factorDesperdicio ?? 1.1;

  const resultado = await compararResidual(
    residual.insumoId,
    residual.altoCm,
    residual.anchoCm,
    factorDesperdicio
  );

  return NextResponse.json(resultado);
}
