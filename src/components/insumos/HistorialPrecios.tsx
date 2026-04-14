import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearPrecio, formatearFecha } from "@/lib/formato";
import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";

interface ItemHistorial {
  id: string;
  precioAnterior: number | string | { toString(): string };
  precioNuevo: number | string | { toString(): string };
  fechaCambio: Date | string;
  precioProveedor: {
    proveedor: { nombre: string };
  };
}

interface Props {
  historial: ItemHistorial[];
}

export function HistorialPrecios({ historial }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Historial de cambios de precio
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Fecha
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Proveedor
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Anterior
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Nuevo
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Variación
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {historial.map((h) => {
              const anterior = Number(h.precioAnterior);
              const nuevo = Number(h.precioNuevo);
              const delta = nuevo - anterior;
              const pct = anterior > 0 ? (delta / anterior) * 100 : null;
              const subio = delta > 0;
              const bajo = delta < 0;

              return (
                <tr key={h.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {formatearFecha(h.fechaCambio)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {h.precioProveedor.proveedor.nombre}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground line-through text-xs">
                    {formatearPrecio(anterior)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-foreground">
                    {formatearPrecio(nuevo)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {pct === null ? (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    ) : (
                      <span
                        className={`inline-flex items-center justify-end gap-1 text-xs font-semibold tabular-nums ${
                          subio ? "text-red-600" : bajo ? "text-emerald-600" : "text-muted-foreground"
                        }`}
                      >
                        {subio ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : bajo ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {subio ? "+" : ""}{pct.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
