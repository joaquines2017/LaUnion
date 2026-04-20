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
  cantidad: number;
  rotado: boolean;
  ahorroEstimado: number;
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
}

const MEDIDAS_RE = /^(\d+(?:\.\d+)?)[xX×*](\d+(?:\.\d+)?)$/;

export async function compararResidual(
  insumoId: string,
  retazoAltoCm: number,
  retazoAnchoCm: number,
  factorDesperdicio: number
): Promise<ResultadoComparacion> {
  // Obtener insumo con dimensiones y precio
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
    return { porMueble: [], totalCortes: 0, totalAhorro: 0 };
  }

  // Determinar precio de referencia del insumo
  let precioInsumo = 0;
  if (insumo.precioSeleccionadoId) {
    const seleccionado = insumo.precios.find(
      (p) => p.id === insumo.precioSeleccionadoId
    );
    if (seleccionado) precioInsumo = Number(seleccionado.precio);
  }
  if (precioInsumo === 0 && insumo.precios[0]) {
    precioInsumo = Number(insumo.precios[0].precio);
  }
  if (precioInsumo === 0 && insumo.precioBase != null) {
    precioInsumo = Number(insumo.precioBase);
  }

  // Buscar piezas del despiece de muebles activos que usen este insumo
  const materiales = await prisma.despieceMaterial.findMany({
    where: {
      insumoId,
      mueble: { estado: "activo" },
      medidas: { not: null },
    },
    select: {
      id: true,
      muebleId: true,
      productoNombre: true,
      medidas: true,
      cantidad: true,
      mueble: { select: { nombre: true, codigo: true } },
    },
  });

  const coincidencias: CorteCoincidente[] = [];

  for (const m of materiales) {
    const match = (m.medidas ?? "").replace(",", ".").match(MEDIDAS_RE);
    if (!match) continue;

    const cutAlto = parseFloat(match[1]);
    const cutAncho = parseFloat(match[2]);
    const cantidad = Number(m.cantidad);

    const entranormal =
      cutAlto <= retazoAltoCm && cutAncho <= retazoAnchoCm;
    const entraRotado =
      cutAlto <= retazoAnchoCm && cutAncho <= retazoAltoCm;

    if (!entranormal && !entraRotado) continue;

    const rotado = !entranormal && entraRotado;
    const pct = calcularPorcentajePlaca(
      cantidad,
      cutAlto,
      cutAncho,
      insumo.altoM!,
      insumo.anchoM!,
      factorDesperdicio
    );
    const ahorro = calcularCostoMaterial(pct, precioInsumo);

    coincidencias.push({
      despieceMaterialId: m.id,
      muebleId: m.muebleId,
      muebleNombre: m.mueble.nombre,
      muebleCodigo: m.mueble.codigo,
      pieza: m.productoNombre,
      altoCm: cutAlto,
      anchoCm: cutAncho,
      cantidad,
      rotado,
      ahorroEstimado: ahorro,
    });
  }

  // Agrupar por mueble
  const porMuebleMap = new Map<string, typeof coincidencias>();
  for (const c of coincidencias) {
    if (!porMuebleMap.has(c.muebleId)) porMuebleMap.set(c.muebleId, []);
    porMuebleMap.get(c.muebleId)!.push(c);
  }

  const porMueble = Array.from(porMuebleMap.entries()).map(
    ([muebleId, cortes]) => ({
      muebleId,
      muebleNombre: cortes[0].muebleNombre,
      muebleCodigo: cortes[0].muebleCodigo,
      cortes,
      ahorroTotal: cortes.reduce((s, c) => s + c.ahorroEstimado, 0),
    })
  );

  porMueble.sort((a, b) => b.ahorroTotal - a.ahorroTotal);

  return {
    porMueble,
    totalCortes: coincidencias.length,
    totalAhorro: coincidencias.reduce((s, c) => s + c.ahorroEstimado, 0),
  };
}
