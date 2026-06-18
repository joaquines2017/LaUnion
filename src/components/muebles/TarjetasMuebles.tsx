import Link from "next/link";
import { AlertTriangle, ImageIcon } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import { AccionesTabla } from "@/components/shared/AccionesTabla";
import { TarjetaImagenCiclo } from "./TarjetaImagenCiclo";
import type { MuebleRow } from "./TablaMuebles";

interface Props {
  muebles: MuebleRow[];
  estadoFiltro: string;
  q?: string;
}

export function TarjetasMuebles({ muebles, estadoFiltro, q }: Props) {
  if (muebles.length === 0) {
    return (
      <div className="py-20 text-center">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">
          {q
            ? `Sin resultados para "${q}"`
            : estadoFiltro === "inactivo"
            ? "No hay muebles inactivos."
            : (
              <>
                No hay muebles.{" "}
                <Link href="/muebles/nuevo" className="text-primary hover:underline font-medium">
                  Crear el primero
                </Link>
              </>
            )}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {muebles.map((m) => {
        const costo = Number(m.costoActual);
        const items = m._count.materiales + m._count.insumos;

        return (
          <div
            key={m.id}
            className={`group rounded-xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col ${
              estadoFiltro === "inactivo" ? "opacity-60" : ""
            }`}
          >
            {/* Foto — área de imagen con ciclo; el nombre de abajo es el link al detalle */}
            <div className="relative aspect-[4/3] bg-secondary/40 overflow-hidden">
              <TarjetaImagenCiclo imagenes={m.imagenes} nombre={m.nombre} />

              {/* Badge categoría */}
              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/55 text-white backdrop-blur-sm leading-tight max-w-[75%] truncate z-10">
                {m.categoria.nombre}
              </span>
            </div>

            {/* Info — también link */}
            <Link href={`/muebles/${m.id}`} className="px-3 pt-2.5 pb-1 flex flex-col gap-0.5 flex-1">
              <p className="font-mono text-[10px] text-muted-foreground leading-none">{m.codigo}</p>
              <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 mt-0.5">
                {m.nombre}
              </h3>
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-[10px] text-muted-foreground">
                  {items > 0 ? `${items} ítems` : <span className="opacity-50">Sin despiece</span>}
                </span>
                {costo > 0 ? (
                  <span className="font-mono font-bold text-xs text-emerald-700 tabular-nums">
                    {formatearPrecio(costo)}
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Sin costo
                  </span>
                )}
              </div>
            </Link>

            {/* Acciones siempre visibles */}
            <div className="px-2 pb-2 pt-1 flex justify-end border-t border-border/50 mt-1">
              <AccionesTabla id={m.id} entidad="muebles" nombre={m.nombre} estadoActual={m.estado} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
