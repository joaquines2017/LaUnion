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

  const insumos = await prisma.insumo.findMany({
    where: {
      empresaId,
      estado: estadoFiltro,
      ...(categoriaId ? { categoriaId } : {}),
      ...(q
        ? {
            OR: [
              { descripcion: { contains: q, mode: "insensitive" } },
              { codigo: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ categoria: { nombre: "asc" } }, { descripcion: "asc" }],
    include: {
      categoria: { select: { nombre: true } },
      precios: {
        where: { estado: "vigente" },
        orderBy: { precio: "asc" },
        include: { proveedor: { select: { nombre: true } } },
      },
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

  // ── Hoja 1: Lista de insumos ──────────────────────────────────────────────
  const ws = wb.addWorksheet("Insumos");
  ws.columns = [
    { header: "Código",        key: "codigo",      width: 14 },
    { header: "Descripción",   key: "descripcion", width: 40 },
    { header: "Categoría",     key: "categoria",   width: 20 },
    { header: "Unidad",        key: "unidad",      width: 10 },
    { header: "Precio ref.",   key: "precioRef",   width: 16 },
    { header: "Proveedor",     key: "proveedor",   width: 28 },
    { header: "Precios vigentes", key: "cantPrecios", width: 14 },
    { header: "Alto (m)",      key: "altoM",       width: 10 },
    { header: "Ancho (m)",     key: "anchoM",      width: 10 },
    { header: "Espesor (mm)",  key: "espesormm",   width: 12 },
    { header: "Estado",        key: "estado",      width: 10 },
  ];

  const hRow = ws.getRow(1);
  hRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderThin;
  });
  hRow.height = 22;

  insumos.forEach((ins, idx) => {
    const precioRef =
      (ins.precioSeleccionadoId
        ? ins.precios.find((p) => p.id === ins.precioSeleccionadoId)
        : undefined) ??
      ins.precios[0] ??
      null;
    const precioNum = precioRef ? Number(precioRef.precio) : (ins.precioBase ? Number(ins.precioBase) : null);

    const bgColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF5F6FA";
    const row = ws.addRow({
      codigo:      ins.codigo,
      descripcion: ins.descripcion,
      categoria:   ins.categoria.nombre,
      unidad:      ins.unidadMedida,
      precioRef:   precioNum,
      proveedor:   precioRef?.proveedor?.nombre ?? "—",
      cantPrecios: ins.precios.length,
      altoM:       ins.altoM ?? "",
      anchoM:      ins.anchoM ?? "",
      espesormm:   ins.espesormm ?? "",
      estado:      ins.estado,
    });
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = borderThin;
      cell.alignment = { vertical: "middle" };
    });
    // Precio: formato moneda
    const precioCell = row.getCell("precioRef");
    if (precioNum !== null) {
      precioCell.numFmt = '"$"#,##0.00';
      precioCell.alignment = { vertical: "middle", horizontal: "right" };
    }
    // Centrar numéricos
    (["cantPrecios", "altoM", "anchoM", "espesormm"] as const).forEach((k) => {
      row.getCell(k).alignment = { vertical: "middle", horizontal: "center" };
    });
    row.height = 18;
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  // ── Hoja 2: Precios vigentes detallados ───────────────────────────────────
  const insumosConPrecios = insumos.filter((i) => i.precios.length > 0);
  if (insumosConPrecios.length > 0) {
    const ws2 = wb.addWorksheet("Precios Vigentes");
    ws2.columns = [
      { header: "Código",       key: "codigo",      width: 14 },
      { header: "Descripción",  key: "descripcion", width: 40 },
      { header: "Categoría",    key: "categoria",   width: 20 },
      { header: "Proveedor",    key: "proveedor",   width: 28 },
      { header: "Precio",       key: "precio",      width: 16 },
      { header: "Es ref.",      key: "esRef",       width: 8 },
    ];

    const hRow2 = ws2.getRow(1);
    hRow2.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderThin;
    });
    hRow2.height = 22;

    let rowIdx = 0;
    for (const ins of insumosConPrecios) {
      for (const p of ins.precios) {
        const esRef = ins.precioSeleccionadoId === p.id || (!ins.precioSeleccionadoId && p === ins.precios[0]);
        const bgColor = rowIdx % 2 === 0 ? "FFFFFFFF" : "FFF5F6FA";
        const row = ws2.addRow({
          codigo:      ins.codigo,
          descripcion: ins.descripcion,
          categoria:   ins.categoria.nombre,
          proveedor:   p.proveedor.nombre,
          precio:      Number(p.precio),
          esRef:       esRef ? "✓" : "",
        });
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          cell.border = borderThin;
          cell.alignment = { vertical: "middle" };
        });
        row.getCell("precio").numFmt = '"$"#,##0.00';
        row.getCell("precio").alignment = { vertical: "middle", horizontal: "right" };
        row.getCell("esRef").alignment = { vertical: "middle", horizontal: "center" };
        if (esRef) row.getCell("esRef").font = { bold: true, color: { argb: "FF2E7D32" } };
        row.height = 18;
        rowIdx++;
      }
    }

    ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws2.columns.length } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="insumos-${fecha}.xlsx"`,
    },
  });
}
