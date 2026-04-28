import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FormNuevaEmpresa } from "@/components/superadmin/FormNuevaEmpresa";

export default function NuevaEmpresaPage() {
  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" /> Volver a empresas
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Nueva empresa</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Se creará el usuario administrador y se le enviará la contraseña por email.
        </p>
      </div>
      <FormNuevaEmpresa />
    </div>
  );
}
