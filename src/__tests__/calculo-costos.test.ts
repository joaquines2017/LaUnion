import { describe, it, expect } from "vitest";
import {
  calcularPorcentajePlaca,
  calcularCostoMaterial,
  calcularCostoInsumo,
  calcularCostoTotal,
  formatearPorcentaje,
} from "@/lib/calculo-costos";

describe("calcularPorcentajePlaca", () => {
  // Placa estándar 283×183 cm (2.83m × 1.83m)
  const PLACA_ALTO = 2.83;
  const PLACA_ANCHO = 1.83;
  const FACTOR = 1.1;

  it("calcula el porcentaje correcto para una pieza", () => {
    // 1 pieza de 90×43 cm en placa 283×183 cm, factor 1.10
    const pct = calcularPorcentajePlaca(1, 90, 43, PLACA_ALTO, PLACA_ANCHO, FACTOR);
    // Superficie pieza = 3870 cm², superficie placa = 51789 cm²
    // pct = (3870 / 51789) * 1.10 ≈ 0.08222
    expect(pct).toBeCloseTo(0.0822, 3);
  });

  it("multiplica correctamente por cantidad", () => {
    const pct1 = calcularPorcentajePlaca(1, 90, 43, PLACA_ALTO, PLACA_ANCHO, FACTOR);
    const pct3 = calcularPorcentajePlaca(3, 90, 43, PLACA_ALTO, PLACA_ANCHO, FACTOR);
    expect(pct3).toBeCloseTo(pct1 * 3, 6);
  });

  it("aplica el factor de desperdicio correctamente", () => {
    const sin_factor = calcularPorcentajePlaca(1, 90, 43, PLACA_ALTO, PLACA_ANCHO, 1.0);
    const con_factor = calcularPorcentajePlaca(1, 90, 43, PLACA_ALTO, PLACA_ANCHO, 1.1);
    expect(con_factor).toBeCloseTo(sin_factor * 1.1, 6);
  });

  it("retorna 0 si la superficie de placa es 0", () => {
    expect(calcularPorcentajePlaca(1, 90, 43, 0, 1.83, 1.1)).toBe(0);
    expect(calcularPorcentajePlaca(1, 90, 43, 2.83, 0, 1.1)).toBe(0);
  });

  it("puede superar 1 si la pieza es más grande que la placa", () => {
    // Pieza de 300×200 cm en placa 283×183 cm → supera el 100%
    const pct = calcularPorcentajePlaca(1, 300, 200, PLACA_ALTO, PLACA_ANCHO, 1.0);
    expect(pct).toBeGreaterThan(1);
  });

  it("retorna 0 para piezas de tamaño 0", () => {
    expect(calcularPorcentajePlaca(0, 90, 43, PLACA_ALTO, PLACA_ANCHO, 1.1)).toBe(0);
    expect(calcularPorcentajePlaca(1, 0, 43, PLACA_ALTO, PLACA_ANCHO, 1.1)).toBe(0);
    expect(calcularPorcentajePlaca(1, 90, 0, PLACA_ALTO, PLACA_ANCHO, 1.1)).toBe(0);
  });
});

describe("calcularCostoMaterial", () => {
  it("multiplica porcentaje por precio de placa", () => {
    expect(calcularCostoMaterial(0.5, 100_000)).toBe(50_000);
    expect(calcularCostoMaterial(1.0, 80_000)).toBe(80_000);
    expect(calcularCostoMaterial(0, 100_000)).toBe(0);
  });

  it("maneja precio 0", () => {
    expect(calcularCostoMaterial(0.5, 0)).toBe(0);
  });

  it("es lineal respecto al precio", () => {
    const pct = 0.25;
    const precio1 = 60_000;
    const precio2 = 120_000;
    expect(calcularCostoMaterial(pct, precio2)).toBeCloseTo(
      calcularCostoMaterial(pct, precio1) * 2,
      2
    );
  });
});

describe("calcularCostoInsumo", () => {
  it("multiplica cantidad por precio unitario", () => {
    expect(calcularCostoInsumo(4, 250)).toBe(1000);
    expect(calcularCostoInsumo(1, 5000)).toBe(5000);
    expect(calcularCostoInsumo(0, 5000)).toBe(0);
  });

  it("maneja cantidades decimales", () => {
    expect(calcularCostoInsumo(2.5, 200)).toBe(500);
  });
});

describe("calcularCostoTotal", () => {
  it("suma todos los ítems", () => {
    expect(calcularCostoTotal([1000, 2000, 3000])).toBe(6000);
  });

  it("retorna 0 para array vacío", () => {
    expect(calcularCostoTotal([])).toBe(0);
  });

  it("maneja un solo ítem", () => {
    expect(calcularCostoTotal([42_000])).toBe(42_000);
  });

  it("maneja valores decimales", () => {
    expect(calcularCostoTotal([1000.5, 999.5])).toBe(2000);
  });
});

describe("formatearPorcentaje", () => {
  it("convierte fracción a porcentaje con 2 decimales", () => {
    expect(formatearPorcentaje(0.2466)).toBe("24.66%");
    expect(formatearPorcentaje(1.0)).toBe("100.00%");
    expect(formatearPorcentaje(0)).toBe("0.00%");
  });

  it("maneja valores mayores a 1", () => {
    expect(formatearPorcentaje(1.5)).toBe("150.00%");
  });
});
