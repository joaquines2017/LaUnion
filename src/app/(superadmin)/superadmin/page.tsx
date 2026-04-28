import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TablaEmpresas } from "@/components/superadmin/TablaEmpresas";

export default async function SuperadminPage() {
  const empresas = await prisma.empresa.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usuarios: true } } },
  });

  const activas   = empresas.filter((e) => e.estado === "activo").length;
  const inactivas = empresas.filter((e) => e.estado === "inactivo").length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activas} activa{activas !== 1 ? "s" : ""}
            {inactivas > 0 && ` · ${inactivas} inactiva${inactivas !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/superadmin/nueva">
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva empresa
          </Link>
        </Button>
      </div>

      <TablaEmpresas
        empresas={empresas.map((e) => ({
          ...e,
          logoUrl: e.logoUrl ?? null,
          dominio: e.dominio ?? null,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
