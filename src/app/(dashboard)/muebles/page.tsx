import { prisma } from "@/lib/prisma";
import { requireEmpresaPage } from "@/lib/empresa";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FiltrosBusqueda } from "@/components/shared/FiltrosBusqueda";
import { FiltroCategorias } from "@/components/shared/FiltroCategorias";
import { PaginadorTabla } from "@/components/shared/PaginadorTabla";
import { TablaMuebles } from "@/components/muebles/TablaMuebles";
import { Suspense } from "react";

export default async function MueblesPage({
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
  const { empresaId } = await requireEmpresaPage();
  const { categoriaId, q, estado, page, pageSize } = await searchParams;

  const estadoFiltro = estado ?? "activo";
  const paginaActual = Math.max(1, Number(page) || 1);
  const itemsPorPagina = Number(pageSize) || 20;
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

  const [muebles, totalItems, categorias] = await Promise.all([
    prisma.mueble.findMany({
      where,
      orderBy: [{ categoria: { nombre: "asc" } }, { codigo: "asc" }],
      skip,
      take: itemsPorPagina,
      include: {
        categoria: { select: { nombre: true } },
        // Todas las imágenes para el carrusel del modal
        imagenes: { orderBy: { orden: "asc" }, select: { id: true, url: true, filename: true } },
        _count: { select: { materiales: true, insumos: true } },
      },
    }),
    prisma.mueble.count({ where }),
    prisma.categoriaMueble.findMany({ where: { empresaId }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Muebles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalItems} resultado{totalItems !== 1 ? "s" : ""}
            {estadoFiltro === "inactivo" && " · inactivos"}
          </p>
        </div>
        <Button asChild>
          <Link href="/muebles/nuevo">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo mueble
          </Link>
        </Button>
      </div>

      {/* Búsqueda, estado y categoría */}
      <Suspense>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <FiltrosBusqueda placeholder="Buscar por código o nombre…" />
          <FiltroCategorias categorias={categorias} />
        </div>
      </Suspense>

      {/* Tabla con modal */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <TablaMuebles
          muebles={muebles.map((m) => ({
            ...m,
            costoActual: m.costoActual.toString(),
          }))}
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
    </div>
  );
}
