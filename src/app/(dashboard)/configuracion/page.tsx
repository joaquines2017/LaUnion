import { prisma } from "@/lib/prisma";
import { FormConfiguracion } from "@/components/configuracion/FormConfiguracion";

export default async function ConfiguracionPage() {
  const config = await prisma.configuracionGlobal.upsert({
    where: { id: "1" },
    update: {},
    create: { id: "1" },
  });

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Parámetros globales del sistema de costeo.
        </p>
      </div>
      <FormConfiguracion config={config} />
    </div>
  );
}
