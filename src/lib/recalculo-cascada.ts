import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { calcularPorcentajePlaca, calcularCostoMaterial } from "./calculo-costos";

export interface ResultadoMueble {
  muebleId: string;
  nombre: string;
  codigo: string;
  costoAnterior: number;
  costoNuevo: number;
  variacionPct: number | null;
}

export interface ResultadoCascada {
  muebleAfectados: number;
  lineasActualizadas: number;
  resultados: ResultadoMueble[];
}

/**
 * Dado un cambio de precio en un insumo, recalcula el costo de todos los
 * muebles que lo usan en su despiece.
 *
 * - Para materiales tipo "placa": recalcula vía porcentaje de placa.
 * - Para el resto: cantidad × nuevoPrecio.
 * - Actualiza costoUnitario y costoTotal en cada línea.
 * - Actualiza costoActual en cada mueble afectado.
 *
 * Retorna un resumen con los muebles afectados y sus variaciones de costo.
 */
export async function recalcularCascada(
  insumoId: string,
  nuevoPrecio: number,
  factorDesperdicio: number
): Promise<ResultadoCascada> {
  // 1. Obtener todas las líneas de despiece vinculadas al insumo
  const [materiales, insumosLineas] = await Promise.all([
    prisma.despieceMaterial.findMany({
      where: { insumoId },
      include: {
        insumo: {
          select: { unidadMedida: true, altoM: true, anchoM: true },
        },
      },
    }),
    prisma.despieceInsumo.findMany({
      where: { insumoId },
    }),
  ]);

  let lineasActualizadas = 0;

  // 2. Recalcular y actualizar materiales
  for (const m of materiales) {
    let nuevoCostoTotal: number;

    const esPlaca =
      m.insumo?.unidadMedida === "placa" &&
      m.insumo?.altoM != null &&
      m.insumo?.anchoM != null &&
      m.medidas;

    if (esPlaca) {
      const match = (m.medidas ?? "")
        .replace(",", ".")
        .match(/^(\d+(?:\.\d+)?)[xX×*](\d+(?:\.\d+)?)$/);
      if (match) {
        const altoCm = parseFloat(match[1]);
        const anchoCm = parseFloat(match[2]);
        const pct = calcularPorcentajePlaca(
          Number(m.cantidad),
          altoCm,
          anchoCm,
          m.insumo!.altoM!,
          m.insumo!.anchoM!,
          factorDesperdicio
        );
        nuevoCostoTotal = calcularCostoMaterial(pct, nuevoPrecio);
      } else {
        // medidas no parseables → fallback a unitario
        nuevoCostoTotal = Number(m.cantidad) * nuevoPrecio;
      }
    } else {
      nuevoCostoTotal = Number(m.cantidad) * nuevoPrecio;
    }

    await prisma.despieceMaterial.update({
      where: { id: m.id },
      data: {
        costoUnitario: new Decimal(nuevoPrecio),
        costoTotal: new Decimal(nuevoCostoTotal),
      },
    });
    lineasActualizadas++;
  }

  // 3. Recalcular y actualizar insumos de despiece
  for (const ins of insumosLineas) {
    const nuevoCostoTotal = Number(ins.cantidad) * nuevoPrecio;
    await prisma.despieceInsumo.update({
      where: { id: ins.id },
      data: {
        costoUnitario: new Decimal(nuevoPrecio),
        costoTotal: new Decimal(nuevoCostoTotal),
      },
    });
    lineasActualizadas++;
  }

  // 4. IDs únicos de muebles afectados
  const muebleIdsSet = new Set<string>([
    ...materiales.map((m) => m.muebleId),
    ...insumosLineas.map((i) => i.muebleId),
  ]);

  const resultados: ResultadoMueble[] = [];

  // 5. Recalcular costoActual de cada mueble
  for (const muebleId of muebleIdsSet) {
    const [mueble, todasMateriales, todosInsumos] = await Promise.all([
      prisma.mueble.findUnique({
        where: { id: muebleId },
        select: { nombre: true, codigo: true, costoActual: true },
      }),
      prisma.despieceMaterial.findMany({ where: { muebleId } }),
      prisma.despieceInsumo.findMany({ where: { muebleId } }),
    ]);

    if (!mueble) continue;

    const costoAnterior = Number(mueble.costoActual);
    const costoNuevo =
      todasMateriales.reduce((s, m) => s + Number(m.costoTotal), 0) +
      todosInsumos.reduce((s, i) => s + Number(i.costoTotal), 0);

    await prisma.mueble.update({
      where: { id: muebleId },
      data: { costoActual: new Decimal(costoNuevo) },
    });

    resultados.push({
      muebleId,
      nombre: mueble.nombre,
      codigo: mueble.codigo,
      costoAnterior,
      costoNuevo,
      variacionPct:
        costoAnterior > 0
          ? ((costoNuevo - costoAnterior) / costoAnterior) * 100
          : null,
    });
  }

  return {
    muebleAfectados: muebleIdsSet.size,
    lineasActualizadas,
    resultados,
  };
}
