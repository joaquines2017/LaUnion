import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parsearExcel } from "@/lib/importar-excel";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("archivo") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parsearExcel(buffer);

  // Solo preview — devolver los datos parseados sin persistir
  if (formData.get("preview") === "true") {
    return NextResponse.json(parsed);
  }

  const contadores = {
    proveedores: 0,
    catInsumos: 0,
    catMuebles: 0,
    insumos: 0,
    precios: 0,
    muebles: 0,
    despieMateriales: 0,
    despieInsumos: 0,
    residuales: 0,
  };
  const errores: string[] = [...parsed.errores];

  // ── 1. Categorías de insumo ─────────────────────────────────────────────────
  for (const c of parsed.catInsumos.filter((c) => !c.error)) {
    await prisma.categoriaInsumo.upsert({
      where: { nombre: c.nombre },
      update: { descripcion: c.descripcion || undefined },
      create: { nombre: c.nombre, descripcion: c.descripcion || undefined },
    });
    contadores.catInsumos++;
  }

  // ── 2. Categorías de mueble ─────────────────────────────────────────────────
  for (const c of parsed.catMuebles.filter((c) => !c.error)) {
    await prisma.categoriaMueble.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: { nombre: c.nombre },
    });
    contadores.catMuebles++;
  }

  // ── 3. Proveedores ──────────────────────────────────────────────────────────
  for (const p of parsed.proveedores.filter((p) => !p.error)) {
    const existing = await prisma.proveedor.findFirst({ where: { nombre: p.nombre } });
    if (existing) {
      await prisma.proveedor.update({
        where: { id: existing.id },
        data: {
          cuit: p.cuit || undefined,
          telefono: p.telefono || undefined,
          email: p.email || undefined,
          direccion: p.direccion || undefined,
          observaciones: p.observaciones || undefined,
        },
      });
    } else {
      await prisma.proveedor.create({
        data: {
          nombre: p.nombre,
          cuit: p.cuit || undefined,
          telefono: p.telefono || undefined,
          email: p.email || undefined,
          direccion: p.direccion || undefined,
          observaciones: p.observaciones || undefined,
        },
      });
    }
    contadores.proveedores++;
  }

  // ── 4. Insumos ──────────────────────────────────────────────────────────────
  for (const ins of parsed.insumos.filter((i) => !i.error)) {
    // Obtener o crear categoría
    const cat = await prisma.categoriaInsumo.upsert({
      where: { nombre: ins.categoria },
      update: {},
      create: { nombre: ins.categoria },
    });

    try {
      await prisma.insumo.upsert({
        where: { codigo: ins.codigo },
        update: {
          descripcion: ins.descripcion,
          categoriaId: cat.id,
          unidadMedida: ins.unidad || "unidad",
          espesormm: ins.espesormm ?? undefined,
          altoM: ins.altoM ?? undefined,
          anchoM: ins.anchoM ?? undefined,
          precioBase: ins.precioBase ?? undefined,
        },
        create: {
          codigo: ins.codigo,
          descripcion: ins.descripcion,
          categoriaId: cat.id,
          unidadMedida: ins.unidad || "unidad",
          espesormm: ins.espesormm ?? undefined,
          altoM: ins.altoM ?? undefined,
          anchoM: ins.anchoM ?? undefined,
          precioBase: ins.precioBase ?? undefined,
        },
      });
      contadores.insumos++;
    } catch {
      errores.push(`Fila ${ins.fila}: insumo "${ins.codigo}" — error al importar`);
    }
  }

  // ── 5. Precios ──────────────────────────────────────────────────────────────
  for (const p of parsed.precios.filter((p) => !p.error)) {
    const insumo = await prisma.insumo.findUnique({ where: { codigo: p.codigoInsumo } });
    if (!insumo) {
      errores.push(`Fila ${p.fila}: precio — insumo "${p.codigoInsumo}" no encontrado`);
      continue;
    }
    const proveedor = await prisma.proveedor.findFirst({ where: { nombre: p.proveedor } });
    if (!proveedor) {
      errores.push(`Fila ${p.fila}: precio — proveedor "${p.proveedor}" no encontrado`);
      continue;
    }
    try {
      await prisma.precioProveedor.upsert({
        where: { proveedorId_insumoId: { proveedorId: proveedor.id, insumoId: insumo.id } },
        update: { precio: p.precio, fechaVigencia: new Date() },
        create: {
          proveedorId: proveedor.id,
          insumoId: insumo.id,
          precio: p.precio,
          fechaVigencia: new Date(),
        },
      });
      contadores.precios++;
    } catch {
      errores.push(`Fila ${p.fila}: precio "${p.codigoInsumo} / ${p.proveedor}" — error al importar`);
    }
  }

  // ── 6. Muebles ──────────────────────────────────────────────────────────────
  const categoriaMueblesMap: Record<string, string> = {};

  const nombresCategoriaMueble = [
    ...new Set([
      ...parsed.muebles.filter((m) => !m.error && m.categoria).map((m) => m.categoria),
      ...parsed.despiece.filter((d) => !d.error).map(() => "").filter(Boolean),
    ]),
  ].filter(Boolean);

  for (const nombre of nombresCategoriaMueble) {
    const cat = await prisma.categoriaMueble.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    categoriaMueblesMap[nombre] = cat.id;
  }

  // Categoría fallback
  const catFallback = await prisma.categoriaMueble.upsert({
    where: { nombre: "Sin categoría" },
    update: {},
    create: { nombre: "Sin categoría" },
  });
  categoriaMueblesMap[""] = catFallback.id;

  for (const m of parsed.muebles.filter((m) => !m.error)) {
    const categoriaId = categoriaMueblesMap[m.categoria] ?? catFallback.id;
    try {
      await prisma.mueble.upsert({
        where: { codigo: m.codigo },
        update: { nombre: m.nombre, categoriaId },
        create: { codigo: m.codigo, nombre: m.nombre, categoriaId },
      });
      contadores.muebles++;
    } catch {
      errores.push(`Fila ${m.fila}: mueble "${m.codigo}" — error al importar`);
    }
  }

  // ── 7. Despiece (nuevo formato: DespiMat + DespiInsumos) ────────────────────

  // Mapas de lookup (precargados para eficiencia)
  const codigosMueble = [
    ...new Set([
      ...parsed.despieMateriales.map((d) => d.codigoMueble),
      ...parsed.despieInsumos.map((d) => d.codigoMueble),
      ...parsed.despiece.map((d) => d.codigoMueble),
    ]),
  ].filter(Boolean);

  const mueblesPorCodigo: Record<string, string> = {};
  for (const codigo of codigosMueble) {
    const mueble = await prisma.mueble.findUnique({ where: { codigo }, select: { id: true } });
    if (mueble) mueblesPorCodigo[codigo] = mueble.id;
  }

  const codigosInsumo = [
    ...new Set([
      ...parsed.despieMateriales.map((d) => d.codigoInsumo).filter(Boolean),
      ...parsed.despieInsumos.map((d) => d.codigoInsumo).filter(Boolean),
      ...parsed.despiece.map((d) => d.codigoInsumo).filter(Boolean) as string[],
    ]),
  ];

  const insumosPorCodigo: Record<string, { id: string; precioRef: number | null }> = {};
  for (const codigo of codigosInsumo) {
    const insumo = await prisma.insumo.findUnique({
      where: { codigo },
      select: {
        id: true,
        precioBase: true,
        precios: {
          where: { estado: "vigente" },
          orderBy: { precio: "asc" },
          take: 1,
          select: { precio: true },
        },
      },
    });
    if (insumo) {
      const precioRef =
        insumo.precios[0] != null
          ? Number(insumo.precios[0].precio)
          : insumo.precioBase != null
          ? Number(insumo.precioBase)
          : null;
      insumosPorCodigo[codigo] = { id: insumo.id, precioRef };
    }
  }

  // DespiMat
  for (const d of parsed.despieMateriales.filter((d) => !d.error)) {
    const muebleId = mueblesPorCodigo[d.codigoMueble];
    if (!muebleId) {
      errores.push(`Fila ${d.fila}: despiece material — mueble "${d.codigoMueble}" no encontrado`);
      continue;
    }
    const insumoRef = d.codigoInsumo ? insumosPorCodigo[d.codigoInsumo] : undefined;
    const costoUnitario = d.precioUnitario ?? insumoRef?.precioRef ?? 0;
    const costoTotal = costoUnitario * d.cantidad;

    await prisma.despieceMaterial.create({
      data: {
        muebleId,
        insumoId: insumoRef?.id ?? null,
        productoNombre: d.descripcion,
        medidas: d.medidas,
        cantidad: d.cantidad,
        costoUnitario,
        costoTotal,
      },
    });
    contadores.despieMateriales++;
  }

  // DespiInsumos
  for (const d of parsed.despieInsumos.filter((d) => !d.error)) {
    const muebleId = mueblesPorCodigo[d.codigoMueble];
    if (!muebleId) {
      errores.push(`Fila ${d.fila}: despiece insumo — mueble "${d.codigoMueble}" no encontrado`);
      continue;
    }
    const insumoRef = d.codigoInsumo ? insumosPorCodigo[d.codigoInsumo] : undefined;
    const costoUnitario = d.precioUnitario ?? insumoRef?.precioRef ?? 0;
    const costoTotal = costoUnitario * d.cantidad;

    await prisma.despieceInsumo.create({
      data: {
        muebleId,
        insumoId: insumoRef?.id ?? null,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        costoUnitario,
        costoTotal,
      },
    });
    contadores.despieInsumos++;
  }

  // Formato legacy
  for (const d of parsed.despiece.filter((d) => !d.error)) {
    const muebleId = mueblesPorCodigo[d.codigoMueble];
    if (!muebleId) {
      errores.push(`Fila ${d.fila}: despiece — mueble "${d.codigoMueble}" no encontrado`);
      continue;
    }
    const insumoRef = d.codigoInsumo ? insumosPorCodigo[d.codigoInsumo] : undefined;
    const costoTotal = d.costoUnitario * d.cantidad;

    if (d.tipo === "material") {
      await prisma.despieceMaterial.create({
        data: {
          muebleId,
          insumoId: insumoRef?.id ?? null,
          productoNombre: d.descripcion,
          medidas: d.medidas,
          cantidad: d.cantidad,
          costoUnitario: d.costoUnitario,
          costoTotal,
        },
      });
    } else {
      await prisma.despieceInsumo.create({
        data: {
          muebleId,
          insumoId: insumoRef?.id ?? null,
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          costoUnitario: d.costoUnitario,
          costoTotal,
        },
      });
    }
    contadores.despieMateriales++;
  }

  // ── 8. Residuales ───────────────────────────────────────────────────────────
  for (const r of parsed.residuales.filter((r) => !r.error)) {
    const insumo = await prisma.insumo.findUnique({ where: { codigo: r.codigoInsumo } });
    if (!insumo) {
      errores.push(`Fila ${r.fila}: residual — insumo "${r.codigoInsumo}" no encontrado`);
      continue;
    }
    await prisma.materialResidual.create({
      data: {
        insumoId: insumo.id,
        altoCm: r.altoCm,
        anchoCm: r.anchoCm,
        cantidad: r.cantidad,
        nota: r.nota || undefined,
      },
    });
    contadores.residuales++;
  }

  // ── 9. Recalcular costoActual de muebles afectados ──────────────────────────
  const muebleIdsAfectados = new Set(Object.values(mueblesPorCodigo));
  for (const muebleId of muebleIdsAfectados) {
    const [mat, ins] = await Promise.all([
      prisma.despieceMaterial.findMany({ where: { muebleId } }),
      prisma.despieceInsumo.findMany({ where: { muebleId } }),
    ]);
    const costoActual =
      mat.reduce((s, m) => s + Number(m.costoTotal), 0) +
      ins.reduce((s, i) => s + Number(i.costoTotal), 0);
    await prisma.mueble.update({ where: { id: muebleId }, data: { costoActual } });
  }

  return NextResponse.json({ ok: true, contadores, errores });
}
