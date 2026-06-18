import Link from "next/link";
import { ImageIcon, AlertTriangle } from "lucide-react";
import { AccionesTabla } from "@/components/shared/AccionesTabla";
import { formatearPrecio } from "@/lib/formato";

interface Imagen { id: string; url: string; filename: string }

export interface MuebleRow {
  id: string;
  codigo: string;
  nombre: string;
  costoActual: string | number | { toString(): string };
  estado: string;
  categoria: { nombre: string };
  imagenes: Imagen[];
  _count: { materiales: number; insumos: number };
}

interface Props {
  muebles: MuebleRow[];
  estadoFiltro: string;
  q?: string;
}

export function TablaMuebles({ muebles, estadoFiltro, q }: Props) {
  return (
    <table className="na-table">
      <thead>
        <tr>
          <th className="w-14"></th>
          <th>Código</th>
          <th>Nombre</th>
          <th>Categoría</th>
          <th className="text-center w-20">Ítems</th>
          <th className="text-right">Costo</th>
          <th className="w-20"></th>
        </tr>
      </thead>
      <tbody>
        {muebles.map((m) => {
          const img = m.imagenes[0]?.url ?? null;
          const costo = Number(m.costoActual);
          const items = m._count.materiales + m._count.insumos;

          return (
            <tr key={m.id} className={estadoFiltro === "inactivo" ? "opacity-60" : ""}>
              {/* Foto */}
              <td className="px-3">
                <Link href={`/muebles/${m.id}`}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-secondary/40 flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all flex-shrink-0">
                    {img
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={img} alt={m.nombre} className="w-full h-full object-cover" />
                      : <ImageIcon className="h-4 w-4 text-muted-foreground/30" />}
                  </div>
                </Link>
              </td>
              {/* Código */}
              <td>
                <span className="font-mono text-xs text-muted-foreground">{m.codigo}</span>
              </td>
              {/* Nombre */}
              <td>
                <Link href={`/muebles/${m.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                  {m.nombre}
                </Link>
              </td>
              {/* Categoría */}
              <td>
                <span className="na-badge bg-blue-50 text-blue-700 border border-blue-100">
                  {m.categoria.nombre}
                </span>
              </td>
              {/* Ítems */}
              <td className="text-center">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{items}</span>
              </td>
              {/* Costo */}
              <td className="text-right font-mono font-semibold tabular-nums">
                {costo > 0 ? (
                  formatearPrecio(costo)
                ) : (
                  <span className="flex items-center justify-end gap-1 text-xs font-medium text-amber-600 font-sans">
                    <AlertTriangle className="h-3 w-3" />
                    Sin costo
                  </span>
                )}
              </td>
              {/* Acciones */}
              <td>
                <AccionesTabla id={m.id} entidad="muebles" nombre={m.nombre} estadoActual={m.estado} />
              </td>
            </tr>
          );
        })}
        {muebles.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
              {q
                ? `Sin resultados para "${q}"`
                : estadoFiltro === "inactivo"
                ? "No hay muebles inactivos."
                : <>No hay muebles. <Link href="/muebles/nuevo" className="text-primary hover:underline font-medium">Crear el primero</Link></>}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
