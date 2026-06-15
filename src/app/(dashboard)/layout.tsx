import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { prisma } from "@/lib/prisma";

async function getPreciosVencidos(empresaId: string) {
  const config = await prisma.configuracionGlobal.findUnique({ where: { empresaId } });
  const vigenciaDias = config?.vigenciaPrecioDias ?? 30;
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - vigenciaDias);

  const where = {
    empresaId,
    estado: "activo" as const,
    precioSeleccionado: {
      estado: "vigente" as const,
      fechaVigencia: { lt: fechaLimite },
    },
  };

  const [total, insumos] = await Promise.all([
    prisma.insumo.count({ where }),
    prisma.insumo.findMany({
      where,
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        precioSeleccionado: {
          select: {
            fechaVigencia: true,
            proveedor: { select: { nombre: true } },
          },
        },
      },
      orderBy: { precioSeleccionado: { fechaVigencia: "asc" } },
      take: 20,
    }),
  ]);

  const ahora = Date.now();
  const items = insumos.map((insumo) => {
    const fechaVigencia = insumo.precioSeleccionado!.fechaVigencia;
    const diasVencido = Math.floor((ahora - fechaVigencia.getTime()) / (1000 * 60 * 60 * 24));
    return {
      insumoId: insumo.id,
      codigo: insumo.codigo,
      descripcion: insumo.descripcion,
      proveedorNombre: insumo.precioSeleccionado!.proveedor.nombre,
      diasVencido,
    };
  });

  return { items, total };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const empresaId = (session.user as { empresaId?: string | null }).empresaId ?? null;
  const preciosVencidos = empresaId
    ? await getPreciosVencidos(empresaId)
    : { items: [], total: 0 };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar preciosVencidos={preciosVencidos} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-7">{children}</div>
      </main>
    </div>
  );
}
