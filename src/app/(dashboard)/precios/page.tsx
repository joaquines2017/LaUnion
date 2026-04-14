import { prisma } from "@/lib/prisma";
import { GestionPrecios } from "@/components/precios/GestionPrecios";
import { Suspense } from "react";

export default async function PreciosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    proveedorId?: string;
    categoriaId?: string;
    page?: string;
  }>;
}) {
  const { q, proveedorId, categoriaId, page } = await searchParams;

  const paginaActual = Math.max(1, Number(page) || 1);
  const itemsPorPagina = 30;
  const skip = (paginaActual - 1) * itemsPorPagina;

  const where = {
    estado: "vigente" as const,
    ...(proveedorId ? { proveedorId } : {}),
    insumo: {
      estado: "activo" as const,
      ...(categoriaId ? { categoriaId } : {}),
      ...(q
        ? {
            OR: [
              { descripcion: { contains: q, mode: "insensitive" as const } },
              { codigo: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  };

  const [precios, totalItems, proveedores, categorias, config] = await Promise.all([
    prisma.precioProveedor.findMany({
      where,
      orderBy: [
        { insumo: { categoria: { nombre: "asc" } } },
        { insumo: { descripcion: "asc" } },
        { proveedor: { nombre: "asc" } },
      ],
      skip,
      take: itemsPorPagina,
      include: {
        insumo: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            categoriaId: true,
            categoria: { select: { nombre: true } },
          },
        },
        proveedor: { select: { nombre: true } },
      },
    }),
    prisma.precioProveedor.count({ where }),
    prisma.proveedor.findMany({ where: { estado: "activo" }, orderBy: { nombre: "asc" } }),
    prisma.categoriaInsumo.findMany({ orderBy: { nombre: "asc" } }),
    prisma.configuracionGlobal.findUnique({ where: { id: "1" } }),
  ]);

  const vigenciaDias = config?.vigenciaPrecioDias ?? 30;
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - vigenciaDias);

  const preciosSerialized = precios.map((p) => ({
    id: p.id,
    insumoId: p.insumoId,
    proveedorId: p.proveedorId,
    precio: p.precio.toString(),
    fechaVigencia: p.fechaVigencia.toISOString(),
    desactualizado: new Date(p.fechaVigencia) < fechaLimite,
    insumo: {
      codigo: p.insumo.codigo,
      descripcion: p.insumo.descripcion,
      categoriaId: p.insumo.categoriaId,
      categoria: { nombre: p.insumo.categoria.nombre },
    },
    proveedor: { nombre: p.proveedor.nombre },
  }));

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Precios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestión centralizada de precios por proveedor. Hacé clic en el lápiz para editar.
        </p>
      </div>

      <Suspense>
        <GestionPrecios
          precios={preciosSerialized}
          proveedores={proveedores}
          categorias={categorias}
          proveedorIdFiltro={proveedorId}
          categoriaIdFiltro={categoriaId}
          q={q}
          vigenciaDias={vigenciaDias}
          paginaActual={paginaActual}
          totalItems={totalItems}
          itemsPorPagina={itemsPorPagina}
        />
      </Suspense>
    </div>
  );
}
