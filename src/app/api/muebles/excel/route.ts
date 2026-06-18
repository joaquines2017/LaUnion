import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const categoriaId = searchParams.get("categoriaId") ?? undefined;
  const estadoFiltro = (searchParams.get("estado") ?? "activo") as "activo" | "inactivo";

  const muebles = await prisma.mueble.findMany({
    where: {
      empresaId,
      estado: estadoFiltro,
      ...(categoriaId ? { categoriaId } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { codigo: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ categoria: { nombre: "asc" } }, { codigo: "asc" }],
    include: {
      categoria: { select: { nombre: true } },
      _count: { select: { materiales: true, insumos: true } },
    },
  });

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A2035" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const borderThin: Partial<ExcelJS.Borders> = {
    top:    { style: "thin", color: { argb: "FFE0E3EA" } },
    bottom: { style: "thin", color: { argb: "FFE0E3EA" } },
    left:   { style: "thin", color: { argb: "FFE0E3EA" } },
    right:  { style: "thin", color: { argb: "FFE0E3EA" } },
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = "LaUnion";
  wb.created = new Date();

  const ws = wb.addWorksheet("Muebles");
  ws.columns = [
    { header: "Código",     key: "codigo",    width: 16 },
    { header: "Nombre",     key: "nombre",    width: 42 },
    { header: "Categoría",  key: "categoria", width: 22 },
    { header: "Ítems",      key: "items",     width: 10 },
    { header: "Costo",      key: "costo",     width: 18 },
    { header: "Estado",     key: "estado",    width: 12 },
  ];

  const hRow = ws.getRow(1);
  hRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderThin;
  });
  hRow.height = 22;

  let costoTotal = 0;
  muebles.forEach((m, idx) => {
    const costo = Number(m.costoActual);
    const items = m._count.materiales + m._count.insumos;
    costoTotal += costo;

    const bgColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF5F6FA";
    const row = ws.addRow({
      codigo:    m.codigo,
      nombre:    m.nombre,
      categoria: m.categoria.nombre,
      items:     items,
      costo:     costo > 0 ? costo : null,
      estado:    m.estado,
    });
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = borderThin;
      cell.alignment = { vertical: "middle" };
    });
    const costoCell = row.getCell("costo");
    if (costo > 0) {
      costoCell.numFmt = '"$"#,##0.00';
      costoCell.alignment = { vertical: "middle", horizontal: "right" };
    }
    row.getCell("items").alignment = { vertical: "middle", horizontal: "center" };
    row.getCell("codigo").font = { name: "Courier New", size: 9 };
    row.height = 18;
  });

  // Fila de totales
  if (muebles.length > 0) {
    const totalRow = ws.addRow({ nombre: `TOTAL (${muebles.length} muebles)`, costo: costoTotal > 0 ? costoTotal : null });
    totalRow.font = { bold: true };
    totalRow.getCell("nombre").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
    totalRow.getCell("costo").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
    if (costoTotal > 0) {
      totalRow.getCell("costo").numFmt = '"$"#,##0.00';
      totalRow.getCell("costo").alignment = { vertical: "middle", horizontal: "right" };
    }
    totalRow.height = 20;
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };

  const buffer = await wb.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="muebles-${fecha}.xlsx"`,
    },
  });
}
