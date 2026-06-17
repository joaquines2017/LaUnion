import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReporteResiduales } from "@/components/reportes/ReporteResiduales";
import React from "react";

export async function GET() {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const raw = await prisma.materialResidual.findMany({
    where: { empresaId, estado: "disponible" },
    orderBy: [{ insumo: { descripcion: "asc" } }, { createdAt: "asc" }],
    include: {
      insumo: { select: { id: true, descripcion: true, espesormm: true, altoM: true, anchoM: true } },
      reservas: { include: { mueble: { select: { codigo: true, nombre: true } } } },
    },
  });

  const items = raw.map((item) => {
    const areaM2 = (item.altoCm * item.anchoCm * item.cantidad) / 10000;
    const asignado = item.reservas
      .map((r) => `${r.mueble.codigo} ×${r.cantidadAsignada}`)
      .join(", ");
    return {
      insumoDescripcion: item.insumo.descripcion,
      espesormm: item.insumo.espesormm,
      altoCm: item.altoCm,
      anchoCm: item.anchoCm,
      cantidad: item.cantidad,
      areaM2,
      nota: item.nota,
      asignado,
    };
  });

  const totalM2 = items.reduce((s, i) => s + i.areaM2, 0);

  // Resumen por placa (solo insumos con dimensiones estándar definidas)
  const gruposMap = new Map<string, { material: string; espesormm: number | null; altoM: number; anchoM: number; retazos: number; areaRetazosM2: number }>();
  for (const item of raw) {
    if (!item.insumo.altoM || !item.insumo.anchoM) continue;
    if (!gruposMap.has(item.insumo.id)) {
      gruposMap.set(item.insumo.id, {
        material: item.insumo.descripcion,
        espesormm: item.insumo.espesormm,
        altoM: item.insumo.altoM,
        anchoM: item.insumo.anchoM,
        retazos: 0,
        areaRetazosM2: 0,
      });
    }
    const g = gruposMap.get(item.insumo.id)!;
    g.retazos += item.cantidad;
    g.areaRetazosM2 += (item.altoCm * item.anchoCm * item.cantidad) / 10000;
  }

  const grupos = [...gruposMap.values()]
    .sort((a, b) => b.areaRetazosM2 - a.areaRetazosM2)
    .map((g) => ({
      ...g,
      placasEquivalentes: g.areaRetazosM2 / (g.altoM * g.anchoM),
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(ReporteResiduales as any, {
    items,
    grupos,
    totalM2,
    fecha: new Date().toLocaleDateString("es-AR"),
  });

  const buffer = await renderToBuffer(el as Parameters<typeof renderToBuffer>[0]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="retazos-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
