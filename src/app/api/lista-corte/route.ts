import { NextRequest, NextResponse } from "next/server";
import { requireEmpresa } from "@/lib/empresa";
import { getListaCorte } from "@/lib/lista-corte";

export async function GET(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { searchParams } = new URL(req.url);
  const filas = await getListaCorte(empresaId, {
    muebleId: searchParams.get("muebleId") ?? undefined,
    insumoId: searchParams.get("insumoId") ?? undefined,
  });

  return NextResponse.json(filas);
}
