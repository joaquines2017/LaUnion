"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import type { ResultadoCascada } from "@/lib/recalculo-cascada";

interface Props {
  open: boolean;
  onClose: () => void;
  cascada: ResultadoCascada | null;
  insumoNombre: string;
  precioAnterior: number | null;
  precioNuevo: number;
}

export function ModalRecalculo({
  open,
  onClose,
  cascada,
  insumoNombre,
  precioAnterior,
  precioNuevo,
}: Props) {
  if (!cascada) return null;

  const { muebleAfectados, lineasActualizadas, resultados } = cascada;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Recálculo en cascada completado
          </DialogTitle>
          <DialogDescription>
            El precio de <strong>{insumoNombre}</strong> fue actualizado
            {precioAnterior != null && (
              <>
                {" "}de{" "}
                <strong>{formatearPrecio(precioAnterior)}</strong>
              </>
            )}{" "}
            a <strong>{formatearPrecio(precioNuevo)}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-3 my-2">
          <div className="bg-secondary/60 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {muebleAfectados}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {muebleAfectados === 1 ? "mueble afectado" : "muebles afectados"}
            </div>
          </div>
          <div className="bg-secondary/60 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {lineasActualizadas}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {lineasActualizadas === 1 ? "línea actualizada" : "líneas actualizadas"}
            </div>
          </div>
        </div>

        {/* Tabla de resultados */}
        {resultados.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/70 border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Mueble
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Costo anterior
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Costo nuevo
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Variación
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resultados
                  .sort((a, b) => {
                    const va = Math.abs(a.variacionPct ?? 0);
                    const vb = Math.abs(b.variacionPct ?? 0);
                    return vb - va;
                  })
                  .map((r) => {
                    const subio =
                      r.variacionPct != null && r.variacionPct > 0.01;
                    const bajo =
                      r.variacionPct != null && r.variacionPct < -0.01;

                    return (
                      <tr key={r.muebleId} className="hover:bg-secondary/30">
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">
                            {r.nombre}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {r.codigo}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                          {r.costoAnterior > 0
                            ? formatearPrecio(r.costoAnterior)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                          {formatearPrecio(r.costoNuevo)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.variacionPct == null ? (
                            <span className="text-xs text-muted-foreground/60">
                              nuevo
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
                                subio
                                  ? "text-red-600"
                                  : bajo
                                  ? "text-emerald-600"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {subio ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : bajo ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {subio ? "+" : ""}
                              {r.variacionPct.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Este insumo no está vinculado a ningún mueble. El precio fue
            actualizado sin afectar costos.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
