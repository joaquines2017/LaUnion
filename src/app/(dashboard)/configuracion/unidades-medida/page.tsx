import { prisma } from "@/lib/prisma";
import { GestionCatalogo } from "@/components/configuracion/GestionCatalogo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function UnidadesMedidaPage() {
  const unidades = await prisma.unidadMedida.findMany({
    orderBy: { nombre: "asc" },
  });

  // Conteo de insumos por unidad
  const conConteo = await Promise.all(
    unidades.map(async (u) => ({
      id: u.id,
      nombre: u.nombre,
      descripcion: u.descripcion,
      _count: { insumos: await prisma.insumo.count({ where: { unidadMedida: u.nombre } }) },
    }))
  );

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
          <h1 className="text-2xl font-semibold text-foreground">Unidades de medida</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unidades disponibles para los insumos del catálogo.
          </p>
        </div>
      </div>

      <GestionCatalogo
        items={conConteo}
        endpoint="/api/unidades-medida"
        labelSingular="unidad"
        labelPlural="unidades"
        conDescripcion={true}
      />
    </div>
  );
}
