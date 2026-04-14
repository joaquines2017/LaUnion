import { prisma } from "@/lib/prisma";
import { GestionCatalogo } from "@/components/configuracion/GestionCatalogo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CategoriasInsumoPage() {
  const categorias = await prisma.categoriaInsumo.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { insumos: true } } },
  });

  const items = categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    _count: { insumos: c._count.insumos },
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Link
          href="/configuracion"
          className="mt-1 p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
          title="Volver a configuración"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Categorías de insumos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Agrupaciones para clasificar los insumos del catálogo.
          </p>
        </div>
      </div>

      <GestionCatalogo
        items={items}
        endpoint="/api/categorias-insumo"
        labelSingular="categoría"
        labelPlural="categorías"
        conDescripcion={true}
      />
    </div>
  );
}
