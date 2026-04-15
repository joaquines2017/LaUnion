import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FormInsumo } from "@/components/insumos/FormInsumo";
import { TablaPrecios } from "@/components/insumos/TablaPrecios";
import { BotonEstado } from "@/components/shared/BotonEstado";
import { HistorialPrecios } from "@/components/insumos/HistorialPrecios";
import { Badge } from "@/components/ui/badge";

export default async function DetalleInsumoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [insumo, categorias, proveedores, historial, config] = await Promise.all([
    prisma.insumo.findUnique({
      where: { id },
      include: {
        categoria: true,
        precios: {
          include: { proveedor: { select: { id: true, nombre: true } } },
          orderBy: { precio: "asc" },
        },
      },
    }),
    prisma.categoriaInsumo.findMany({ orderBy: { nombre: "asc" } }),
    prisma.proveedor.findMany({ where: { estado: "activo" }, orderBy: { nombre: "asc" } }),
    prisma.historialPrecio.findMany({
      where: {
        precioProveedor: { insumoId: id },
      },
      orderBy: { fechaCambio: "desc" },
      take: 20,
      include: {
        precioProveedor: {
          include: { proveedor: { select: { nombre: true } } },
        },
      },
    }),
    prisma.configuracionGlobal.findUnique({ where: { id: "1" } }),
  ]);

  if (!insumo) notFound();

  const vigenciaDias = config?.vigenciaPrecioDias ?? 30;
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - vigenciaDias);

  // Marcar precios desactualizados
  const preciosConEstadoVigencia = insumo.precios.map((p) => ({
    ...p,
    desactualizado:
      p.estado === "vigente" && new Date(p.fechaVigencia) < fechaLimite,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {insumo.descripcion}
            </h1>
            {insumo.estado === "inactivo" && (
              <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                Inactivo
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">
            {insumo.codigo} · {insumo.categoria.nombre}
          </p>
        </div>
        <BotonEstado
          id={insumo.id}
          entidad="insumos"
          estadoActual={insumo.estado}
          nombre={insumo.descripcion}
        />
      </div>

      <FormInsumo
        insumo={{
          ...insumo,
          precioBase: insumo.precioBase != null ? Number(insumo.precioBase) : null,
        }}
        categorias={categorias}
      />

      <TablaPrecios
        insumoId={insumo.id}
        insumoNombre={insumo.descripcion}
        precios={preciosConEstadoVigencia}
        proveedores={proveedores}
        vigenciaDias={vigenciaDias}
        precioSeleccionadoId={insumo.precioSeleccionadoId ?? null}
      />

      {historial.length > 0 && (
        <HistorialPrecios historial={historial} />
      )}
    </div>
  );
}
