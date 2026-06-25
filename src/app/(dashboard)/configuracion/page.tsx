import { prisma } from "@/lib/prisma";
import { requireEmpresaPage } from "@/lib/empresa";
import { FormConfiguracion } from "@/components/configuracion/FormConfiguracion";
import { SeccionEmpresa } from "@/components/configuracion/SeccionEmpresa";
import { Separator } from "@/components/ui/separator";

export default async function ConfiguracionPage() {
  const { empresaId } = await requireEmpresaPage();

  const [config, empresa] = await Promise.all([
    prisma.configuracionGlobal.upsert({
      where: { empresaId },
      update: {},
      create: { empresaId },
    }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: { id: true, nombre: true, logoUrl: true },
    }),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Parámetros globales del sistema de costeo.
        </p>
      </div>

      <SeccionEmpresa empresa={empresa} />

      <Separator />

      <FormConfiguracion config={config} />
    </div>
  );
}
