import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormProveedor } from "@/components/proveedores/FormProveedor";
import { BotonEstado } from "@/components/shared/BotonEstado";
import { Badge } from "@/components/ui/badge";
import { TablaPreciosProveedor } from "@/components/proveedores/TablaPreciosProveedor";

export default async function DetalleProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [proveedor, insumosActivos, categorias, config] = await Promise.all([
    prisma.proveedor.findUnique({
      where: { id },
      include: {
        precios: {
          where: { estado: "vigente" },
          include: {
            insumo: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                categoriaId: true,
                categoria: { select: { nombre: true } },
              },
            },
          },
          orderBy: { insumo: { descripcion: "asc" } },
        },
      },
    }),
    prisma.insumo.findMany({
      where: { estado: "activo" },
      orderBy: [{ categoria: { nombre: "asc" } }, { descripcion: "asc" }],
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        categoriaId: true,
        categoria: { select: { nombre: true } },
      },
    }),
    prisma.categoriaInsumo.findMany({ orderBy: { nombre: "asc" } }),
    prisma.configuracionGlobal.findUnique({ where: { id: "1" } }),
  ]);

  if (!proveedor) notFound();

  const vigenciaDias = config?.vigenciaPrecioDias ?? 30;
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - vigenciaDias);

  const preciosSerialized = proveedor.precios.map((p) => ({
    id: p.id,
    insumoId: p.insumoId,
    precio: p.precio.toString(),
    fechaVigencia: p.fechaVigencia.toISOString(),
    desactualizado: new Date(p.fechaVigencia) < fechaLimite,
    insumo: {
      codigo: p.insumo.codigo,
      descripcion: p.insumo.descripcion,
      categoriaId: p.insumo.categoriaId,
      categoria: { nombre: p.insumo.categoria.nombre },
    },
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/proveedores"
            className="mt-1 p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
            title="Volver a proveedores"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{proveedor.nombre}</h1>
              {proveedor.estado === "inactivo" && (
                <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  Inactivo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {proveedor.precios.length} precio{proveedor.precios.length !== 1 ? "s" : ""} vigente{proveedor.precios.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <BotonEstado
          id={proveedor.id}
          entidad="proveedores"
          estadoActual={proveedor.estado}
          nombre={proveedor.nombre}
        />
      </div>

      <FormProveedor proveedor={proveedor} />

      {/* Tabla de precios interactiva */}
      <TablaPreciosProveedor
        proveedorId={proveedor.id}
        precios={preciosSerialized}
        categorias={categorias}
        insumosDisponibles={insumosActivos}
        vigenciaDias={vigenciaDias}
      />
    </div>
  );
}
