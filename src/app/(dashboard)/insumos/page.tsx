import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import { FiltrosBusqueda } from "@/components/shared/FiltrosBusqueda";
import { AccionesTabla } from "@/components/shared/AccionesTabla";
import { PaginadorTabla } from "@/components/shared/PaginadorTabla";
import { Suspense } from "react";

export default async function InsumosPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoriaId?: string;
    q?: string;
    estado?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { categoriaId, q, estado, page, pageSize } = await searchParams;

  const estadoFiltro = estado ?? "activo";
  const paginaActual = Math.max(1, Number(page) || 1);
  const itemsPorPagina = Number(pageSize) || 20;
  const skip = (paginaActual - 1) * itemsPorPagina;

  const where = {
    estado: estadoFiltro as "activo" | "inactivo",
    categoriaId: categoriaId ?? undefined,
    ...(q
      ? {
          OR: [
            { descripcion: { contains: q, mode: "insensitive" as const } },
            { codigo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [insumos, totalItems, categorias] = await Promise.all([
    prisma.insumo.findMany({
      where,
      orderBy: [{ categoria: { nombre: "asc" } }, { descripcion: "asc" }],
      skip,
      take: itemsPorPagina,
      include: {
        categoria: { select: { nombre: true } },
        precios: {
          where: { estado: "vigente" },
          orderBy: { precio: "asc" },
          include: { proveedor: { select: { nombre: true } } },
        },
      },
    }),
    prisma.insumo.count({ where }),
    prisma.categoriaInsumo.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Insumos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalItems} resultado{totalItems !== 1 ? "s" : ""}
            {estadoFiltro === "inactivo" && " · inactivos"}
          </p>
        </div>
        <Button asChild>
          <Link href="/insumos/nuevo">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo insumo
          </Link>
        </Button>
      </div>

      {/* Búsqueda y filtro activo/inactivo */}
      <Suspense>
        <FiltrosBusqueda placeholder="Buscar por código o descripción…" />
      </Suspense>

      {/* Filtros por categoría */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/insumos?estado=${estadoFiltro}${q ? `&q=${q}` : ""}`}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            !categoriaId
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground border border-border hover:bg-secondary"
          }`}
        >
          Todas
        </Link>
        {categorias.map((c) => (
          <Link
            key={c.id}
            href={`/insumos?categoriaId=${c.id}&estado=${estadoFiltro}${q ? `&q=${q}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              categoriaId === c.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:bg-secondary"
            }`}
          >
            {c.nombre}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/70 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Código
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Descripción
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Categoría
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Unidad
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Precio ref.
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Proveedor
              </th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {insumos.map((i) => {
              const precioMin = i.precios[0];
              return (
                <tr
                  key={i.id}
                  className={`hover:bg-secondary/40 transition-colors ${
                    estadoFiltro === "inactivo" ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {i.codigo}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {i.descripcion}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {i.categoria.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {i.unidadMedida}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground tabular-nums">
                    {precioMin ? (
                      formatearPrecio(Number(precioMin.precio))
                    ) : (
                      <span className="font-sans font-normal text-muted-foreground/60 text-xs">
                        Sin precio
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {precioMin?.proveedor.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <AccionesTabla
                      id={i.id}
                      entidad="insumos"
                      nombre={i.descripcion}
                      estadoActual={i.estado}
                    />
                  </td>
                </tr>
              );
            })}
            {insumos.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-muted-foreground text-sm"
                >
                  {q
                    ? `Sin resultados para "${q}"`
                    : estadoFiltro === "inactivo"
                    ? "No hay insumos inactivos."
                    : "No hay insumos. "}
                  {!q && estadoFiltro === "activo" && (
                    <Link
                      href="/insumos/nuevo"
                      className="text-primary hover:underline font-medium"
                    >
                      Crear el primero
                    </Link>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginador */}
        <Suspense>
          <PaginadorTabla
            paginaActual={paginaActual}
            totalItems={totalItems}
            itemsPorPagina={itemsPorPagina}
          />
        </Suspense>
      </div>
    </div>
  );
}
