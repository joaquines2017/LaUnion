import { prisma } from "@/lib/prisma";
import { calcularPorcentajePlaca, calcularCostoMaterial } from "@/lib/calculo-costos";

export interface CorteCoincidente {
  despieceMaterialId: string;
  muebleId: string;
  muebleNombre: string;
  muebleCodigo: string;
  pieza: string;
  altoCm: number;
  anchoCm: number;
  cantidad: number;           // total de piezas que necesita el mueble
  rotado: boolean;
  ahorroEstimado: number;
  cantidadEnActual: number;   // piezas asignadas desde ESTE retazo (0 = ninguna)
  cantidadEnOtros: number;    // piezas asignadas desde OTROS retazos
  reservadoEnActual: boolean; // = cantidadEnActual > 0 (para compatibilidad UI)
}

export interface ResultadoComparacion {
  porMueble: {
    muebleId: string;
    muebleNombre: string;
    muebleCodigo: string;
    cortes: CorteCoincidente[];
    ahorroTotal: number;
  }[];
  totalCortes: number;
  totalAhorro: number;
  cortesReservados: number;
  cantidadDisponible: number;   // capacidad efectiva para este retazo
  cantidadUsada: number;        // piezas ya asignadas desde este retazo
}

// Acepta coma o punto como decimal y espacios alrededor del separador
const MEDIDAS_RE = /^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)$/;

export async function compararResidual(
  insumoId: string,
  retazoAltoCm: number,
  retazoAnchoCm: number,
  factorDesperdicio: number,
  residualId?: string,
  cantidadRetazo: number = 1,
): Promise<ResultadoComparacion> {
  const insumo = await prisma.insumo.findUnique({
    where: { id: insumoId },
    select: {
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

  if (!insumo || !insumo.altoM || !insumo.anchoM) {
    return { porMueble: [], totalCortes: 0, totalAhorro: 0, cortesReservados: 0, cantidadDisponible: cantidadRetazo, cantidadUsada: 0 };
  }

  // Precio de referencia
  let precioInsumo = 0;
  if (insumo.precioSeleccionadoId) {
    const sel = insumo.precios.find((p) => p.id === insumo.precioSeleccionadoId);
    if (sel) precioInsumo = Number(sel.precio);
  }
  if (precioInsumo === 0 && insumo.precios[0]) precioInsumo = Number(insumo.precios[0].precio);
  if (precioInsumo === 0 && insumo.precioBase != null) precioInsumo = Number(insumo.precioBase);

  // Materiales del despiece de muebles activos con este insumo
  const materiales = await prisma.despieceMaterial.findMany({
    where: { insumoId, mueble: { estado: "activo" }, medidas: { not: null } },
    select: {
      id: true,
      muebleId: true,
      productoNombre: true,
      medidas: true,
      cantidad: true,
      mueble: { select: { nombre: true, codigo: true } },
      reservasResiduales: {
        select: { materialResidualId: true, cantidadAsignada: true },
      },
    },
  });

  const coincidencias: CorteCoincidente[] = [];

  for (const m of materiales) {
    // Normalizar: reemplazar comas por puntos y recortar espacios
    const medidasNorm = (m.medidas ?? "").trim().replace(/,/g, ".");
    const match = medidasNorm.match(MEDIDAS_RE);
    if (!match) continue;

    const cutAlto = parseFloat(match[1]);
    const cutAncho = parseFloat(match[2]);
    const cantidad = Number(m.cantidad);

    const entraNormal = cutAlto <= retazoAltoCm && cutAncho <= retazoAnchoCm;
    const entraRotado = cutAlto <= retazoAnchoCm && cutAncho <= retazoAltoCm;
    if (!entraNormal && !entraRotado) continue;

    const pct = calcularPorcentajePlaca(
      cantidad, cutAlto, cutAncho,
      insumo.altoM!, insumo.anchoM!, factorDesperdicio
    );

    const reservaActual = residualId
      ? m.reservasResiduales.find((r) => r.materialResidualId === residualId)
      : undefined;
    const cantidadEnActual = reservaActual?.cantidadAsignada ?? 0;
    const cantidadEnOtros = m.reservasResiduales
      .filter((r) => r.materialResidualId !== residualId)
      .reduce((s, r) => s + r.cantidadAsignada, 0);

    coincidencias.push({
      despieceMaterialId: m.id,
      muebleId: m.muebleId,
      muebleNombre: m.mueble.nombre,
      muebleCodigo: m.mueble.codigo,
      pieza: m.productoNombre,
      altoCm: cutAlto,
      anchoCm: cutAncho,
      cantidad,
      rotado: !entraNormal && entraRotado,
      ahorroEstimado: calcularCostoMaterial(pct, precioInsumo),
      cantidadEnActual,
      cantidadEnOtros,
      reservadoEnActual: cantidadEnActual > 0,
    });
  }

  // Agrupar por mueble
  const porMuebleMap = new Map<string, CorteCoincidente[]>();
  for (const c of coincidencias) {
    if (!porMuebleMap.has(c.muebleId)) porMuebleMap.set(c.muebleId, []);
    porMuebleMap.get(c.muebleId)!.push(c);
  }

  const porMueble = Array.from(porMuebleMap.entries())
    .map(([muebleId, cortes]) => ({
      muebleId,
      muebleNombre: cortes[0].muebleNombre,
      muebleCodigo: cortes[0].muebleCodigo,
      cortes,
      ahorroTotal: cortes.reduce((s, c) => s + c.ahorroEstimado, 0),
    }))
    .sort((a, b) => b.ahorroTotal - a.ahorroTotal);

  const cortesReservados = coincidencias.filter((c) => c.cantidadEnActual > 0).length;
  const cantidadUsada = coincidencias.reduce((s, c) => s + c.cantidadEnActual, 0);
  const cantidadDisponible = cantidadRetazo + cantidadUsada;

  return {
    porMueble,
    totalCortes: coincidencias.length,
    totalAhorro: coincidencias.reduce((s, c) => s + c.ahorroEstimado, 0),
    cortesReservados,
    cantidadDisponible,
    cantidadUsada,
  };
}
