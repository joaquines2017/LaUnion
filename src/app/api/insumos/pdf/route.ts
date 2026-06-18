import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReporteInsumos } from "@/components/reportes/ReporteInsumos";
import React from "react";

export async function GET(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const categoriaId = searchParams.get("categoriaId") ?? undefined;
  const estadoFiltro = (searchParams.get("estado") ?? "activo") as "activo" | "inactivo";

  const [insumos, categoriaData] = await Promise.all([
    prisma.insumo.findMany({
      where: {
        empresaId,
        estado: estadoFiltro,
        ...(categoriaId ? { categoriaId } : {}),
        ...(q
          ? {
              OR: [
                { descripcion: { contains: q, mode: "insensitive" } },
                { codigo: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ categoria: { nombre: "asc" } }, { descripcion: "asc" }],
      include: {
        categoria: { select: { nombre: true } },
        precios: {
          where: { estado: "vigente" },
          orderBy: { precio: "asc" },
          include: { proveedor: { select: { nombre: true } } },
        },
      },
    }),
    categoriaId
      ? prisma.categoriaInsumo.findUnique({ where: { id: categoriaId }, select: { nombre: true } })
      : null,
  ]);

  const items = insumos.map((ins) => {
    const precioRef =
      (ins.precioSeleccionadoId
        ? ins.precios.find((p) => p.id === ins.precioSeleccionadoId)
        : undefined) ??
      ins.precios[0] ??
      null;

    return {
      codigo: ins.codigo,
      descripcion: ins.descripcion,
      categoria: ins.categoria.nombre,
      unidadMedida: ins.unidadMedida,
      precioRef: precioRef ? Number(precioRef.precio) : (ins.precioBase ? Number(ins.precioBase) : null),
      proveedorRef: precioRef?.proveedor?.nombre ?? null,
      espesormm: ins.espesormm,
      altoM: ins.altoM,
      anchoM: ins.anchoM,
      cantidadPrecios: ins.precios.length,
    };
  });

  const conDimensiones = items.some((i) => i.altoM || i.anchoM || i.espesormm);

  const filtrosParts: string[] = [];
  if (q) filtrosParts.push(`Búsqueda: "${q}"`);
  if (categoriaData) filtrosParts.push(`Categoría: ${categoriaData.nombre}`);
  if (estadoFiltro === "inactivo") filtrosParts.push("Inactivos");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(ReporteInsumos as any, {
    insumos: items,
    fecha: new Date().toLocaleDateString("es-AR"),
    filtros: filtrosParts.join(" · "),
    total: items.length,
    conDimensiones,
  });

  const buffer = await renderToBuffer(el as Parameters<typeof renderToBuffer>[0]);
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="insumos-${fecha}.pdf"`,
    },
  });
}
