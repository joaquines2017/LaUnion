import { prisma } from "@/lib/prisma";
import { requireEmpresaPage } from "@/lib/empresa";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, FileSpreadsheet, FileText } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import { FiltrosBusqueda } from "@/components/shared/FiltrosBusqueda";
import { FiltroCategorias } from "@/components/shared/FiltroCategorias";
import { VistaToggle } from "@/components/shared/VistaToggle";
import { PaginadorTabla } from "@/components/shared/PaginadorTabla";
import { TablaMuebles } from "@/components/muebles/TablaMuebles";
import { TarjetasMuebles } from "@/components/muebles/TarjetasMuebles";

export default async function MueblesPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoriaId?: string;
    q?: string;
    estado?: string;
    vista?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { empresaId } = await requireEmpresaPage();
  const { categoriaId, q, estado, vista, page, pageSize } = await searchParams;

  const estadoFiltro = estado ?? "activo";
  const vistaActual = vista === "lista" ? "lista" : "grid";
  const paginaActual = Math.max(1, Number(page) || 1);
  const itemsPorPagina = Number(pageSize) || (vistaActual === "grid" ? 24 : 20);
  const skip = (paginaActual - 1) * itemsPorPagina;

  const where = {
    empresaId,
    estado: estadoFiltro as "activo" | "inactivo",
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

  const [muebles, totalItems, categorias, statsResult, sinCostoCount] = await Promise.all([
    prisma.mueble.findMany({
      where,
      orderBy: [{ categoria: { nombre: "asc" } }, { codigo: "asc" }],
      skip,
      take: itemsPorPagina,
      include: {
        categoria: { select: { nombre: true } },
        imagenes: { orderBy: { orden: "asc" }, select: { id: true, url: true, filename: true } },
        _count: { select: { materiales: true, insumos: true } },
      },
    }),
    prisma.mueble.count({ where }),
    prisma.categoriaMueble.findMany({ where: { empresaId }, orderBy: { nombre: "asc" } }),
    prisma.mueble.aggregate({ where, _sum: { costoActual: true } }),
    prisma.mueble.count({ where: { ...where, costoActual: { lte: 0 } } }),
  ]);

  const costoTotal = Number(statsResult._sum.costoActual ?? 0);
  const totalPaginas = Math.ceil(totalItems / itemsPorPagina);

  const exportQS = (() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (categoriaId) p.set("categoriaId", categoriaId);
    p.set("estado", estadoFiltro);
    return p.toString() ? `?${p.toString()}` : "";
  })();

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Muebles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalItems} mueble{totalItems !== 1 ? "s" : ""}
            {estadoFiltro === "inactivo" && " · inactivos"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/muebles/excel${exportQS}`} target="_blank">
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
              Excel
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/muebles/pdf${exportQS}`} target="_blank">
              <FileText className="h-4 w-4 mr-1.5 text-red-500" />
              PDF
            </a>
          </Button>
          <Button asChild>
            <Link href="/muebles/nuevo">
              <Plus className="h-4 w-4 mr-1.5" />
              Nuevo mueble
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      {estadoFiltro === "activo" && totalItems > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm">
            <span className="font-semibold text-foreground tabular-nums">{totalItems}</span>
            <span className="text-muted-foreground text-xs">muebles</span>
          </div>
          {costoTotal > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm">
              <span className="font-mono font-semibold text-emerald-700 tabular-nums">{formatearPrecio(costoTotal)}</span>
              <span className="text-muted-foreground text-xs">costo total</span>
            </div>
          )}
          {sinCostoCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-sm">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-semibold text-amber-700 tabular-nums">{sinCostoCount}</span>
              <span className="text-amber-600 text-xs">sin costo</span>
            </div>
          )}
        </div>
      )}

      {/* Barra de filtros + toggle vista */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Suspense>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
            <FiltrosBusqueda placeholder="Buscar por código o nombre…" />
            <FiltroCategorias categorias={categorias} />
          </div>
          <VistaToggle vistaActual={vistaActual} />
        </Suspense>
      </div>

      {/* Contenido según vista */}
      {vistaActual === "grid" ? (
        <>
          <TarjetasMuebles
            muebles={muebles.map((m) => ({ ...m, costoActual: m.costoActual.toString() }))}
            estadoFiltro={estadoFiltro}
            q={q}
          />
          {totalPaginas > 1 && (
            <Suspense>
              <PaginadorTabla
                paginaActual={paginaActual}
                totalItems={totalItems}
                itemsPorPagina={itemsPorPagina}
              />
            </Suspense>
          )}
        </>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <TablaMuebles
            muebles={muebles.map((m) => ({ ...m, costoActual: m.costoActual.toString() }))}
            estadoFiltro={estadoFiltro}
            q={q}
          />
          <Suspense>
            <PaginadorTabla
              paginaActual={paginaActual}
              totalItems={totalItems}
              itemsPorPagina={itemsPorPagina}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
