import { PaginaImportar } from "@/components/importar/PaginaImportar";

export default function ImportarPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Importar Excel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Cargá muebles y despiece desde un archivo .xlsx.
        </p>
      </div>
      <PaginaImportar />
    </div>
  );
}
