/**
 * Parser de Excel para importación masiva.
 *
 * El archivo .xlsx puede contener cualquiera de estas hojas (por nombre, flexible):
 *   - Proveedores
 *   - CatInsumos  (categorías de insumo)
 *   - Insumos
 *   - Precios
 *   - CatMuebles  (categorías de mueble)
 *   - Muebles
 *   - DespiMat    (despiece — materiales/placas)
 *   - DespiInsumos (despiece — insumos varios)
 *   - Residuales
 *
 * Cada hoja se detecta por su nombre (case-insensitive, sin acentos).
 * Se puede incluir cualquier subconjunto de hojas; las que falten se ignoran.
 *
 * Retrocompatibilidad: si hay una hoja "Despiece" con columna "Tipo",
 * se parsea como el formato anterior (material/insumo en una sola hoja).
 */

import ExcelJS from "exceljs";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface FilaProveedorImportada {
  fila: number;
  nombre: string;
  cuit: string;
  telefono: string;
  email: string;
  direccion: string;
  observaciones: string;
  error?: string;
}

export interface FilaCatalogoImportada {
  fila: number;
  nombre: string;
  descripcion: string;
  error?: string;
}

export interface FilaInsumoImportada {
  fila: number;
  codigo: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  espesormm: number | null;
  altoM: number | null;
  anchoM: number | null;
  precioBase: number | null;
  error?: string;
}

export interface FilaPrecioImportada {
  fila: number;
  codigoInsumo: string;
  proveedor: string;
  precio: number;
  error?: string;
}

export interface FilaMuebleImportada {
  fila: number;
  codigo: string;
  nombre: string;
  categoria: string;
  error?: string;
}

export interface FilaDespiMaterialImportada {
  fila: number;
  codigoMueble: string;
  codigoInsumo: string;
  descripcion: string;
  largoCm: number | null;
  anchoCm: number | null;
  medidas: string | null; // retrocompat
  cantidad: number;
  precioUnitario: number | null;
  error?: string;
}

export interface FilaDespiInsumoImportada {
  fila: number;
  codigoMueble: string;
  codigoInsumo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | null;
  error?: string;
}

export interface FilaResidualImportada {
  fila: number;
  codigoInsumo: string;
  altoCm: number;
  anchoCm: number;
  cantidad: number;
  nota: string;
  error?: string;
}

export interface ResultadoImportacion {
  proveedores: FilaProveedorImportada[];
  catInsumos: FilaCatalogoImportada[];
  insumos: FilaInsumoImportada[];
  precios: FilaPrecioImportada[];
  catMuebles: FilaCatalogoImportada[];
  muebles: FilaMuebleImportada[];
  despieMateriales: FilaDespiMaterialImportada[];
  despieInsumos: FilaDespiInsumoImportada[];
  residuales: FilaResidualImportada[];
  // retrocompat: despiece combinado (hoja con Tipo column)
  despiece: FilaDespieceLegacyImportada[];
  errores: string[];
}

/** Formato antiguo: una sola hoja de despiece con columna "Tipo" */
export interface FilaDespieceLegacyImportada {
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

// ─── Utilidades ───────────────────────────────────────────────────────────────

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectarColumna(headers: string[], candidatos: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizar(headers[i] ?? "");
    if (candidatos.some((c) => h.includes(normalizar(c)))) return i;
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

function strCell(cells: ExcelJS.CellValue[], idx: number): string {
  if (idx < 0) return "";
  return String(cells[idx + 1] ?? "").trim();
}

function numCell(cells: ExcelJS.CellValue[], idx: number, fallback: number | null = null): number | null {
  if (idx < 0) return fallback;
  const v = Number(cells[idx + 1] ?? "");
  return isNaN(v) || v === 0 ? fallback : v;
}

function getHeaders(sheet: ExcelJS.Worksheet): string[] {
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell) => headers.push(valorCelda(cell)));
  return headers;
}

/** Detecta una hoja por nombre usando palabras clave */
function encontrarHoja(
  workbook: ExcelJS.Workbook,
  keywords: string[]
): ExcelJS.Worksheet | undefined {
  return workbook.worksheets.find((ws) => {
    const n = normalizar(ws.name);
    return keywords.every((kw) => n.includes(normalizar(kw)));
  });
}

// ─── Parsers por entidad ──────────────────────────────────────────────────────

function parsearProveedores(sheet: ExcelJS.Worksheet): FilaProveedorImportada[] {
  const h = getHeaders(sheet);
  const colNombre = detectarColumna(h, ["nombre", "name", "razon"]);
  const colCuit = detectarColumna(h, ["cuit", "rut", "nif"]);
  const colTel = detectarColumna(h, ["telefono", "tel", "phone", "celular"]);
  const colEmail = detectarColumna(h, ["email", "mail", "correo"]);
  const colDir = detectarColumna(h, ["direccion", "domicilio", "address"]);
  const colObs = detectarColumna(h, ["observacion", "nota", "comment"]);

  const rows: FilaProveedorImportada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = row.values as ExcelJS.CellValue[];
    const nombre = strCell(c, colNombre);
    if (!nombre) return;
    rows.push({
      fila: rowNumber,
      nombre,
      cuit: strCell(c, colCuit),
      telefono: strCell(c, colTel),
      email: strCell(c, colEmail),
      direccion: strCell(c, colDir),
      observaciones: strCell(c, colObs),
      error: !nombre ? "Nombre vacío" : undefined,
    });
  });
  return rows;
}

function parsearCatalogo(sheet: ExcelJS.Worksheet): FilaCatalogoImportada[] {
  const h = getHeaders(sheet);
  const colNombre = detectarColumna(h, ["nombre", "name"]);
  const colDesc = detectarColumna(h, ["descripcion", "detalle", "description"]);

  const rows: FilaCatalogoImportada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = row.values as ExcelJS.CellValue[];
    const nombre = strCell(c, colNombre);
    if (!nombre) return;
    rows.push({
      fila: rowNumber,
      nombre,
      descripcion: strCell(c, colDesc),
      error: !nombre ? "Nombre vacío" : undefined,
    });
  });
  return rows;
}

function parsearInsumos(sheet: ExcelJS.Worksheet): FilaInsumoImportada[] {
  const h = getHeaders(sheet);
  const colCod = detectarColumna(h, ["codigo", "cod", "code"]);
  const colDesc = detectarColumna(h, ["descripcion", "nombre", "description"]);
  const colCat = detectarColumna(h, ["categoria", "category", "rubro"]);
  const colUnidad = detectarColumna(h, ["unidad", "unit", "um"]);
  const colEsp = detectarColumna(h, ["espesor", "esp", "mm"]);
  const colAlto = detectarColumna(h, ["alto_m", "alto m", "alto (m)", "height"]);
  const colAncho = detectarColumna(h, ["ancho_m", "ancho m", "ancho (m)", "width"]);
  const colBase = detectarColumna(h, ["precio_base", "precio base", "base", "precio fijo"]);

  const rows: FilaInsumoImportada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = row.values as ExcelJS.CellValue[];
    const codigo = strCell(c, colCod);
    const descripcion = strCell(c, colDesc);
    const categoria = strCell(c, colCat);
    const unidad = strCell(c, colUnidad) || "unidad";
    if (!codigo && !descripcion) return;

    let error: string | undefined;
    if (!codigo) error = "Código vacío";
    else if (!descripcion) error = "Descripción vacía";
    else if (!categoria) error = "Categoría vacía";

    rows.push({
      fila: rowNumber,
      codigo,
      descripcion,
      categoria,
      unidad,
      espesormm: numCell(c, colEsp),
      altoM: numCell(c, colAlto),
      anchoM: numCell(c, colAncho),
      precioBase: numCell(c, colBase),
      error,
    });
  });
  return rows;
}

function parsearPrecios(sheet: ExcelJS.Worksheet): FilaPrecioImportada[] {
  const h = getHeaders(sheet);
  const colCodIns = detectarColumna(h, ["codigo_insumo", "codigo insumo", "insumo", "cod insumo"]);
  const colProv = detectarColumna(h, ["proveedor", "provider", "supplier"]);
  const colPrecio = detectarColumna(h, ["precio", "price", "costo"]);

  const rows: FilaPrecioImportada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = row.values as ExcelJS.CellValue[];
    const codigoInsumo = strCell(c, colCodIns);
    const proveedor = strCell(c, colProv);
    const precioRaw = numCell(c, colPrecio, 0) ?? 0;
    if (!codigoInsumo && !proveedor) return;

    let error: string | undefined;
    if (!codigoInsumo) error = "Código de insumo vacío";
    else if (!proveedor) error = "Proveedor vacío";
    else if (precioRaw <= 0) error = "Precio inválido";

    rows.push({
      fila: rowNumber,
      codigoInsumo,
      proveedor,
      precio: precioRaw,
      error,
    });
  });
  return rows;
}

function parsearMuebles(sheet: ExcelJS.Worksheet): FilaMuebleImportada[] {
  const h = getHeaders(sheet);
  const colCod = detectarColumna(h, ["codigo", "cod", "code"]);
  const colNombre = detectarColumna(h, ["nombre", "name", "descripcion"]);
  const colCat = detectarColumna(h, ["categoria", "category", "rubro"]);

  const rows: FilaMuebleImportada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = row.values as ExcelJS.CellValue[];
    const codigo = strCell(c, colCod);
    const nombre = strCell(c, colNombre);
    if (!codigo && !nombre) return;

    let error: string | undefined;
    if (!codigo) error = "Código vacío";
    else if (!nombre) error = "Nombre vacío";

    rows.push({
      fila: rowNumber,
      codigo,
      nombre,
      categoria: strCell(c, colCat),
      error,
    });
  });
  return rows;
}

function parsearDespieMateriales(sheet: ExcelJS.Worksheet): FilaDespiMaterialImportada[] {
  const h = getHeaders(sheet);
  const colMueble = detectarColumna(h, ["codigo_mueble", "codigo mueble", "mueble", "cod mueble"]);
  const colInsumo = detectarColumna(h, ["codigo_insumo", "codigo insumo", "insumo", "cod insumo", "material"]);
  const colDesc = detectarColumna(h, ["descripcion", "pieza", "nombre", "description"]);
  const colLargo = detectarColumna(h, ["largo_cm", "largo cm", "largo", "alto_cm", "alto cm", "alto"]);
  const colAncho = detectarColumna(h, ["ancho_cm", "ancho cm", "ancho"]);
  const colMedidas = detectarColumna(h, ["medidas", "dimensiones", "corte"]);
  const colCant = detectarColumna(h, ["cantidad", "cant", "qty"]);
  const colPrecio = detectarColumna(h, ["precio_unitario", "precio unitario", "precio", "costo"]);

  const rows: FilaDespiMaterialImportada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = row.values as ExcelJS.CellValue[];
    const codigoMueble = strCell(c, colMueble);
    const descripcion = strCell(c, colDesc);
    if (!codigoMueble && !descripcion) return;

    const largoCm = numCell(c, colLargo);
    const anchoCm = numCell(c, colAncho);
    const medidasStr = strCell(c, colMedidas);
    // Construir string de medidas si hay valores numéricos
    const medidasFinal =
      largoCm != null && anchoCm != null
        ? `${largoCm}x${anchoCm}`
        : medidasStr || null;

    rows.push({
      fila: rowNumber,
      codigoMueble,
      codigoInsumo: strCell(c, colInsumo),
      descripcion,
      largoCm,
      anchoCm,
      medidas: medidasFinal,
      cantidad: numCell(c, colCant, 1) ?? 1,
      precioUnitario: numCell(c, colPrecio),
      error: !codigoMueble ? "Código de mueble vacío" : !descripcion ? "Descripción vacía" : undefined,
    });
  });
  return rows;
}

function parsearDespieInsumos(sheet: ExcelJS.Worksheet): FilaDespiInsumoImportada[] {
  const h = getHeaders(sheet);
  const colMueble = detectarColumna(h, ["codigo_mueble", "codigo mueble", "mueble", "cod mueble"]);
  const colInsumo = detectarColumna(h, ["codigo_insumo", "codigo insumo", "insumo", "cod insumo"]);
  const colDesc = detectarColumna(h, ["descripcion", "nombre", "description"]);
  const colCant = detectarColumna(h, ["cantidad", "cant", "qty"]);
  const colPrecio = detectarColumna(h, ["precio_unitario", "precio unitario", "precio", "costo"]);

  const rows: FilaDespiInsumoImportada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = row.values as ExcelJS.CellValue[];
    const codigoMueble = strCell(c, colMueble);
    const descripcion = strCell(c, colDesc);
    if (!codigoMueble && !descripcion) return;

    rows.push({
      fila: rowNumber,
      codigoMueble,
      codigoInsumo: strCell(c, colInsumo),
      descripcion,
      cantidad: numCell(c, colCant, 1) ?? 1,
      precioUnitario: numCell(c, colPrecio),
      error: !codigoMueble ? "Código de mueble vacío" : !descripcion ? "Descripción vacía" : undefined,
    });
  });
  return rows;
}

function parsearResiduales(sheet: ExcelJS.Worksheet): FilaResidualImportada[] {
  const h = getHeaders(sheet);
  const colInsumo = detectarColumna(h, ["codigo_insumo", "codigo insumo", "insumo", "cod insumo", "material"]);
  const colAlto = detectarColumna(h, ["alto_cm", "alto cm", "alto", "largo_cm", "largo cm", "largo"]);
  const colAncho = detectarColumna(h, ["ancho_cm", "ancho cm", "ancho"]);
  const colCant = detectarColumna(h, ["cantidad", "cant", "qty"]);
  const colNota = detectarColumna(h, ["nota", "observacion", "detalle", "note"]);

  const rows: FilaResidualImportada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = row.values as ExcelJS.CellValue[];
    const codigoInsumo = strCell(c, colInsumo);
    const altoCm = numCell(c, colAlto, 0) ?? 0;
    const anchoCm = numCell(c, colAncho, 0) ?? 0;
    if (!codigoInsumo && altoCm === 0 && anchoCm === 0) return;

    let error: string | undefined;
    if (!codigoInsumo) error = "Código de insumo vacío";
    else if (altoCm <= 0) error = "Alto inválido";
    else if (anchoCm <= 0) error = "Ancho inválido";

    rows.push({
      fila: rowNumber,
      codigoInsumo,
      altoCm,
      anchoCm,
      cantidad: numCell(c, colCant, 1) ?? 1,
      nota: strCell(c, colNota),
      error,
    });
  });
  return rows;
}

/** Formato legacy: hoja única con columna "Tipo" (material/insumo) */
function parsearDespieLegacy(sheet: ExcelJS.Worksheet): FilaDespieceLegacyImportada[] {
  const h = getHeaders(sheet);
  const colMueble = detectarColumna(h, ["mueble", "codigo mueble", "cod mueble"]);
  const colTipo = detectarColumna(h, ["tipo", "type"]);
  const colDesc = detectarColumna(h, ["descripcion", "nombre", "material", "insumo"]);
  const colCodIns = detectarColumna(h, ["codigo insumo", "cod insumo", "insumo cod"]);
  const colMedidas = detectarColumna(h, ["medidas", "dimensiones", "corte"]);
  const colCant = detectarColumna(h, ["cantidad", "cant", "qty"]);
  const colPrecio = detectarColumna(h, ["precio", "costo", "price"]);

  const rows: FilaDespieceLegacyImportada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = row.values as ExcelJS.CellValue[];
    const codigoMueble = strCell(c, colMueble);
    const descripcion = strCell(c, colDesc);
    if (!codigoMueble && !descripcion) return;

    const tipoRaw = normalizar(strCell(c, colTipo));
    const tipo: "material" | "insumo" = tipoRaw.includes("insumo") ? "insumo" : "material";

    rows.push({
      fila: rowNumber,
      codigoMueble,
      tipo,
      descripcion,
      codigoInsumo: strCell(c, colCodIns) || null,
      medidas: strCell(c, colMedidas) || null,
      cantidad: numCell(c, colCant, 1) ?? 1,
      costoUnitario: numCell(c, colPrecio, 0) ?? 0,
      error: !codigoMueble ? "Código de mueble vacío" : !descripcion ? "Descripción vacía" : undefined,
    });
  });
  return rows;
}

// ─── Entrada principal ────────────────────────────────────────────────────────

export async function parsearExcel(buffer: ArrayBuffer | Buffer): Promise<ResultadoImportacion> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const resultado: ResultadoImportacion = {
    proveedores: [],
    catInsumos: [],
    insumos: [],
    precios: [],
    catMuebles: [],
    muebles: [],
    despieMateriales: [],
    despieInsumos: [],
    residuales: [],
    despiece: [],
    errores: [],
  };

  if (workbook.worksheets.length === 0) {
    resultado.errores.push("El archivo no contiene hojas de cálculo.");
    return resultado;
  }

  // Detectar cada hoja por nombre
  const hojaProveedores = encontrarHoja(workbook, ["prov"]);
  const hotaCatInsumos = encontrarHoja(workbook, ["cat", "ins"]) ||
    encontrarHoja(workbook, ["catinsumo"]) ||
    encontrarHoja(workbook, ["catins"]);
  const hojaInsumos = workbook.worksheets.find((ws) => {
    const n = normalizar(ws.name);
    return n.includes("insumo") && !n.includes("cat") && !n.includes("despi") && !n.includes("desp");
  });
  const hojaPrecios = encontrarHoja(workbook, ["precio"]);
  const hotaCatMuebles = workbook.worksheets.find((ws) => {
    const n = normalizar(ws.name);
    return n.includes("cat") && n.includes("mueble");
  });
  const hojaMuebles = workbook.worksheets.find((ws) => {
    const n = normalizar(ws.name);
    return n.includes("mueble") && !n.includes("cat") && !n.includes("despi") && !n.includes("desp");
  });
  const hojaDespiMat = workbook.worksheets.find((ws) => {
    const n = normalizar(ws.name);
    return (n.includes("despi") || n.includes("desp")) && (n.includes("mat") || n.includes("placa") || n.includes("material"));
  });
  const hojaDespiIns = workbook.worksheets.find((ws) => {
    const n = normalizar(ws.name);
    return (n.includes("despi") || n.includes("desp")) && n.includes("ins");
  });
  const hojaResiduales = encontrarHoja(workbook, ["resid"]);

  // Hoja de despiece legacy (retrocompatibilidad: hoja única "Despiece")
  const hojaDespieLegacy = workbook.worksheets.find((ws) => {
    const n = normalizar(ws.name);
    return (n === "despiece" || n === "despiece materiales" || n === "desp") &&
      !hojaDespiMat && !hojaDespiIns; // solo si no hay hojas nuevas
  });

  // Retrocompatibilidad: primera hoja como muebles si no hay hoja nombrada
  if (!hojaMuebles && workbook.worksheets.length > 0) {
    const primeraHoja = workbook.worksheets[0];
    const n = normalizar(primeraHoja.name);
    // Si no fue detectada para otra entidad
    const yaUsada = [hojaProveedores, hotaCatInsumos, hojaInsumos, hojaPrecios, hotaCatMuebles,
      hojaDespiMat, hojaDespiIns, hojaResiduales, hojaDespieLegacy].includes(primeraHoja);
    if (!yaUsada && !n.includes("cat") && !n.includes("prov") && !n.includes("precio")) {
      resultado.muebles = parsearMuebles(primeraHoja);
    }
  }

  // Retrocompatibilidad: segunda hoja como despiece legacy si no hay hojas nombradas
  if (!hojaDespieLegacy && !hojaDespiMat && !hojaDespiIns && workbook.worksheets.length > 1) {
    const segundaHoja = workbook.worksheets[1];
    const n = normalizar(segundaHoja.name);
    const yaUsada = [hojaProveedores, hotaCatInsumos, hojaInsumos, hojaPrecios, hotaCatMuebles,
      hojaMuebles, hojaDespiMat, hojaDespiIns, hojaResiduales].includes(segundaHoja);
    if (!yaUsada && (n.includes("despi") || n.includes("desp") || workbook.worksheets.length === 2)) {
      resultado.despiece = parsearDespieLegacy(segundaHoja);
    }
  }

  // Parsear hojas detectadas por nombre
  if (hojaProveedores) resultado.proveedores = parsearProveedores(hojaProveedores);
  if (hotaCatInsumos) resultado.catInsumos = parsearCatalogo(hotaCatInsumos);
  if (hojaInsumos) resultado.insumos = parsearInsumos(hojaInsumos);
  if (hojaPrecios) resultado.precios = parsearPrecios(hojaPrecios);
  if (hotaCatMuebles) resultado.catMuebles = parsearCatalogo(hotaCatMuebles);
  if (hojaMuebles) resultado.muebles = parsearMuebles(hojaMuebles);
  if (hojaDespiMat) resultado.despieMateriales = parsearDespieMateriales(hojaDespiMat);
  if (hojaDespiIns) resultado.despieInsumos = parsearDespieInsumos(hojaDespiIns);
  if (hojaResiduales) resultado.residuales = parsearResiduales(hojaResiduales);
  if (hojaDespieLegacy) resultado.despiece = parsearDespieLegacy(hojaDespieLegacy);

  return resultado;
}
