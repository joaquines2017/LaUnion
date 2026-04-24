import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getListaCorte, parseSortKeys, sortFilas } from "@/lib/lista-corte";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sortKeys  = parseSortKeys(searchParams.get("sort"));
  const filas     = await getListaCorte();
  const ordenadas = sortFilas(filas, sortKeys);

  const wb = new ExcelJS.Workbook();
  wb.creator = "LaUnion";
  wb.created = new Date();

  const ws = wb.addWorksheet("Lista de Corte");

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A2035" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const borderThin: Partial<ExcelJS.Borders> = {
    top:    { style: "thin", color: { argb: "FFE0E3EA" } },
    bottom: { style: "thin", color: { argb: "FFE0E3EA" } },
    left:   { style: "thin", color: { argb: "FFE0E3EA" } },
    right:  { style: "thin", color: { argb: "FFE0E3EA" } },
  };

  ws.columns = [
    { header: "Ancho (cm)",  key: "anchoCm",      width: 12 },
    { header: "Alto (cm)",   key: "altoCm",        width: 12 },
    { header: "Esp. (mm)",   key: "espesormm",     width: 10 },
    { header: "Cant. total", key: "cantidad",      width: 12 },
    { header: "Pieza",       key: "pieza",         width: 30 },
    { header: "Insumo",      key: "insumo",        width: 36 },
    { header: "Código",      key: "muebleCodigo",  width: 14 },
    { header: "Mueble",      key: "muebleNombre",  width: 40 },
    { header: "Cant. mueble",key: "cantMueble",    width: 13 },
  ];

  // Estilo header
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderThin;
  });
  headerRow.height = 22;

  // Una fila por cada combinación (corte × mueble), agrupando visualmente
  let rowIdx = 0;
  for (const fila of ordenadas) {
    const numMuebles = fila.muebles.length;
    for (let i = 0; i < numMuebles; i++) {
      const m = fila.muebles[i];
      const bgColor = rowIdx % 2 === 0 ? "FFFFFFFF" : "FFF5F6FA";
      const row = ws.addRow({
        anchoCm:     i === 0 ? fila.anchoCm  : "",
        altoCm:      i === 0 ? fila.altoCm   : "",
        espesormm:   i === 0 ? (fila.espesormm ?? "") : "",
        cantidad:    i === 0 ? fila.cantidad  : "",
        pieza:       i === 0 ? fila.pieza     : "",
        insumo:      i === 0 ? (fila.insumo ?? "") : "",
        muebleCodigo: m.codigo,
        muebleNombre: m.nombre,
        cantMueble:  m.cantidad,
      });
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.border = borderThin;
        cell.alignment = { vertical: "middle" };
      });
      (["anchoCm","altoCm","espesormm","cantidad","cantMueble"] as const).forEach((k) => {
        const col = ws.columns.findIndex((c) => c.key === k) + 1;
        if (col > 0) row.getCell(col).alignment = { vertical: "middle", horizontal: "center" };
      });
      row.height = 18;
    }
    rowIdx++;
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lista-corte-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
