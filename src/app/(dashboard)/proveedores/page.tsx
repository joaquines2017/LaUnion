import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatearFecha } from "@/lib/formato";
import { FiltrosBusqueda } from "@/components/shared/FiltrosBusqueda";
import { AccionesTabla } from "@/components/shared/AccionesTabla";
import { PaginadorTabla } from "@/components/shared/PaginadorTabla";
import { Suspense } from "react";

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { q, estado, page, pageSize } = await searchParams;

  const estadoFiltro = estado ?? "activo";
  const paginaActual = Math.max(1, Number(page) || 1);
  const itemsPorPagina = Number(pageSize) || 20;
  const skip = (paginaActual - 1) * itemsPorPagina;

  const where = {
    estado: estadoFiltro as "activo" | "inactivo",
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" as const } },
            { cuit: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [proveedores, totalItems] = await Promise.all([
    prisma.proveedor.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip,
      take: itemsPorPagina,
      include: {
        _count: { select: { precios: { where: { estado: "vigente" } } } },
      },
    }),
    prisma.proveedor.count({ where }),
  ]);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalItems} resultado{totalItems !== 1 ? "s" : ""}
            {estadoFiltro === "inactivo" && " · inactivos"}
          </p>
        </div>
        <Button asChild>
          <Link href="/proveedores/nuevo">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo proveedor
          </Link>
        </Button>
      </div>

      {/* Búsqueda y filtro activo/inactivo */}
      <Suspense>
        <FiltrosBusqueda placeholder="Buscar por nombre, CUIT o email…" />
      </Suspense>

      {/* Tabla */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/70 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Nombre
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                CUIT
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Contacto
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Precios cargados
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Alta
              </th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {proveedores.map((p) => (
              <tr
                key={p.id}
                className={`hover:bg-secondary/40 transition-colors ${
                  estadoFiltro === "inactivo" ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-3 font-semibold text-foreground">
                  {p.nombre}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {p.cuit ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {p.email && <div>{p.email}</div>}
                  {p.telefono && <div className="mt-0.5">{p.telefono}</div>}
                  {!p.email && !p.telefono && "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold font-mono bg-blue-50 text-blue-700 border border-blue-100 tabular-nums">
                    {p._count.precios}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatearFecha(p.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <AccionesTabla
                    id={p.id}
                    entidad="proveedores"
                    nombre={p.nombre}
                    estadoActual={p.estado}
                  />
                </td>
              </tr>
            ))}
            {proveedores.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground text-sm"
                >
                  {q
                    ? `Sin resultados para "${q}"`
                    : estadoFiltro === "inactivo"
                    ? "No hay proveedores inactivos."
                    : "No hay proveedores. "}
                  {!q && estadoFiltro === "activo" && (
                    <Link
                      href="/proveedores/nuevo"
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
