import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { parsearExcel } from "@/lib/importar-excel";

export async function POST(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

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

  // RFO-001: toda la importación corre dentro de una única transacción para
  // evitar estados parciales/inconsistentes si falla a mitad de camino
  // (p. ej. muebles creados sin su despiece). `timeout` se eleva por encima
  // del default (5s) porque una importación típica encadena cientos de
  // queries secuenciales.
  await prisma.$transaction(async (tx) => {
    // ── 1. Categorías de insumo ─────────────────────────────────────────────────
    for (const c of parsed.catInsumos.filter((c) => !c.error)) {
      await tx.categoriaInsumo.upsert({
        where: { empresaId_nombre: { empresaId, nombre: c.nombre } },
        update: { descripcion: c.descripcion || undefined },
        create: { empresaId, nombre: c.nombre, descripcion: c.descripcion || undefined },
      });
      contadores.catInsumos++;
    }

    // ── 2. Categorías de mueble ─────────────────────────────────────────────────
    for (const c of parsed.catMuebles.filter((c) => !c.error)) {
      await tx.categoriaMueble.upsert({
        where: { empresaId_nombre: { empresaId, nombre: c.nombre } },
        update: {},
        create: { empresaId, nombre: c.nombre },
      });
      contadores.catMuebles++;
    }

    // ── 3. Proveedores ──────────────────────────────────────────────────────────
    for (const p of parsed.proveedores.filter((p) => !p.error)) {
      const existing = await tx.proveedor.findFirst({ where: { nombre: p.nombre, empresaId } });
      if (existing) {
        await tx.proveedor.update({
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
        await tx.proveedor.create({
          data: {
            empresaId,
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
      const cat = await tx.categoriaInsumo.upsert({
        where: { empresaId_nombre: { empresaId, nombre: ins.categoria } },
        update: {},
        create: { empresaId, nombre: ins.categoria },
      });

      try {
        await tx.insumo.upsert({
          where: { empresaId_codigo: { empresaId, codigo: ins.codigo } },
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
            empresaId,
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
      const insumo = await tx.insumo.findFirst({ where: { codigo: p.codigoInsumo, empresaId } });
      if (!insumo) {
        errores.push(`Fila ${p.fila}: precio — insumo "${p.codigoInsumo}" no encontrado`);
        continue;
      }
      const proveedor = await tx.proveedor.findFirst({ where: { nombre: p.proveedor, empresaId } });
      if (!proveedor) {
        errores.push(`Fila ${p.fila}: precio — proveedor "${p.proveedor}" no encontrado`);
        continue;
      }
      try {
        await tx.precioProveedor.upsert({
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
      const cat = await tx.categoriaMueble.upsert({
        where: { empresaId_nombre: { empresaId, nombre } },
        update: {},
        create: { empresaId, nombre },
      });
      categoriaMueblesMap[nombre] = cat.id;
    }

    // Categoría fallback
    const catFallback = await tx.categoriaMueble.upsert({
      where: { empresaId_nombre: { empresaId, nombre: "Sin categoría" } },
      update: {},
      create: { empresaId, nombre: "Sin categoría" },
    });
    categoriaMueblesMap[""] = catFallback.id;

    for (const m of parsed.muebles.filter((m) => !m.error)) {
      const categoriaId = categoriaMueblesMap[m.categoria] ?? catFallback.id;
      try {
        await tx.mueble.upsert({
          where: { empresaId_codigo: { empresaId, codigo: m.codigo } },
          update: { nombre: m.nombre, categoriaId },
          create: { empresaId, codigo: m.codigo, nombre: m.nombre, categoriaId },
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
      const mueble = await tx.mueble.findFirst({ where: { codigo, empresaId }, select: { id: true } });
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
      const insumo = await tx.insumo.findFirst({
        where: { codigo, empresaId },
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

      await tx.despieceMaterial.create({
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

      await tx.despieceInsumo.create({
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
        await tx.despieceMaterial.create({
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
        await tx.despieceInsumo.create({
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
      const insumo = await tx.insumo.findFirst({ where: { codigo: r.codigoInsumo, empresaId } });
      if (!insumo) {
        errores.push(`Fila ${r.fila}: residual — insumo "${r.codigoInsumo}" no encontrado`);
        continue;
      }
      await tx.materialResidual.create({
        data: {
          empresaId,
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
        tx.despieceMaterial.findMany({ where: { muebleId } }),
        tx.despieceInsumo.findMany({ where: { muebleId } }),
      ]);
      const costoActual =
        mat.reduce((s, m) => s + Number(m.costoTotal), 0) +
        ins.reduce((s, i) => s + Number(i.costoTotal), 0);
      await tx.mueble.update({ where: { id: muebleId }, data: { costoActual } });
    }
  }, { maxWait: 10000, timeout: 120000 });

  return NextResponse.json({ ok: true, contadores, errores });
}
