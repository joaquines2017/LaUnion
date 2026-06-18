import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReporteMuebles } from "@/components/reportes/ReporteMuebles";
import React from "react";

export async function GET(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const categoriaId = searchParams.get("categoriaId") ?? undefined;
  const estadoFiltro = (searchParams.get("estado") ?? "activo") as "activo" | "inactivo";

  const [muebles, categoriaData] = await Promise.all([
    prisma.mueble.findMany({
      where: {
        empresaId,
        estado: estadoFiltro,
        ...(categoriaId ? { categoriaId } : {}),
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: "insensitive" } },
                { codigo: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ categoria: { nombre: "asc" } }, { codigo: "asc" }],
      include: {
        categoria: { select: { nombre: true } },
        _count: { select: { materiales: true, insumos: true } },
      },
    }),
    categoriaId
      ? prisma.categoriaMueble.findUnique({ where: { id: categoriaId }, select: { nombre: true } })
      : null,
  ]);

  const items = muebles.map((m) => ({
    codigo:      m.codigo,
    nombre:      m.nombre,
    categoria:   m.categoria.nombre,
    costoActual: Number(m.costoActual),
    items:       m._count.materiales + m._count.insumos,
  }));

  const costoTotal = items.reduce((s, m) => s + m.costoActual, 0);

  const filtrosParts: string[] = [];
  if (q) filtrosParts.push(`Búsqueda: "${q}"`);
  if (categoriaData) filtrosParts.push(`Categoría: ${categoriaData.nombre}`);
  if (estadoFiltro === "inactivo") filtrosParts.push("Inactivos");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(ReporteMuebles as any, {
    muebles: items,
    fecha: new Date().toLocaleDateString("es-AR"),
    filtros: filtrosParts.join(" · "),
    total: items.length,
    costoTotal,
  });

  const buffer = await renderToBuffer(el as Parameters<typeof renderToBuffer>[0]);
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="muebles-${fecha}.pdf"`,
    },
  });
}
