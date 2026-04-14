/**
 * Parser de Excel para importación de muebles.
 *
 * Formato esperado del archivo .xlsx:
 *
 * Hoja 1 ("Muebles" o la primera hoja):
 *   Fila 1: encabezados (se detectan automáticamente)
 *   Columnas: Código | Nombre | Categoría
 *
 * Hoja 2 ("Despiece" o la segunda hoja, opcional):
 *   Columnas: Código Mueble | Tipo (material/insumo) | Descripción | Código Insumo | Medidas | Cantidad | Costo Unitario
 *
 * El parser es flexible: busca columnas por nombre (case-insensitive, sin acentos).
 */

import ExcelJS from "exceljs";

export interface FilaMuebleImportada {
  fila: number;
  codigo: string;
  nombre: string;
  categoria: string;
  error?: string;
}

export interface FilaDespieceImportada {
  fila: number;
  codigoMueble: string;
  tipo: "material" | "insumo";
  descripcion: string;
  codigoInsumo: string | null;
  medidas: string | null;
  cantidad: number;
  costoUnitario: number;
  error?: string;
}

export interface ResultadoImportacion {
  muebles: FilaMuebleImportada[];
  despiece: FilaDespieceImportada[];
  errores: string[];
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectarColumna(headers: string[], candidatos: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizar(headers[i]);
    if (candidatos.some((c) => h.includes(c))) return i;
  }
  return -1;
}

function valorCelda(cell: ExcelJS.Cell): string {
  if (cell.value == null) return "";
  if (typeof cell.value === "object") {
    if ("text" in cell.value) return String((cell.value as { text: string }).text);
    if ("result" in cell.value) return String((cell.value as { result: unknown }).result);
  }
  return String(cell.value).trim();
}

export async function parsearExcel(buffer: ArrayBuffer | Buffer): Promise<ResultadoImportacion> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const resultado: ResultadoImportacion = {
    muebles: [],
    despiece: [],
    errores: [],
  };

  // ── Hoja 1: Muebles ──────────────────────────────────────────────────────

  const hojaMuebles = workbook.worksheets[0];
  if (!hojaMuebles) {
    resultado.errores.push("El archivo no tiene hojas de cálculo.");
    return resultado;
  }

  const headerRowMuebles = hojaMuebles.getRow(1);
  const headersMuebles: string[] = [];
  headerRowMuebles.eachCell((cell) => {
    headersMuebles.push(valorCelda(cell));
  });

  const colCodigoM = detectarColumna(headersMuebles, ["codigo", "cod", "code"]);
  const colNombreM = detectarColumna(headersMuebles, ["nombre", "name", "descripcion"]);
  const colCategoriaM = detectarColumna(headersMuebles, ["categoria", "category", "rubro"]);

  if (colCodigoM === -1 || colNombreM === -1) {
    resultado.errores.push(
      `Hoja "${hojaMuebles.name}": no se encontraron las columnas "Código" y "Nombre". ` +
        `Encabezados detectados: ${headersMuebles.join(", ")}`
    );
    return resultado;
  }

  hojaMuebles.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // saltar encabezado
    const cells = row.values as ExcelJS.CellValue[];

    const codigo = String(cells[colCodigoM + 1] ?? "").trim();
    const nombre = String(cells[colNombreM + 1] ?? "").trim();
    const categoria =
      colCategoriaM >= 0
        ? String(cells[colCategoriaM + 1] ?? "").trim()
        : "";

    if (!codigo && !nombre) return; // fila vacía

    const fila: FilaMuebleImportada = { fila: rowNumber, codigo, nombre, categoria };

    if (!codigo) fila.error = "Código vacío";
    else if (!nombre) fila.error = "Nombre vacío";

    resultado.muebles.push(fila);
  });

  // ── Hoja 2: Despiece (opcional) ───────────────────────────────────────────

  if (workbook.worksheets.length > 1) {
    const hojaDespiece = workbook.worksheets[1];
    const headerRowD = hojaDespiece.getRow(1);
    const headersD: string[] = [];
    headerRowD.eachCell((cell) => headersD.push(valorCelda(cell)));

    const colMueble = detectarColumna(headersD, ["mueble", "codigo mueble", "cod mueble"]);
    const colTipo = detectarColumna(headersD, ["tipo", "type"]);
    const colDesc = detectarColumna(headersD, ["descripcion", "nombre", "material", "insumo"]);
    const colCodIns = detectarColumna(headersD, ["codigo insumo", "cod insumo", "insumo cod"]);
    const colMedidas = detectarColumna(headersD, ["medidas", "dimensiones", "corte"]);
    const colCant = detectarColumna(headersD, ["cantidad", "cant", "qty"]);
    const colPrecio = detectarColumna(headersD, ["precio", "costo", "price"]);

    if (colMueble === -1 || colDesc === -1) {
      resultado.errores.push(
        `Hoja "${hojaDespiece.name}": no se encontraron las columnas "Código Mueble" y "Descripción". Se omite el despiece.`
      );
    } else {
      hojaDespiece.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const cells = row.values as ExcelJS.CellValue[];

        const codigoMueble = String(cells[colMueble + 1] ?? "").trim();
        const descripcion = String(cells[colDesc + 1] ?? "").trim();

        if (!codigoMueble && !descripcion) return;

        const tipoRaw =
          colTipo >= 0 ? normalizar(String(cells[colTipo + 1] ?? "")) : "";
        const tipo: "material" | "insumo" = tipoRaw.includes("insumo")
          ? "insumo"
          : "material";

        const fila: FilaDespieceImportada = {
          fila: rowNumber,
          codigoMueble,
          tipo,
          descripcion,
          codigoInsumo:
            colCodIns >= 0
              ? String(cells[colCodIns + 1] ?? "").trim() || null
              : null,
          medidas:
            colMedidas >= 0
              ? String(cells[colMedidas + 1] ?? "").trim() || null
              : null,
          cantidad:
            colCant >= 0 ? Number(cells[colCant + 1] ?? 1) || 1 : 1,
          costoUnitario:
            colPrecio >= 0 ? Number(cells[colPrecio + 1] ?? 0) || 0 : 0,
        };

        if (!codigoMueble) fila.error = "Código de mueble vacío";
        else if (!descripcion) fila.error = "Descripción vacía";

        resultado.despiece.push(fila);
      });
    }
  }

  return resultado;
}
