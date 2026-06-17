import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import ExcelJS from "exceljs";

export async function GET() {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const items = await prisma.materialResidual.findMany({
    where: { empresaId, estado: "disponible" },
    orderBy: [{ insumo: { descripcion: "asc" } }, { createdAt: "asc" }],
    include: {
      insumo: { select: { descripcion: true, espesormm: true, altoM: true, anchoM: true } },
      reservas: { include: { mueble: { select: { codigo: true, nombre: true } } } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "LaUnion";
  wb.created = new Date();

  const ws = wb.addWorksheet("Retazos Disponibles");

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A2035" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const borderThin: Partial<ExcelJS.Borders> = {
    top:    { style: "thin", color: { argb: "FFE0E3EA" } },
    bottom: { style: "thin", color: { argb: "FFE0E3EA" } },
    left:   { style: "thin", color: { argb: "FFE0E3EA" } },
    right:  { style: "thin", color: { argb: "FFE0E3EA" } },
  };

  ws.columns = [
    { header: "Material",       key: "material",   width: 40 },
    { header: "Esp. (mm)",      key: "espesormm",  width: 10 },
    { header: "Alto (cm)",      key: "altoCm",     width: 11 },
    { header: "Ancho (cm)",     key: "anchoCm",    width: 11 },
    { header: "Cantidad",       key: "cantidad",   width: 10 },
    { header: "Área unit. (m²)",key: "areaUnit",   width: 14 },
    { header: "Área total (m²)",key: "areaTotal",  width: 14 },
    { header: "Nota",           key: "nota",       width: 30 },
    { header: "Asignado a",     key: "asignado",   width: 40 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderThin;
  });
  headerRow.height = 22;

  items.forEach((item, idx) => {
    const areaUnit  = (item.altoCm * item.anchoCm) / 10000;
    const areaTotal = areaUnit * item.cantidad;
    const asignado  = item.reservas
      .map((r) => `${r.mueble.codigo} ${r.mueble.nombre} ×${r.cantidadAsignada}`)
      .join(", ");

    const bgColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF5F6FA";
    const row = ws.addRow({
      material:  item.insumo.descripcion,
      espesormm: item.insumo.espesormm ?? "",
      altoCm:    item.altoCm,
      anchoCm:   item.anchoCm,
      cantidad:  item.cantidad,
      areaUnit:  Math.round(areaUnit * 10000) / 10000,
      areaTotal: Math.round(areaTotal * 10000) / 10000,
      nota:      item.nota ?? "",
      asignado,
    });
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = borderThin;
      cell.alignment = { vertical: "middle" };
    });
    (["espesormm", "altoCm", "anchoCm", "cantidad", "areaUnit", "areaTotal"] as const).forEach((k) => {
      const colIdx = ws.columns.findIndex((c) => c.key === k) + 1;
      if (colIdx > 0) row.getCell(colIdx).alignment = { vertical: "middle", horizontal: "center" };
    });
    row.height = 18;
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  // Hoja resumen por material (solo placas con dimensiones)
  const placas = items.filter((i) => i.insumo.altoM && i.insumo.anchoM);
  if (placas.length > 0) {
    const wsRes = wb.addWorksheet("Stock en Placas");
    wsRes.columns = [
      { header: "Material",            key: "material",     width: 40 },
      { header: "Esp. (mm)",           key: "espesormm",    width: 10 },
      { header: "Placa (m)",           key: "dimPlaca",     width: 16 },
      { header: "Área placa (m²)",     key: "areaPlaca",    width: 15 },
      { header: "Retazos",             key: "retazos",      width: 10 },
      { header: "Área retazos (m²)",   key: "areaRetazos",  width: 16 },
      { header: "Placas equivalentes", key: "placasEq",     width: 18 },
    ];
    const hRow = wsRes.getRow(1);
    hRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderThin;
    });
    hRow.height = 22;

    const grupos = new Map<string, { material: string; espesormm: number | null; altoM: number; anchoM: number; retazos: number; areaRetazos: number }>();
    for (const item of placas) {
      if (!grupos.has(item.insumoId)) {
        grupos.set(item.insumoId, {
          material: item.insumo.descripcion,
          espesormm: item.insumo.espesormm,
          altoM: item.insumo.altoM!,
          anchoM: item.insumo.anchoM!,
          retazos: 0,
          areaRetazos: 0,
        });
      }
      const g = grupos.get(item.insumoId)!;
      g.retazos += item.cantidad;
      g.areaRetazos += (item.altoCm * item.anchoCm * item.cantidad) / 10000;
    }

    [...grupos.values()].sort((a, b) => b.areaRetazos - a.areaRetazos).forEach((g, idx) => {
      const areaPlaca = g.altoM * g.anchoM;
      const placasEq = g.areaRetazos / areaPlaca;
      const bgColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF5F6FA";
      const row = wsRes.addRow({
        material:    g.material,
        espesormm:   g.espesormm ?? "",
        dimPlaca:    `${g.altoM.toFixed(2)} × ${g.anchoM.toFixed(2)}`,
        areaPlaca:   Math.round(areaPlaca * 10000) / 10000,
        retazos:     g.retazos,
        areaRetazos: Math.round(g.areaRetazos * 10000) / 10000,
        placasEq:    Math.round(placasEq * 100) / 100,
      });
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.border = borderThin;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      row.getCell(1).alignment = { vertical: "middle" };
      row.height = 18;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="retazos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
