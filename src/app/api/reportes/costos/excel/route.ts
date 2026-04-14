import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoriaId = searchParams.get("categoriaId");
  const estado = searchParams.get("estado") ?? "activo";

  const muebles = await prisma.mueble.findMany({
    where: {
      estado,
      categoriaId: categoriaId ?? undefined,
    },
    orderBy: [{ categoria: { nombre: "asc" } }, { codigo: "asc" }],
    include: {
      categoria: { select: { nombre: true } },
      _count: { select: { materiales: true, insumos: true } },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LaUnion Sistema de Costeo";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Costos de Muebles");

  // Encabezado general
  sheet.mergeCells("A1:F1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "Lista de Costos — La Union Muebles";
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1A2035" } };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells("A2:F2");
  const subtitleCell = sheet.getCell("A2");
  subtitleCell.value = `Generado el ${new Date().toLocaleDateString("es-AR")} — ${muebles.length} mueble${muebles.length !== 1 ? "s" : ""}`;
  subtitleCell.font = { size: 10, color: { argb: "FF666666" } };
  subtitleCell.alignment = { horizontal: "center" };

  sheet.addRow([]); // fila vacía

  // Cabecera
  const headerRow = sheet.addRow([
    "Código",
    "Nombre",
    "Categoría",
    "Costo actual (ARS)",
    "Ítems despiece",
    "Última actualización",
  ]);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1976D2" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });
  headerRow.height = 24;

  // Anchos de columna
  sheet.getColumn(1).width = 16;
  sheet.getColumn(2).width = 40;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 22;
  sheet.getColumn(5).width = 15;
  sheet.getColumn(6).width = 22;

  // Datos
  let rowIndex = 0;
  for (const m of muebles) {
    const dataRow = sheet.addRow([
      m.codigo,
      m.nombre,
      m.categoria.nombre,
      Number(m.costoActual),
      m._count.materiales + m._count.insumos,
      m.updatedAt.toLocaleDateString("es-AR"),
    ]);

    // Alternating row color
    if (rowIndex % 2 === 0) {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F6FA" },
        };
      });
    }

    // Formato de precio
    dataRow.getCell(4).numFmt = '"$"#,##0.00';
    dataRow.getCell(4).alignment = { horizontal: "right" };
    dataRow.getCell(5).alignment = { horizontal: "center" };
    dataRow.getCell(1).font = { name: "Courier New" };

    rowIndex++;
  }

  // Fila de total
  sheet.addRow([]);
  const totalRow = sheet.addRow([
    "",
    "TOTAL",
    "",
    muebles.reduce((s, m) => s + Number(m.costoActual), 0),
    "",
    "",
  ]);
  totalRow.getCell(2).font = { bold: true };
  totalRow.getCell(4).numFmt = '"$"#,##0.00';
  totalRow.getCell(4).font = { bold: true };
  totalRow.getCell(4).alignment = { horizontal: "right" };

  // Autofilter en la cabecera
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4 + muebles.length, column: 6 },
  };

  // Freeze header
  sheet.views = [{ state: "frozen", ySplit: 4 }];

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="costos-muebles-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
