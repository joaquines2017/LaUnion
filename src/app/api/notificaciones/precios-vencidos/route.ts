import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";

export async function GET() {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const config = await prisma.configuracionGlobal.findUnique({ where: { empresaId } });
  const vigenciaDias = config?.vigenciaPrecioDias ?? 30;
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - vigenciaDias);

  const where = {
    empresaId,
    estado: "activo" as const,
    precioSeleccionado: {
      estado: "vigente" as const,
      fechaVigencia: { lt: fechaLimite },
    },
  };

  const [total, insumos] = await Promise.all([
    prisma.insumo.count({ where }),
    prisma.insumo.findMany({
      where,
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        precioSeleccionado: {
          select: {
            fechaVigencia: true,
            proveedor: { select: { nombre: true } },
          },
        },
      },
      orderBy: { precioSeleccionado: { fechaVigencia: "asc" } },
      take: 20,
    }),
  ]);

  const ahora = Date.now();
  const items = insumos.map((insumo) => {
    const fechaVigencia = insumo.precioSeleccionado!.fechaVigencia;
    const diasVencido = Math.floor(
      (ahora - fechaVigencia.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      insumoId: insumo.id,
      codigo: insumo.codigo,
      descripcion: insumo.descripcion,
      proveedorNombre: insumo.precioSeleccionado!.proveedor.nombre,
      diasVencido,
    };
  });

  return NextResponse.json({ items, total });
}
