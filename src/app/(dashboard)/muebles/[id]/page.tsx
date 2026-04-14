import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BotonEstado } from "@/components/shared/BotonEstado";
import { Badge } from "@/components/ui/badge";
import { DetalleMueble } from "@/components/muebles/DetalleMueble";

export default async function DetalleMueblePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [mueble, categorias, config] = await Promise.all([
    prisma.mueble.findUnique({
      where: { id },
      include: {
        categoria: true,
        imagenes: { orderBy: { orden: "asc" }, select: { id: true, url: true, filename: true, orden: true } },
        materiales: {
          orderBy: { orden: "asc" },
          include: {
            insumo: {
              select: {
                id: true, codigo: true, descripcion: true,
                unidadMedida: true, altoM: true, anchoM: true,
                precios: {
                  where: { estado: "vigente" },
                  orderBy: { precio: "asc" },
                  take: 1,
                  select: { precio: true },
                },
              },
            },
          },
        },
        insumos: {
          orderBy: { orden: "asc" },
          include: {
            insumo: {
              select: {
                id: true, codigo: true, descripcion: true,
                unidadMedida: true, altoM: true, anchoM: true,
                precios: {
                  where: { estado: "vigente" },
                  orderBy: { precio: "asc" },
                  take: 1,
                  select: { precio: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.categoriaMueble.findMany({ orderBy: { nombre: "asc" } }),
    prisma.configuracionGlobal.findUnique({ where: { id: "1" } }),
  ]);

  if (!mueble) notFound();

  const factorDesperdicio = config?.factorDesperdicio ?? 1.1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/muebles"
            className="mt-1 p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
            title="Volver a muebles"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{mueble.nombre}</h1>
            {mueble.estado === "inactivo" && (
              <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                Inactivo
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">
            {mueble.codigo} · {mueble.categoria.nombre}
          </p>
          </div>
        </div>
        <BotonEstado
          id={mueble.id}
          entidad="muebles"
          estadoActual={mueble.estado}
          nombre={mueble.nombre}
        />
      </div>

      <DetalleMueble
        mueble={{
          id: mueble.id,
          codigo: mueble.codigo,
          nombre: mueble.nombre,
          categoriaId: mueble.categoriaId,
          costoActual: mueble.costoActual.toString(),
          estado: mueble.estado,
        }}
        categorias={categorias}
        imagenesIniciales={mueble.imagenes}
        materialesIniciales={mueble.materiales.map((m) => ({
          ...m,
          cantidad: m.cantidad.toString(),
          costoUnitario: m.costoUnitario.toString(),
          costoTotal: m.costoTotal.toString(),
          insumo: m.insumo ? { ...m.insumo, precios: m.insumo.precios.map((p) => ({ precio: p.precio.toString() })) } : null,
        }))}
        insumosIniciales={mueble.insumos.map((i) => ({
          ...i,
          cantidad: i.cantidad.toString(),
          costoUnitario: i.costoUnitario.toString(),
          costoTotal: i.costoTotal.toString(),
          insumo: i.insumo ? { ...i.insumo, precios: i.insumo.precios.map((p) => ({ precio: p.precio.toString() })) } : null,
        }))}
        factorDesperdicio={factorDesperdicio}
      />
    </div>
  );
}
