import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatearPrecio, formatearFecha } from "@/lib/formato";
import { CheckCircle2 } from "lucide-react";

export default async function ComparativoProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ categoriaId?: string }>;
}) {
  const { categoriaId } = await searchParams;

  const [categorias, insumos] = await Promise.all([
    prisma.categoriaInsumo.findMany({ orderBy: { nombre: "asc" } }),
    prisma.insumo.findMany({
      where: {
        estado: "activo",
        categoriaId: categoriaId ?? undefined,
        precios: { some: { estado: "vigente" } },
      },
      orderBy: [{ categoria: { nombre: "asc" } }, { descripcion: "asc" }],
      include: {
        categoria: { select: { nombre: true } },
        precios: {
          where: { estado: "vigente" },
          orderBy: { precio: "asc" },
          include: { proveedor: { select: { id: true, nombre: true } } },
        },
      },
    }),
  ]);

  // Obtener todos los proveedores que tienen al menos un precio vigente
  const todosProveedoresIds = new Set<string>();
  for (const ins of insumos) {
    for (const p of ins.precios) {
      todosProveedoresIds.add(p.proveedor.id);
    }
  }
  const proveedores = await prisma.proveedor.findMany({
    where: { id: { in: [...todosProveedoresIds] }, estado: "activo" },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Comparativo de proveedores
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Precios vigentes por insumo — verde = precio más bajo
          </p>
        </div>
      </div>

      {/* Filtro por categoría */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/reportes/proveedores"
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
            href={`/reportes/proveedores?categoriaId=${c.id}`}
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

      {insumos.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center text-muted-foreground text-sm">
          No hay insumos con precios cargados en esta categoría.
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/70 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-secondary/70 min-w-[220px]">
                  Insumo
                </th>
                {proveedores.map((prov) => (
                  <th
                    key={prov.id}
                    className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[120px]"
                  >
                    {prov.nombre}
                  </th>
                ))}
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[120px]">
                  Mejor precio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {insumos.map((ins) => {
                const precioMap = new Map(
                  ins.precios.map((p) => [p.proveedor.id, p])
                );
                const precioMin = ins.precios[0]; // ya ordenado asc

                return (
                  <tr key={ins.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-card hover:bg-secondary/30">
                      <Link
                        href={`/insumos/${ins.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {ins.descripcion}
                      </Link>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        {ins.codigo} · {ins.categoria.nombre}
                      </p>
                    </td>

                    {proveedores.map((prov) => {
                      const precio = precioMap.get(prov.id);
                      const esMejor = precio?.id === precioMin?.id;

                      return (
                        <td
                          key={prov.id}
                          className={`px-3 py-3 text-center ${esMejor ? "bg-emerald-50/60" : ""}`}
                        >
                          {precio ? (
                            <div>
                              <div
                                className={`font-mono font-semibold tabular-nums text-sm ${
                                  esMejor ? "text-emerald-700" : "text-foreground"
                                }`}
                              >
                                {esMejor && (
                                  <CheckCircle2 className="h-3 w-3 inline mr-1 text-emerald-500" />
                                )}
                                {formatearPrecio(Number(precio.precio))}
                              </div>
                              <div className="text-xs text-muted-foreground/70 mt-0.5">
                                {formatearFecha(precio.fechaVigencia)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Mejor precio resumen */}
                    <td className="px-4 py-3 text-right">
                      {precioMin ? (
                        <div>
                          <div className="font-mono font-bold text-emerald-700 tabular-nums">
                            {formatearPrecio(Number(precioMin.precio))}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {precioMin.proveedor.nombre}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">Sin precio</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
