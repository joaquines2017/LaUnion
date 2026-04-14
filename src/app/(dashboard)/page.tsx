import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  Package,
  Truck,
  Sofa,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Clock,
} from "lucide-react";
import { formatearPrecio, formatearFecha } from "@/lib/formato";
import Link from "next/link";

async function getDashboardStats() {
  const config = await prisma.configuracionGlobal.findUnique({ where: { id: "1" } });
  const vigenciaDias = config?.vigenciaPrecioDias ?? 30;
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - vigenciaDias);

  const [
    totalInsumos,
    totalProveedores,
    totalMuebles,
    mueblesSinCosto,
    preciosDesactualizados,
    mueblesCostosos,
    ultimosPrecios,
    costoPromedio,
  ] = await Promise.all([
    prisma.insumo.count({ where: { estado: "activo" } }),
    prisma.proveedor.count({ where: { estado: "activo" } }),
    prisma.mueble.count({ where: { estado: "activo" } }),
    prisma.mueble.count({ where: { estado: "activo", costoActual: 0 } }),
    prisma.precioProveedor.count({
      where: { estado: "vigente", fechaVigencia: { lt: fechaLimite } },
    }),
    prisma.mueble.findMany({
      where: { estado: "activo", costoActual: { gt: 0 } },
      orderBy: { costoActual: "desc" },
      take: 5,
      select: {
        id: true,
        codigo: true,
        nombre: true,
        costoActual: true,
        categoria: { select: { nombre: true } },
      },
    }),
    prisma.historialPrecio.findMany({
      orderBy: { fechaCambio: "desc" },
      take: 6,
      include: {
        precioProveedor: {
          include: {
            insumo: { select: { descripcion: true, codigo: true } },
            proveedor: { select: { nombre: true } },
          },
        },
      },
    }),
    prisma.mueble.aggregate({
      where: { estado: "activo", costoActual: { gt: 0 } },
      _avg: { costoActual: true },
    }),
  ]);

  return {
    totalInsumos,
    totalProveedores,
    totalMuebles,
    mueblesSinCosto,
    preciosDesactualizados,
    mueblesCostosos,
    ultimosPrecios,
    costoPromedio: Number(costoPromedio._avg.costoActual ?? 0),
    vigenciaDias,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bienvenido, {session?.user?.name?.split(" ")[0] ?? "usuario"}
        </p>
      </div>

      {/* Alertas */}
      {(stats.preciosDesactualizados > 0 || stats.mueblesSinCosto > 0) && (
        <div className="space-y-2">
          {stats.preciosDesactualizados > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-amber-800">
                <span className="font-semibold">{stats.preciosDesactualizados} precio{stats.preciosDesactualizados !== 1 ? "s" : ""}</span>
                {" "}sin actualizar hace más de {stats.vigenciaDias} días.{" "}
                <Link href="/insumos?estado=activo" className="underline hover:no-underline font-medium">
                  Ver insumos
                </Link>
              </div>
            </div>
          )}
          {stats.mueblesSinCosto > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm">
              <Sofa className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-blue-800">
                <span className="font-semibold">{stats.mueblesSinCosto} mueble{stats.mueblesSinCosto !== 1 ? "s" : ""}</span>
                {" "}sin costo cargado todavía.{" "}
                <Link href="/muebles" className="underline hover:no-underline font-medium">
                  Cargar despiece
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tarjetas de métricas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Insumos activos",
            value: stats.totalInsumos,
            icon: Package,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            href: "/insumos",
          },
          {
            label: "Proveedores activos",
            value: stats.totalProveedores,
            icon: Truck,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            href: "/proveedores",
          },
          {
            label: "Muebles con costo",
            value: stats.totalMuebles - stats.mueblesSinCosto,
            subtext: `de ${stats.totalMuebles} totales`,
            icon: Sofa,
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
            href: "/muebles",
          },
          {
            label: "Costo promedio",
            value: stats.costoPromedio > 0 ? formatearPrecio(stats.costoPromedio) : "—",
            icon: BarChart3,
            iconBg: "bg-orange-50",
            iconColor: "text-orange-600",
            href: "/reportes/costos",
            mono: true,
          },
        ].map(({ label, value, subtext, icon: Icon, iconBg, iconColor, href, mono }) => (
          <Link
            key={label}
            href={href}
            className="bg-card rounded-lg border border-border shadow-card flex items-center gap-4 px-5 py-5 hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className={`rounded-lg p-2.5 ${iconBg} shrink-0`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-2xl font-bold text-foreground leading-none ${mono ? "font-mono text-xl tabular-nums" : ""}`}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{label}</p>
              {subtext && (
                <p className="text-xs text-muted-foreground/60 mt-0.5">{subtext}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Segunda fila: Muebles costosos + Últimas actualizaciones de precios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top muebles por costo */}
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Muebles de mayor costo
            </h2>
            <Link href="/reportes/costos" className="text-xs text-primary hover:underline">
              Ver reporte
            </Link>
          </div>
          {stats.mueblesCostosos.length > 0 ? (
            <div className="divide-y divide-border">
              {stats.mueblesCostosos.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-xs font-mono text-muted-foreground/50 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/muebles/${m.id}`}
                        className="text-sm font-medium hover:text-primary transition-colors truncate block"
                      >
                        {m.nombre}
                      </Link>
                      <p className="text-xs text-muted-foreground font-mono">
                        {m.codigo} · {m.categoria.nombre}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-semibold text-foreground tabular-nums shrink-0 ml-3">
                    {formatearPrecio(Number(m.costoActual))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aún no hay muebles con costo cargado.{" "}
              <Link href="/muebles/nuevo" className="text-primary hover:underline">
                Crear el primero
              </Link>
            </div>
          )}
        </div>

        {/* Últimas actualizaciones de precios */}
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Últimas actualizaciones de precios
            </h2>
            <Link href="/insumos" className="text-xs text-primary hover:underline">
              Ver insumos
            </Link>
          </div>
          {stats.ultimosPrecios.length > 0 ? (
            <div className="divide-y divide-border">
              {stats.ultimosPrecios.map((h) => {
                const subio = Number(h.precioNuevo) > Number(h.precioAnterior);
                const delta = Number(h.precioNuevo) - Number(h.precioAnterior);
                const pct =
                  Number(h.precioAnterior) > 0
                    ? (delta / Number(h.precioAnterior)) * 100
                    : null;
                return (
                  <div key={h.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {h.precioProveedor.insumo.descripcion}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {h.precioProveedor.proveedor.nombre} · {formatearFecha(h.fechaCambio)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-mono font-semibold tabular-nums text-foreground">
                        {formatearPrecio(Number(h.precioNuevo))}
                      </p>
                      {pct !== null && (
                        <p className={`text-xs font-mono tabular-nums ${subio ? "text-red-600" : "text-emerald-600"}`}>
                          {subio ? "+" : ""}{pct.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No hay cambios de precios registrados aún.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
