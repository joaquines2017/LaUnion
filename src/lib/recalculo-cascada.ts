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

  // 2. Recalcular materiales y actualizar todas las líneas en paralelo
  await Promise.all(
    materiales.map((m) => {
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

      return prisma.despieceMaterial.update({
        where: { id: m.id },
        data: {
          costoUnitario: new Decimal(nuevoPrecio),
          costoTotal: new Decimal(nuevoCostoTotal),
        },
      });
    })
  );

  // 3. Recalcular insumos de despiece y actualizar todas las líneas en paralelo
  await Promise.all(
    insumosLineas.map((ins) => {
      const nuevoCostoTotal = Number(ins.cantidad) * nuevoPrecio;
      return prisma.despieceInsumo.update({
        where: { id: ins.id },
        data: {
          costoUnitario: new Decimal(nuevoPrecio),
          costoTotal: new Decimal(nuevoCostoTotal),
        },
      });
    })
  );

  const lineasActualizadas = materiales.length + insumosLineas.length;

  // 4. IDs únicos de muebles afectados
  const muebleIds = [
    ...new Set<string>([
      ...materiales.map((m) => m.muebleId),
      ...insumosLineas.map((i) => i.muebleId),
    ]),
  ];

  if (muebleIds.length === 0) {
    return { muebleAfectados: 0, lineasActualizadas, resultados: [] };
  }

  // 5. Fetch masivo: muebles afectados + TODAS sus líneas de despiece
  // (3 queries en total, sin importar cuántos muebles haya, en vez de 3×N)
  const [muebles, todasMaterialesPorMueble, todosInsumosPorMueble] =
    await Promise.all([
      prisma.mueble.findMany({
        where: { id: { in: muebleIds } },
        select: { id: true, nombre: true, codigo: true, costoActual: true },
      }),
      prisma.despieceMaterial.findMany({
        where: { muebleId: { in: muebleIds } },
        select: { muebleId: true, costoTotal: true },
      }),
      prisma.despieceInsumo.findMany({
        where: { muebleId: { in: muebleIds } },
        select: { muebleId: true, costoTotal: true },
      }),
    ]);

  // 6. Agrupar costos por mueble en memoria
  const costoNuevoPorMueble = new Map<string, number>();
  for (const m of todasMaterialesPorMueble) {
    costoNuevoPorMueble.set(
      m.muebleId,
      (costoNuevoPorMueble.get(m.muebleId) ?? 0) + Number(m.costoTotal)
    );
  }
  for (const i of todosInsumosPorMueble) {
    costoNuevoPorMueble.set(
      i.muebleId,
      (costoNuevoPorMueble.get(i.muebleId) ?? 0) + Number(i.costoTotal)
    );
  }

  const muebleById = new Map(muebles.map((mu) => [mu.id, mu]));

  // 7. Actualizar costoActual de cada mueble en paralelo
  const resultados: ResultadoMueble[] = (
    await Promise.all(
      muebleIds.map(async (muebleId) => {
        const mueble = muebleById.get(muebleId);
        if (!mueble) return null;

        const costoAnterior = Number(mueble.costoActual);
        const costoNuevo = costoNuevoPorMueble.get(muebleId) ?? 0;

        await prisma.mueble.update({
          where: { id: muebleId },
          data: { costoActual: new Decimal(costoNuevo) },
        });

        const resultado: ResultadoMueble = {
          muebleId,
          nombre: mueble.nombre,
          codigo: mueble.codigo,
          costoAnterior,
          costoNuevo,
          variacionPct:
            costoAnterior > 0
              ? ((costoNuevo - costoAnterior) / costoAnterior) * 100
              : null,
        };
        return resultado;
      })
    )
  ).filter((r): r is ResultadoMueble => r !== null);

  return {
    muebleAfectados: muebleIds.length,
    lineasActualizadas,
    resultados,
  };
}
