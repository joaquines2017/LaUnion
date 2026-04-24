import { prisma } from "@/lib/prisma";
import { calcularPorcentajePlaca, calcularCostoMaterial } from "@/lib/calculo-costos";

export interface CorteCoincidente {
  despieceMaterialId: string;
  pieza: string;
  insumoNombre: string;  // nombre del insumo especificado en el despiece
  altoCm: number;
  anchoCm: number;
  cantidad: number;
  rotado: boolean;
  ahorroEstimado: number;
}

export interface ResultadoMueble {
  muebleId: string;
  muebleNombre: string;
  muebleCodigo: string;
  cortes: CorteCoincidente[];
  ahorroTotal: number;
  cantidadAsignada: number; // retazos asignados desde ESTE residual a este mueble
}

export interface ResultadoComparacion {
  porMueble: ResultadoMueble[];
  totalCortes: number;
  totalAhorro: number;
  cantidadDisponible: number; // capacidad efectiva: residual.cantidad + cantidadUsada
  cantidadUsada: number;      // retazos ya asignados desde este residual
}

// Acepta coma o punto como decimal y espacios alrededor del separador
const MEDIDAS_RE = /^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)$/;

function getPrecioInsumo(insumo: {
  precioBase: unknown;
  precioSeleccionadoId: string | null;
  precios: { id: string; precio: unknown }[];
}): number {
  let precio = 0;
  if (insumo.precioSeleccionadoId) {
    const sel = insumo.precios.find((p) => p.id === insumo.precioSeleccionadoId);
    if (sel) precio = Number(sel.precio);
  }
  if (precio === 0 && insumo.precios[0]) precio = Number(insumo.precios[0].precio);
  if (precio === 0 && insumo.precioBase != null) precio = Number(insumo.precioBase);
  return precio;
}

export async function compararResidual(
  insumoId: string,
  retazoAltoCm: number,
  retazoAnchoCm: number,
  factorDesperdicio: number,
  residualId?: string,
  cantidadRetazo: number = 1,
): Promise<ResultadoComparacion> {
  // Datos del insumo del retazo (para verificar espesormm)
  const insumoRetazo = await prisma.insumo.findUnique({
    where: { id: insumoId },
    select: { espesormm: true, altoM: true, anchoM: true },
  });

  if (!insumoRetazo || !insumoRetazo.altoM || !insumoRetazo.anchoM) {
    return { porMueble: [], totalCortes: 0, totalAhorro: 0, cantidadDisponible: cantidadRetazo, cantidadUsada: 0 };
  }

  // Buscar todos los insumos compatibles (mismo espesormm si existe, o exacto si no)
  // Un retazo de 18mm puede servir para cualquier pieza especificada en 18mm, sin importar el tipo exacto
  const insumosFiltro = insumoRetazo.espesormm != null
    ? await prisma.insumo.findMany({
        where: {
          espesormm: insumoRetazo.espesormm,
          altoM: { not: null },
          anchoM: { not: null },
        },
        select: {
          id: true,
          descripcion: true,
          altoM: true,
          anchoM: true,
          precioBase: true,
          precioSeleccionadoId: true,
          precios: {
            where: { estado: "vigente" },
            orderBy: { precio: "asc" },
            take: 1,
            select: { id: true, precio: true },
          },
        },
      })
    : await prisma.insumo.findMany({
        where: { id: insumoId },
        select: {
          id: true,
          descripcion: true,
          altoM: true,
          anchoM: true,
          precioBase: true,
          precioSeleccionadoId: true,
          precios: {
            where: { estado: "vigente" },
            orderBy: { precio: "asc" },
            take: 1,
            select: { id: true, precio: true },
          },
        },
      });

  if (insumosFiltro.length === 0) {
    return { porMueble: [], totalCortes: 0, totalAhorro: 0, cantidadDisponible: cantidadRetazo, cantidadUsada: 0 };
  }

  const insumoDataMap = new Map(insumosFiltro.map((i) => [i.id, i]));
  const insumoIds = insumosFiltro.map((i) => i.id);

  // Materiales del despiece de muebles activos con insumos compatibles
  const materiales = await prisma.despieceMaterial.findMany({
    where: {
      insumoId: { in: insumoIds },
      mueble: { estado: "activo" },
      medidas: { not: null },
    },
    select: {
      id: true,
      muebleId: true,
      insumoId: true,
      productoNombre: true,
      medidas: true,
      cantidad: true,
      mueble: { select: { nombre: true, codigo: true } },
    },
  });

  // Asignaciones actuales de este residual por mueble
  const asignacionesActuales = residualId
    ? await prisma.reservaResidual.findMany({
        where: { materialResidualId: residualId },
        select: { muebleId: true, cantidadAsignada: true },
      })
    : [];
  const asignacionMap = new Map<string, number>(
    asignacionesActuales.map((a) => [a.muebleId, a.cantidadAsignada])
  );

  // Agrupar cortes por mueble
  const porMuebleMap = new Map<string, {
    muebleNombre: string;
    muebleCodigo: string;
    cortes: CorteCoincidente[];
  }>();

  for (const m of materiales) {
    const medidasNorm = (m.medidas ?? "").trim().replace(/,/g, ".");
    const match = medidasNorm.match(MEDIDAS_RE);
    if (!match) continue;

    const cutAlto = parseFloat(match[1]);
    const cutAncho = parseFloat(match[2]);
    const cantidad = Number(m.cantidad);

    const entraNormal = cutAlto <= retazoAltoCm && cutAncho <= retazoAnchoCm;
    const entraRotado = cutAlto <= retazoAnchoCm && cutAncho <= retazoAltoCm;
    if (!entraNormal && !entraRotado) continue;

    // Calcular ahorro usando los datos del insumo especificado en el despiece
    const insumoDespiece = m.insumoId ? insumoDataMap.get(m.insumoId) : undefined;
    const altoPlaca = insumoDespiece?.altoM ?? insumoRetazo.altoM!;
    const anchoPlaca = insumoDespiece?.anchoM ?? insumoRetazo.anchoM!;
    const precio = insumoDespiece ? getPrecioInsumo(insumoDespiece) : 0;

    const pct = calcularPorcentajePlaca(
      cantidad, cutAlto, cutAncho,
      altoPlaca, anchoPlaca, factorDesperdicio
    );

    const corte: CorteCoincidente = {
      despieceMaterialId: m.id,
      pieza: m.productoNombre,
      insumoNombre: insumoDespiece?.descripcion ?? "",
      altoCm: cutAlto,
      anchoCm: cutAncho,
      cantidad,
      rotado: !entraNormal && entraRotado,
      ahorroEstimado: calcularCostoMaterial(pct, precio),
    };

    if (!porMuebleMap.has(m.muebleId)) {
      porMuebleMap.set(m.muebleId, {
        muebleNombre: m.mueble.nombre,
        muebleCodigo: m.mueble.codigo,
        cortes: [],
      });
    }
    porMuebleMap.get(m.muebleId)!.cortes.push(corte);
  }

  const porMueble: ResultadoMueble[] = Array.from(porMuebleMap.entries())
    .map(([muebleId, { muebleNombre, muebleCodigo, cortes }]) => ({
      muebleId,
      muebleNombre,
      muebleCodigo,
      cortes,
      ahorroTotal: cortes.reduce((s, c) => s + c.ahorroEstimado, 0),
      cantidadAsignada: asignacionMap.get(muebleId) ?? 0,
    }))
    .sort((a, b) => b.ahorroTotal - a.ahorroTotal);

  const cantidadUsada = asignacionesActuales.reduce((s, a) => s + a.cantidadAsignada, 0);
  const cantidadDisponible = cantidadRetazo + cantidadUsada;
  const totalCortes = Array.from(porMuebleMap.values()).reduce((s, g) => s + g.cortes.length, 0);

  return {
    porMueble,
    totalCortes,
    totalAhorro: porMueble.reduce((s, g) => s + g.ahorroTotal, 0),
    cantidadDisponible,
    cantidadUsada,
  };
}
