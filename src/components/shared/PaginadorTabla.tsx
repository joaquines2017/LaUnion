"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  paginaActual: number;
  totalItems: number;
  itemsPorPagina: number;
}

const TAMANIOS_PAGINA = [10, 20, 50, 100];

export function PaginadorTabla({ paginaActual, totalItems, itemsPorPagina }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPaginas = Math.max(1, Math.ceil(totalItems / itemsPorPagina));
  const desde = totalItems === 0 ? 0 : (paginaActual - 1) * itemsPorPagina + 1;
  const hasta = Math.min(paginaActual * itemsPorPagina, totalItems);

  function buildUrl(pagina: number, size?: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(pagina));
    if (size) params.set("pageSize", String(size));
    return `${pathname}?${params.toString()}`;
  }

  // Generar array de páginas a mostrar con ellipsis
  function getPaginas(): (number | "...")[] {
    if (totalPaginas <= 7) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    const left = Math.max(2, paginaActual - 1);
    const right = Math.min(totalPaginas - 1, paginaActual + 1);

    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPaginas - 1) pages.push("...");
    pages.push(totalPaginas);
    return pages;
  }

  const paginas = getPaginas();

  const btnBase =
    "inline-flex items-center justify-center h-8 min-w-[2rem] px-1.5 rounded text-sm transition-colors";
  const btnActivo =
    "bg-primary text-primary-foreground font-semibold";
  const btnNormal =
    "text-muted-foreground hover:bg-secondary hover:text-foreground";
  const btnDisabled =
    "text-muted-foreground/30 pointer-events-none";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card">
      {/* Info + tamaño de página */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {totalItems === 0
            ? "Sin resultados"
            : `Mostrando ${desde}–${hasta} de ${totalItems}`}
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1.5">
          Filas:
          {TAMANIOS_PAGINA.map((s) => (
            <Link
              key={s}
              href={buildUrl(1, s)}
              className={cn(
                "px-1.5 py-0.5 rounded text-xs font-medium transition-colors",
                s === itemsPorPagina
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-secondary text-muted-foreground"
              )}
            >
              {s}
            </Link>
          ))}
        </span>
      </div>

      {/* Controles de página */}
      {totalPaginas > 1 && (
        <div className="flex items-center gap-0.5">
          {/* Primera */}
          <Link
            href={buildUrl(1)}
            aria-disabled={paginaActual === 1}
            className={cn(btnBase, paginaActual === 1 ? btnDisabled : btnNormal)}
            title="Primera página"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Link>

          {/* Anterior */}
          <Link
            href={buildUrl(Math.max(1, paginaActual - 1))}
            aria-disabled={paginaActual === 1}
            className={cn(btnBase, paginaActual === 1 ? btnDisabled : btnNormal)}
            title="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>

          {/* Números */}
          {paginas.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className={cn(btnBase, "text-muted-foreground/40")}>
                …
              </span>
            ) : (
              <Link
                key={p}
                href={buildUrl(p)}
                className={cn(btnBase, p === paginaActual ? btnActivo : btnNormal)}
              >
                {p}
              </Link>
            )
          )}

          {/* Siguiente */}
          <Link
            href={buildUrl(Math.min(totalPaginas, paginaActual + 1))}
            aria-disabled={paginaActual === totalPaginas}
            className={cn(
              btnBase,
              paginaActual === totalPaginas ? btnDisabled : btnNormal
            )}
            title="Página siguiente"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>

          {/* Última */}
          <Link
            href={buildUrl(totalPaginas)}
            aria-disabled={paginaActual === totalPaginas}
            className={cn(
              btnBase,
              paginaActual === totalPaginas ? btnDisabled : btnNormal
            )}
            title="Última página"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
