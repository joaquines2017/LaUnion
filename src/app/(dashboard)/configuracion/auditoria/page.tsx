import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PanelAuditoria } from "@/components/configuracion/PanelAuditoria";

export default async function AuditoriaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as { role?: string }).role !== "administrador") {
    redirect("/configuracion");
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Log de Auditoría</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registro de acciones realizadas en el sistema. Solo visible para administradores.
        </p>
      </div>
      <PanelAuditoria />
    </div>
  );
}
