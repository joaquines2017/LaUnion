import { describe, it, expect } from "vitest";
import { parseSortKeys, sortFilas, FilaCorte, SortKey } from "@/lib/lista-corte";

// Filas de ejemplo para los tests de ordenamiento
const filas: FilaCorte[] = [
  {
    id: "1",
    anchoCm: 43,
    altoCm: 90,
    espesormm: 18,
    cantidad: 2,
    pieza: "Lateral",
    insumo: "Melamina blanca",
    muebles: [{ id: "m1", codigo: "01-001", nombre: "Mesa ratona", cantidad: 2 }],
  },
  {
    id: "2",
    anchoCm: 35,
    altoCm: 120,
    espesormm: 15,
    cantidad: 4,
    pieza: "Estante",
    insumo: "MDF crudo",
    muebles: [{ id: "m2", codigo: "02-001", nombre: "Biblioteca", cantidad: 4 }],
  },
  {
    id: "3",
    anchoCm: 60,
    altoCm: 80,
    espesormm: 18,
    cantidad: 1,
    pieza: "Tapa",
    insumo: "Melamina blanca",
    muebles: [{ id: "m1", codigo: "01-001", nombre: "Mesa ratona", cantidad: 1 }],
  },
  {
    id: "4",
    anchoCm: 43,
    altoCm: 90,
    espesormm: 18,
    cantidad: 6,
    pieza: "Lateral",
    insumo: "Melamina roble",
    muebles: [{ id: "m3", codigo: "03-001", nombre: "Placard", cantidad: 6 }],
  },
];

describe("parseSortKeys", () => {
  it("retorna orden por defecto si param es null", () => {
    const keys = parseSortKeys(null);
    expect(keys).toEqual([
      { field: "anchoCm", dir: "desc" },
      { field: "altoCm", dir: "desc" },
    ]);
  });

  it("parsea un solo campo", () => {
    expect(parseSortKeys("cantidad:asc")).toEqual([
      { field: "cantidad", dir: "asc" },
    ]);
  });

  it("parsea múltiples campos separados por coma", () => {
    const keys = parseSortKeys("pieza:asc,altoCm:desc");
    expect(keys).toEqual([
      { field: "pieza", dir: "asc" },
      { field: "altoCm", dir: "desc" },
    ]);
  });

  it("usa desc como dirección por defecto si no se especifica", () => {
    const keys = parseSortKeys("anchoCm");
    expect(keys[0].dir).toBe("desc");
  });
});

describe("sortFilas", () => {
  it("ordena por anchoCm descendente", () => {
    const keys: SortKey[] = [{ field: "anchoCm", dir: "desc" }];
    const result = sortFilas(filas, keys);
    const anchos = result.map((f) => f.anchoCm);
    expect(anchos).toEqual([...anchos].sort((a, b) => b - a));
  });

  it("ordena por anchoCm ascendente", () => {
    const keys: SortKey[] = [{ field: "anchoCm", dir: "asc" }];
    const result = sortFilas(filas, keys);
    const anchos = result.map((f) => f.anchoCm);
    expect(anchos).toEqual([...anchos].sort((a, b) => a - b));
  });

  it("ordena por cantidad descendente", () => {
    const keys: SortKey[] = [{ field: "cantidad", dir: "desc" }];
    const result = sortFilas(filas, keys);
    const cantidades = result.map((f) => f.cantidad);
    expect(cantidades[0]).toBe(6);
    expect(cantidades[cantidades.length - 1]).toBe(1);
  });

  it("ordena por pieza ascendente (string)", () => {
    const keys: SortKey[] = [{ field: "pieza", dir: "asc" }];
    const result = sortFilas(filas, keys);
    expect(result[0].pieza).toBe("Estante");
    expect(result[result.length - 1].pieza).toBe("Tapa");
  });

  it("aplica múltiples claves de ordenamiento", () => {
    // Primero por anchoCm desc, luego por cantidad desc
    const keys: SortKey[] = [
      { field: "anchoCm", dir: "asc" },
      { field: "cantidad", dir: "desc" },
    ];
    const result = sortFilas(filas, keys);
    // El anchoCm más chico es 35, luego vienen los de 43 (cantidad 6 antes que 2)
    expect(result[0].anchoCm).toBe(35);
    expect(result[1].cantidad).toBeGreaterThanOrEqual(result[2].cantidad);
  });

  it("no muta el array original", () => {
    const original = [...filas];
    sortFilas(filas, [{ field: "cantidad", dir: "asc" }]);
    expect(filas).toEqual(original);
  });

  it("maneja array vacío", () => {
    expect(sortFilas([], [{ field: "anchoCm", dir: "desc" }])).toEqual([]);
  });

  it("maneja array de un elemento", () => {
    const result = sortFilas([filas[0]], [{ field: "anchoCm", dir: "desc" }]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});
