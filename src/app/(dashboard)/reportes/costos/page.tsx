import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Suspense } from "react";
import { formatearPrecio } from "@/lib/formato";
import { PaginadorTabla } from "@/components/shared/PaginadorTabla";
import { BotonesExportacion } from "@/components/reportes/BotonesExportacion";
import { FileDown } from "lucide-react";

export default async function ReporteCostosPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoriaId?: string;
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { categoriaId, q, page, pageSize } = await searchParams;

  const paginaActual = Math.max(1, Number(page) || 1);
  const itemsPorPagina = Number(pageSize) || 50;
  const skip = (paginaActual - 1) * itemsPorPagina;

  const where = {
    estado: "activo" as const,
    categoriaId: categoriaId ?? undefined,
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" as const } },
            { codigo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [muebles, totalItems, categorias] = await Promise.all([
    prisma.mueble.findMany({
      where,
      orderBy: [{ categoria: { nombre: "asc" } }, { codigo: "asc" }],
      skip,
      take: itemsPorPagina,
      include: {
        categoria: { select: { nombre: true } },
        _count: { select: { materiales: true, insumos: true } },
      },
    }),
    prisma.mueble.count({ where }),
    prisma.categoriaMueble.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const costoTotalPagina = muebles.reduce((s, m) => s + Number(m.costoActual), 0);

  // Params para los exports (sin paginación)
  const exportParams = new URLSearchParams();
  if (categoriaId) exportParams.set("categoriaId", categoriaId);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Reporte de Costos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalItems} mueble{totalItems !== 1 ? "s" : ""} activos
          </p>
        </div>

        {/* Exportar */}
        <Suspense>
          <BotonesExportacion exportParams={exportParams.toString()} />
        </Suspense>
      </div>

      {/* Filtros por categoría */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/reportes/costos${q ? `?q=${q}` : ""}`}
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
            href={`/reportes/costos?categoriaId=${c.id}${q ? `&q=${q}` : ""}`}
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
                Nombre
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Categoría
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Ítems
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Costo actual
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">
                PDF
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {muebles.map((m) => (
              <tr key={m.id} className="hover:bg-secondary/40 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {m.codigo}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  <Link
                    href={`/muebles/${m.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {m.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {m.categoria.nombre}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-secondary text-muted-foreground tabular-nums">
                    {m._count.materiales + m._count.insumos}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                  {Number(m.costoActual) > 0 ? (
                    formatearPrecio(Number(m.costoActual))
                  ) : (
                    <span className="font-sans font-normal text-muted-foreground/60 text-xs">
                      Sin costo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <a
                    href={`/api/reportes/despiece/${m.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Descargar PDF del despiece"
                    className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
            {muebles.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground text-sm"
                >
                  No hay muebles en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
          {/* Subtotal de la página */}
          {muebles.length > 0 && (
            <tfoot>
              <tr className="bg-secondary/40 border-t border-border">
                <td
                  colSpan={4}
                  className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-right"
                >
                  Subtotal ({muebles.length} muebles en pantalla)
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-foreground">
                  {formatearPrecio(costoTotalPagina)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>

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
