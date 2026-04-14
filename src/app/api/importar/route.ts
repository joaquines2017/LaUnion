import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parsearExcel } from "@/lib/importar-excel";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("archivo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parsearExcel(buffer);

  // Solo preview — devolver los datos sin persistir
  const preview = formData.get("preview");
  if (preview === "true") {
    return NextResponse.json(parsed);
  }

  // ── Importar muebles ────────────────────────────────────────────────────

  // Obtener o crear categorías
  const categoriasUnicas = [
    ...new Set(parsed.muebles.map((m) => m.categoria).filter(Boolean)),
  ];
  const categoriasMap: Record<string, string> = {};

  for (const nombre of categoriasUnicas) {
    const cat = await prisma.categoriaMueble.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    categoriasMap[nombre] = cat.id;
  }

  // Si hay muebles sin categoría, usar "Sin categoría"
  if (parsed.muebles.some((m) => !m.categoria)) {
    const cat = await prisma.categoriaMueble.upsert({
      where: { nombre: "Sin categoría" },
      update: {},
      create: { nombre: "Sin categoría" },
    });
    categoriasMap[""] = cat.id;
  }

  let mueblesCreadoss = 0;
  let mueblesSaltados = 0;
  const erroresMuebles: string[] = [];

  for (const m of parsed.muebles.filter((m) => !m.error)) {
    const categoriaId = categoriasMap[m.categoria] ?? categoriasMap[""];
    if (!categoriaId) continue;

    try {
      await prisma.mueble.upsert({
        where: { codigo: m.codigo },
        update: { nombre: m.nombre, categoriaId },
        create: { codigo: m.codigo, nombre: m.nombre, categoriaId },
      });
      mueblesCreadoss++;
    } catch {
      mueblesSaltados++;
      erroresMuebles.push(`Fila ${m.fila}: ${m.codigo} — error al importar`);
    }
  }

  // ── Importar despiece (si hay) ──────────────────────────────────────────

  let despieceCreadoss = 0;

  if (parsed.despiece.length > 0) {
    // Mapear códigos de mueble → id
    const codigosMueble = [
      ...new Set(parsed.despiece.map((d) => d.codigoMueble)),
    ];
    const mueblesPorCodigo: Record<string, string> = {};

    for (const codigo of codigosMueble) {
      const mueble = await prisma.mueble.findUnique({
        where: { codigo },
        select: { id: true },
      });
      if (mueble) mueblesPorCodigo[codigo] = mueble.id;
    }

    // Mapear códigos de insumo → id
    const codigosInsumo = [
      ...new Set(
        parsed.despiece
          .map((d) => d.codigoInsumo)
          .filter(Boolean) as string[]
      ),
    ];
    const insumosPorCodigo: Record<string, string> = {};

    for (const codigo of codigosInsumo) {
      const insumo = await prisma.insumo.findUnique({
        where: { codigo },
        select: {
          id: true,
          precios: {
            where: { estado: "vigente" },
            orderBy: { precio: "asc" },
            take: 1,
            select: { precio: true },
          },
        },
      });
      if (insumo) insumosPorCodigo[codigo] = insumo.id;
    }

    for (const d of parsed.despiece.filter((d) => !d.error)) {
      const muebleId = mueblesPorCodigo[d.codigoMueble];
      if (!muebleId) continue;

      const insumoId = d.codigoInsumo
        ? insumosPorCodigo[d.codigoInsumo]
        : undefined;
      const costoTotal = d.cantidad * d.costoUnitario;

      if (d.tipo === "material") {
        await prisma.despieceMaterial.create({
          data: {
            muebleId,
            insumoId: insumoId ?? null,
            productoNombre: d.descripcion,
            medidas: d.medidas,
            cantidad: d.cantidad,
            costoUnitario: d.costoUnitario,
            costoTotal,
            orden: despieceCreadoss,
          },
        });
      } else {
        await prisma.despieceInsumo.create({
          data: {
            muebleId,
            insumoId: insumoId ?? null,
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            costoUnitario: d.costoUnitario,
            costoTotal,
            orden: despieceCreadoss,
          },
        });
      }

      despieceCreadoss++;
    }

    // Actualizar costoActual de todos los muebles importados
    for (const [codigo, muebleId] of Object.entries(mueblesPorCodigo)) {
      const [mat, ins] = await Promise.all([
        prisma.despieceMaterial.findMany({ where: { muebleId } }),
        prisma.despieceInsumo.findMany({ where: { muebleId } }),
      ]);
      const costoActual =
        mat.reduce((s, m) => s + Number(m.costoTotal), 0) +
        ins.reduce((s, i) => s + Number(i.costoTotal), 0);
      await prisma.mueble.update({
        where: { id: muebleId },
        data: { costoActual },
      });
      void codigo; // solo para evitar warning de variable no usada
    }
  }

  return NextResponse.json({
    ok: true,
    muebles: { creados: mueblesCreadoss, saltados: mueblesSaltados },
    despiece: { creados: despieceCreadoss },
    errores: [...parsed.errores, ...erroresMuebles],
  });
}
