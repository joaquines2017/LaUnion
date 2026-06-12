import { prisma } from "@/lib/prisma";
import { requireEmpresaPage } from "@/lib/empresa";
import { FormMueble } from "@/components/muebles/FormMueble";

export default async function NuevoMueblePage() {
  const { empresaId } = await requireEmpresaPage();
  const categorias = await prisma.categoriaMueble.findMany({
    where: { empresaId },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nuevo mueble</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Completá los datos del mueble. El despiece se carga desde el detalle.
        </p>
      </div>
      <FormMueble categorias={categorias} />
    </div>
  );
}
