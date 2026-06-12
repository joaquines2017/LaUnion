import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReporteDespiece } from "@/components/reportes/ReporteDespiece";
import React from "react";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;

  const mueble = await prisma.mueble.findFirst({
    where: { id, empresaId },
    include: {
      categoria: true,
      materiales: {
        orderBy: { orden: "asc" },
        include: {
          insumo: { select: { codigo: true, unidadMedida: true } },
        },
      },
      insumos: {
        orderBy: { orden: "asc" },
        include: {
          insumo: { select: { codigo: true, unidadMedida: true } },
        },
      },
    },
  });

  if (!mueble) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(ReporteDespiece, {
      mueble: {
        codigo: mueble.codigo,
        nombre: mueble.nombre,
        categoria: mueble.categoria.nombre,
        costoActual: Number(mueble.costoActual),
        updatedAt: mueble.updatedAt.toLocaleDateString("es-AR"),
      },
      materiales: mueble.materiales.map((m) => ({
        productoNombre: m.productoNombre,
        codigo: m.insumo?.codigo ?? null,
        unidadMedida: m.insumo?.unidadMedida ?? null,
        medidas: m.medidas,
        cantidad: Number(m.cantidad),
        costoUnitario: Number(m.costoUnitario),
        costoTotal: Number(m.costoTotal),
      })),
      insumos: mueble.insumos.map((i) => ({
        descripcion: i.descripcion,
        codigo: i.insumo?.codigo ?? null,
        unidadMedida: i.insumo?.unidadMedida ?? null,
        cantidad: Number(i.cantidad),
        costoUnitario: Number(i.costoUnitario),
        costoTotal: Number(i.costoTotal),
      })),
      fechaGeneracion: new Date().toLocaleDateString("es-AR"),
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(el);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="despiece-${mueble.codigo}.pdf"`,
    },
  });
}
