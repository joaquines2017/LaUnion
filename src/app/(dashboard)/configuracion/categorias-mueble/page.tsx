import { prisma } from "@/lib/prisma";
import { GestionCatalogo } from "@/components/configuracion/GestionCatalogo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CategoriasMueblePage() {
  const categorias = await prisma.categoriaMueble.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { muebles: true } } },
  });

  const items = categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    _count: { muebles: c._count.muebles },
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
          <h1 className="text-2xl font-semibold text-foreground">Categorías de muebles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Agrupaciones para clasificar los muebles del catálogo.
          </p>
        </div>
      </div>

      <GestionCatalogo
        items={items}
        endpoint="/api/categorias-mueble"
        labelSingular="categoría"
        labelPlural="categorías"
        conDescripcion={false}
      />
    </div>
  );
}
