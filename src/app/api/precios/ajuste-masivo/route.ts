import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { z } from "zod";
import { recalcularCascada } from "@/lib/recalculo-cascada";
import { registrarLog } from "@/lib/auditoria";

const schema = z.object({
  operacion: z.enum(["aumentar", "reducir"]),
  tipo: z.enum(["porcentaje", "monto"]),
  valor: z.number().positive(),
  redondeo: z.enum(["ninguno", "entero", "decena", "centena"]),
  proveedorId: z.string().uuid().optional(),
  categoriaId: z.string().uuid().optional(),
  q: z.string().optional(),
});

function calcularNuevoPrecio(
  actual: number,
  operacion: string,
  tipo: string,
  valor: number,
  redondeo: string
): number {
  let nuevo =
    tipo === "porcentaje"
      ? operacion === "aumentar"
        ? actual * (1 + valor / 100)
        : actual * (1 - valor / 100)
      : operacion === "aumentar"
      ? actual + valor
      : actual - valor;

  if (redondeo === "entero") nuevo = Math.round(nuevo);
  else if (redondeo === "decena") nuevo = Math.round(nuevo / 10) * 10;
  else if (redondeo === "centena") nuevo = Math.round(nuevo / 100) * 100;

  return Math.max(nuevo, 0.01);
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId, session } = ctx;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { operacion, tipo, valor, redondeo, proveedorId, categoriaId, q } = parsed.data;
  const usuarioId = (session.user as { id?: string }).id ?? "sistema";

  const precios = await prisma.precioProveedor.findMany({
    where: {
      estado: "vigente",
      ...(proveedorId ? { proveedorId } : {}),
      insumo: {
        empresaId,
        estado: "activo",
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
    },
    include: {
      insumo: { select: { id: true, precioSeleccionadoId: true } },
    },
  });

  if (precios.length === 0) {
    return NextResponse.json({ actualizados: 0, lineasActualizadas: 0 });
  }

  const updates = precios.map((p) => ({
    id: p.id,
    insumoId: p.insumoId,
    precioAnterior: Number(p.precio),
    precioNuevo: calcularNuevoPrecio(Number(p.precio), operacion, tipo, valor, redondeo),
    precioSeleccionadoId: p.insumo.precioSeleccionadoId,
  }));

  await prisma.$transaction([
    ...updates.map((u) =>
      prisma.precioProveedor.update({
        where: { id: u.id },
        data: { precio: u.precioNuevo, fechaVigencia: new Date() },
      })
    ),
    ...updates.map((u) =>
      prisma.historialPrecio.create({
        data: {
          precioProveedorId: u.id,
          precioAnterior: u.precioAnterior,
          precioNuevo: u.precioNuevo,
          usuarioId,
        },
      })
    ),
  ]);

  registrarLog({
    usuarioId,
    accion: "AJUSTE_MASIVO_PRECIOS",
    entidad: "PrecioProveedor",
    entidadId: "bulk",
    empresaId,
    datosNuevos: { operacion, tipo, valor, redondeo, cantidad: updates.length },
  });

  // Recálculo en cascada por insumo único
  const config = await prisma.configuracionGlobal.findUnique({ where: { empresaId } });
  const factorDesperdicio = Number(config?.factorDesperdicio ?? 1.1);

  const porInsumo = new Map<
    string,
    { precioId: string; precioNuevo: number; precioSeleccionadoId: string | null }[]
  >();
  for (const u of updates) {
    if (!porInsumo.has(u.insumoId)) porInsumo.set(u.insumoId, []);
    porInsumo.get(u.insumoId)!.push({
      precioId: u.id,
      precioNuevo: u.precioNuevo,
      precioSeleccionadoId: u.precioSeleccionadoId,
    });
  }

  let lineasActualizadas = 0;
  for (const [insumoId, items] of porInsumo) {
    try {
      const seleccionadoId = items[0].precioSeleccionadoId;
      let precioParaCascada: number | null = null;

      if (seleccionadoId) {
        const actualizado = items.find((p) => p.precioId === seleccionadoId);
        if (actualizado) precioParaCascada = actualizado.precioNuevo;
      } else {
        const min = await prisma.precioProveedor.findFirst({
          where: { insumoId, estado: "vigente" },
          orderBy: { precio: "asc" },
        });
        if (min) precioParaCascada = Number(min.precio);
      }

      if (precioParaCascada !== null) {
        const result = await recalcularCascada(insumoId, precioParaCascada, factorDesperdicio);
        lineasActualizadas += result?.lineasActualizadas ?? 0;
      }
    } catch {
      // cascade error no es fatal
    }
  }

  return NextResponse.json({ actualizados: updates.length, lineasActualizadas });
}
