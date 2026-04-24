import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getListaCorte } from "@/lib/lista-corte";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filas = await getListaCorte({
    muebleId: searchParams.get("muebleId") ?? undefined,
    insumoId: searchParams.get("insumoId") ?? undefined,
  });

  return NextResponse.json(filas);
}
