import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getListaCorte, parseSortKeys, sortFilas } from "@/lib/lista-corte";
import { renderToBuffer } from "@react-pdf/renderer";
import { ListaCorte } from "@/components/reportes/ListaCorte";
import React from "react";

const SORT_LABELS: Record<string, string> = {
  anchoCm:  "Ancho",
  altoCm:   "Alto",
  cantidad: "Cantidad",
  pieza:    "Pieza",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sortKeys  = parseSortKeys(searchParams.get("sort"));
  const filas     = await getListaCorte();
  const ordenadas = sortFilas(filas, sortKeys);

  const ordenadoPor = sortKeys
    .map((k) => `${SORT_LABELS[k.field] ?? k.field} ${k.dir === "desc" ? "↓" : "↑"}`)
    .join(", ");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(ListaCorte as any, {
    filas: ordenadas,
    ordenadoPor,
    fecha: new Date().toLocaleDateString("es-AR"),
  }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const buffer = await renderToBuffer(el);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="lista-corte-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
