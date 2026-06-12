import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReporteCostosPDF } from "@/components/reportes/ReporteCostosPDF";
import React from "react";

export async function GET(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { searchParams } = new URL(req.url);
  const categoriaId = searchParams.get("categoriaId");
  const estado = searchParams.get("estado") ?? "activo";

  const [muebles, categorias] = await Promise.all([
    prisma.mueble.findMany({
      where: {
        empresaId,
        estado,
        categoriaId: categoriaId ?? undefined,
      },
      orderBy: [{ categoria: { nombre: "asc" } }, { codigo: "asc" }],
      include: {
        categoria: { select: { nombre: true } },
        _count: { select: { materiales: true, insumos: true } },
      },
    }),
    prisma.categoriaMueble.findMany({ where: { empresaId }, orderBy: { nombre: "asc" } }),
  ]);

  const categoriaSeleccionada = categoriaId
    ? categorias.find((c) => c.id === categoriaId)?.nombre
    : null;

  // cast needed: renderToBuffer expects DocumentProps but React.createElement returns generic element
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(ReporteCostosPDF, {
    muebles: muebles.map((m) => ({
      codigo: m.codigo,
      nombre: m.nombre,
      categoria: m.categoria.nombre,
      costoActual: Number(m.costoActual),
      items: m._count.materiales + m._count.insumos,
      updatedAt: m.updatedAt.toLocaleDateString("es-AR"),
    })),
    fechaGeneracion: new Date().toLocaleDateString("es-AR"),
    categoriaFiltro: categoriaSeleccionada,
  }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(el);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="costos-muebles-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
