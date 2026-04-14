/**
 * Motor de cálculo de costos para despieces de muebles.
 * Todas las funciones son puras y testeables de forma independiente.
 */

/**
 * Calcula el porcentaje de placa que consume un conjunto de piezas.
 *
 * @param cantidad      - Número de piezas del mismo corte
 * @param altoCm        - Alto de cada pieza en centímetros
 * @param anchoCm       - Ancho de cada pieza en centímetros
 * @param placaAltoM    - Alto de la placa estándar en metros
 * @param placaAnchoM   - Ancho de la placa estándar en metros
 * @param factorDesperdicio - Factor de merma, ej: 1.10 = 10% extra
 * @returns Porcentaje de placa consumida (0–N, puede superar 1 si se necesitan más de una placa)
 *
 * Ejemplo: 3 piezas de 90×43 cm en placa 283×183 cm, factor 1.10 → 0.2466
 */
export function calcularPorcentajePlaca(
  cantidad: number,
  altoCm: number,
  anchoCm: number,
  placaAltoM: number,
  placaAnchoM: number,
  factorDesperdicio: number
): number {
  const superficieCorte = cantidad * altoCm * anchoCm; // cm²
  const superficiePlaca = placaAltoM * 100 * (placaAnchoM * 100); // cm²
  if (superficiePlaca === 0) return 0;
  return (superficieCorte / superficiePlaca) * factorDesperdicio;
}

/**
 * Calcula el costo de un material tipo placa.
 *
 * @param porcentajePlaca - Resultado de calcularPorcentajePlaca (0–N)
 * @param precioPlaca     - Precio de la placa completa
 */
export function calcularCostoMaterial(
  porcentajePlaca: number,
  precioPlaca: number
): number {
  return porcentajePlaca * precioPlaca;
}

/**
 * Calcula el costo de un insumo genérico (herraje, flete, etc.).
 *
 * @param cantidad   - Cantidad de unidades
 * @param precioUnit - Precio unitario
 */
export function calcularCostoInsumo(cantidad: number, precioUnit: number): number {
  return cantidad * precioUnit;
}

/**
 * Suma los costos de todos los ítems del despiece.
 *
 * @param items - Array de costos parciales
 */
export function calcularCostoTotal(items: number[]): number {
  return items.reduce((acc, c) => acc + c, 0);
}

/**
 * Formatea un porcentaje de placa para mostrar en la UI.
 * Ejemplo: 0.2466 → "24.66%"
 */
export function formatearPorcentaje(valor: number): string {
  return (valor * 100).toFixed(2) + "%";
}
