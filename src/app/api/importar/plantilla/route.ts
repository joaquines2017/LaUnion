import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

// Colores
const COLOR_HEADER = "1E3A5F";
const COLOR_REQUIRED = "FFF9E6";
const COLOR_OPTIONAL = "F5F7FA";
const COLOR_EXAMPLE = "E8F5E9";

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: { header: string; key: string; width: number; required: boolean }[],
  examples: Record<string, string | number>[]
) {
  const ws = wb.addWorksheet(name);

  // Encabezados
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  const headerRow = ws.getRow(1);
  headerRow.height = 20;
  headerRow.eachCell((cell, colNumber) => {
    const col = columns[colNumber - 1];
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLOR_HEADER } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FFFFFFFF" } },
    };
    // Asterisco en requeridas
    if (col?.required) {
      cell.value = `${cell.value} *`;
    }
  });

  // Fila de ayuda (fila 2, en gris)
  const helpRow = ws.getRow(2);
  columns.forEach((col, i) => {
    const cell = helpRow.getCell(i + 1);
    cell.value = col.required ? "Requerido" : "Opcional";
    cell.font = { italic: true, color: { argb: "FF888888" }, size: 9 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col.required ? "FFFFF3CD" : "FFF0F0F0" },
    };
    cell.alignment = { horizontal: "center" };
  });

  // Filas de ejemplo
  examples.forEach((ex) => {
    const row = ws.addRow(ex);
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLOR_EXAMPLE } };
      cell.font = { color: { argb: "FF2E7D32" }, size: 10 };
    });
  });

  // Primera fila de datos vacía con colores (para que el usuario sepa dónde tipear)
  const emptyRow = ws.addRow({});
  emptyRow.eachCell(() => {});
  columns.forEach((col, i) => {
    const cell = emptyRow.getCell(i + 1);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col.required ? "FF" + COLOR_REQUIRED : "FF" + COLOR_OPTIONAL },
    };
  });

  // Freezear primera fila
  ws.views = [{ state: "frozen", ySplit: 1 }];

  return ws;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "LaUnion";
  wb.created = new Date();

  // ── Proveedores ─────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Proveedores",
    [
      { header: "nombre", key: "nombre", width: 28, required: true },
      { header: "cuit", key: "cuit", width: 18, required: false },
      { header: "telefono", key: "telefono", width: 18, required: false },
      { header: "email", key: "email", width: 28, required: false },
      { header: "direccion", key: "direccion", width: 30, required: false },
      { header: "observaciones", key: "observaciones", width: 35, required: false },
    ],
    [
      { nombre: "Maderplac SA", cuit: "30-71234567-1", telefono: "011-4567-8900", email: "ventas@maderplac.com", direccion: "Av. Industrial 1234, CABA", observaciones: "Pago 30 días" },
      { nombre: "Herrajes del Sur", cuit: "20-32198765-4", telefono: "011-5555-1234", email: "", direccion: "", observaciones: "" },
    ]
  );

  // ── CatInsumos ──────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "CatInsumos",
    [
      { header: "nombre", key: "nombre", width: 28, required: true },
      { header: "descripcion", key: "descripcion", width: 40, required: false },
    ],
    [
      { nombre: "Placas de melamina", descripcion: "Melamina y aglomerado" },
      { nombre: "Herrajes", descripcion: "Bisagras, rieles, manijas" },
      { nombre: "Vidrios", descripcion: "" },
      { nombre: "Tornillería", descripcion: "" },
    ]
  );

  // ── Insumos ─────────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Insumos",
    [
      { header: "codigo", key: "codigo", width: 15, required: true },
      { header: "descripcion", key: "descripcion", width: 35, required: true },
      { header: "categoria", key: "categoria", width: 25, required: true },
      { header: "unidad", key: "unidad", width: 18, required: true },
      { header: "espesor_mm", key: "espesor_mm", width: 14, required: false },
      { header: "alto_m", key: "alto_m", width: 12, required: false },
      { header: "ancho_m", key: "ancho_m", width: 12, required: false },
      { header: "precio_base", key: "precio_base", width: 14, required: false },
    ],
    [
      { codigo: "MEL-BL-18", descripcion: "Melamina Blanca 18mm", categoria: "Placas de melamina", unidad: "placa", espesor_mm: 18, alto_m: 2.44, ancho_m: 1.83, precio_base: "" },
      { codigo: "BIS-35", descripcion: "Bisagra cazoleta 35mm", categoria: "Herrajes", unidad: "unidad", espesor_mm: "", alto_m: "", ancho_m: "", precio_base: 850 },
      { codigo: "FLETE-LOCAL", descripcion: "Flete local", categoria: "Gastos", unidad: "unidad", espesor_mm: "", alto_m: "", ancho_m: "", precio_base: 5000 },
    ]
  );

  // Nota sobre valores válidos de unidad
  const hojaInsumos = wb.getWorksheet("Insumos")!;
  hojaInsumos.getCell("D2").value = "unidad / placa / metro / metroLineal / kilo / par / juego / rollo";
  hojaInsumos.getCell("D2").font = { italic: true, color: { argb: "FF666666" }, size: 8 };

  // ── Precios ─────────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Precios",
    [
      { header: "codigo_insumo", key: "codigo_insumo", width: 18, required: true },
      { header: "proveedor", key: "proveedor", width: 28, required: true },
      { header: "precio", key: "precio", width: 16, required: true },
    ],
    [
      { codigo_insumo: "MEL-BL-18", proveedor: "Maderplac SA", precio: 48000 },
      { codigo_insumo: "BIS-35", proveedor: "Herrajes del Sur", precio: 950 },
    ]
  );

  // ── CatMuebles ──────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "CatMuebles",
    [
      { header: "nombre", key: "nombre", width: 30, required: true },
    ],
    [
      { nombre: "Dormitorio" },
      { nombre: "Living" },
      { nombre: "Cocina" },
    ]
  );

  // ── Muebles ─────────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Muebles",
    [
      { header: "codigo", key: "codigo", width: 18, required: true },
      { header: "nombre", key: "nombre", width: 35, required: true },
      { header: "categoria", key: "categoria", width: 25, required: false },
    ],
    [
      { codigo: "05-147-000", nombre: "Ropero 3 puertas", categoria: "Dormitorio" },
      { codigo: "05-148-001", nombre: "Mesa de luz simple", categoria: "Dormitorio" },
    ]
  );

  // ── DespiMat ────────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "DespiMat",
    [
      { header: "codigo_mueble", key: "codigo_mueble", width: 18, required: true },
      { header: "codigo_insumo", key: "codigo_insumo", width: 18, required: false },
      { header: "descripcion", key: "descripcion", width: 30, required: true },
      { header: "largo_cm", key: "largo_cm", width: 12, required: false },
      { header: "ancho_cm", key: "ancho_cm", width: 12, required: false },
      { header: "cantidad", key: "cantidad", width: 10, required: false },
      { header: "precio_unitario", key: "precio_unitario", width: 16, required: false },
    ],
    [
      { codigo_mueble: "05-147-000", codigo_insumo: "MEL-BL-18", descripcion: "Panel lateral", largo_cm: 200, ancho_cm: 58, cantidad: 2, precio_unitario: "" },
      { codigo_mueble: "05-147-000", codigo_insumo: "MEL-BL-18", descripcion: "Estante intermedio", largo_cm: 88, ancho_cm: 55, cantidad: 3, precio_unitario: "" },
      { codigo_mueble: "05-148-001", codigo_insumo: "MEL-BL-18", descripcion: "Tapa superior", largo_cm: 50, ancho_cm: 40, cantidad: 1, precio_unitario: "" },
    ]
  );

  // ── DespiInsumos ────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "DespiInsumos",
    [
      { header: "codigo_mueble", key: "codigo_mueble", width: 18, required: true },
      { header: "codigo_insumo", key: "codigo_insumo", width: 18, required: false },
      { header: "descripcion", key: "descripcion", width: 30, required: true },
      { header: "cantidad", key: "cantidad", width: 10, required: false },
      { header: "precio_unitario", key: "precio_unitario", width: 16, required: false },
    ],
    [
      { codigo_mueble: "05-147-000", codigo_insumo: "BIS-35", descripcion: "Bisagra puertas", cantidad: 6, precio_unitario: "" },
      { codigo_mueble: "05-147-000", codigo_insumo: "FLETE-LOCAL", descripcion: "Flete y entrega", cantidad: 1, precio_unitario: 5000 },
      { codigo_mueble: "05-148-001", codigo_insumo: "BIS-35", descripcion: "Bisagra puerta chica", cantidad: 2, precio_unitario: "" },
    ]
  );

  // ── Residuales ──────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Residuales",
    [
      { header: "codigo_insumo", key: "codigo_insumo", width: 18, required: true },
      { header: "alto_cm", key: "alto_cm", width: 12, required: true },
      { header: "ancho_cm", key: "ancho_cm", width: 12, required: true },
      { header: "cantidad", key: "cantidad", width: 10, required: false },
      { header: "nota", key: "nota", width: 35, required: false },
    ],
    [
      { codigo_insumo: "MEL-BL-18", alto_cm: 90, ancho_cm: 55, cantidad: 2, nota: "Sobra de ropero 3 puertas" },
      { codigo_insumo: "MEL-BL-18", alto_cm: 60, ancho_cm: 40, cantidad: 1, nota: "" },
    ]
  );

  // ── Serializar y devolver ───────────────────────────────────────────────────
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-importacion.xlsx"',
    },
  });
}
