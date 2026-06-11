import { describe, it, expect } from "vitest";
import {
  formatearPrecio,
  formatearNumeroInput,
  parsearNumero,
  formatearFecha,
} from "@/lib/formato";

describe("parsearNumero", () => {
  it("parsea enteros simples", () => {
    expect(parsearNumero("1000")).toBe(1000);
    expect(parsearNumero("0")).toBe(0);
  });

  it("parsea con punto como separador decimal (un solo punto, menos de 3 decimales)", () => {
    expect(parsearNumero("78000.50")).toBe(78000.5);
    expect(parsearNumero("1500.5")).toBe(1500.5);
  });

  it("parsea con coma como separador decimal", () => {
    expect(parsearNumero("78000,50")).toBe(78000.5);
    expect(parsearNumero("1500,5")).toBe(1500.5);
  });

  it("parsea formato argentino: punto=miles, coma=decimal", () => {
    expect(parsearNumero("78.000,50")).toBe(78000.5);
    expect(parsearNumero("1.500.000,99")).toBe(1500000.99);
    expect(parsearNumero("2.500")).toBe(2500); // un punto + 3 decimales → separador de miles
  });

  it("parsea múltiples puntos de miles (sin coma)", () => {
    expect(parsearNumero("1.500.000")).toBe(1500000);
  });

  it("ignora espacios al inicio y fin", () => {
    expect(parsearNumero("  1000  ")).toBe(1000);
  });

  it("retorna 0 para string vacío o inválido", () => {
    expect(parsearNumero("")).toBe(0);
    expect(parsearNumero("abc")).toBe(0);
  });

  it("un punto con exactamente 3 decimales se interpreta como miles", () => {
    expect(parsearNumero("1.500")).toBe(1500);
  });

  it("un punto con menos de 3 decimales se interpreta como decimal", () => {
    expect(parsearNumero("1.5")).toBe(1.5);
    expect(parsearNumero("10.50")).toBe(10.5);
  });
});

describe("formatearPrecio", () => {
  it("formatea con símbolo $ y separadores ARS", () => {
    const resultado = formatearPrecio(78000);
    expect(resultado).toContain("$");
    expect(resultado).toContain("78");
  });

  it("formatea cero", () => {
    const resultado = formatearPrecio(0);
    expect(resultado).toContain("0");
  });

  it("incluye centavos", () => {
    const resultado = formatearPrecio(100.5);
    expect(resultado).toMatch(/50/);
  });
});

describe("formatearNumeroInput", () => {
  it("no incluye símbolo de moneda", () => {
    const resultado = formatearNumeroInput(1000);
    expect(resultado).not.toContain("$");
  });

  it("formatea con 2 decimales", () => {
    const resultado = formatearNumeroInput(1000);
    // En es-AR el separador decimal es la coma
    expect(resultado).toMatch(/,\d{2}$/);
  });

  it("formatea número grande con separador de miles", () => {
    const resultado = formatearNumeroInput(78000);
    expect(resultado).toMatch(/\./); // punto de miles en es-AR
  });
});

describe("formatearFecha", () => {
  it("formatea una fecha en DD/MM/AAAA", () => {
    // Usar una fecha fija para evitar dependencia de zona horaria
    const fecha = new Date("2026-06-05T12:00:00Z");
    const resultado = formatearFecha(fecha);
    // Debe contener año 2026, mes 06 y algún día
    expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(resultado).toContain("2026");
  });

  it("acepta string de fecha", () => {
    const resultado = formatearFecha("2026-01-15T00:00:00.000Z");
    expect(resultado).toMatch(/\d{2}\/\d{2}\/2026/);
  });

  it("retorna una cadena no vacía", () => {
    expect(formatearFecha(new Date())).toBeTruthy();
  });
});
