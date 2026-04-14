import { prisma } from "@/lib/prisma";
import { FormInsumo } from "@/components/insumos/FormInsumo";

export default async function NuevoInsumoPage() {
  const categorias = await prisma.categoriaInsumo.findMany({
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo insumo</h1>
        <p className="text-sm text-gray-500 mt-0.5">Completá los datos del insumo</p>
      </div>
      <FormInsumo categorias={categorias} />
    </div>
  );
}
