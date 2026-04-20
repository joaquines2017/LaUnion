"use client";

import { useState } from "react";
import { X, RotateCcw, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearPrecio } from "@/lib/formato";
import type { ResultadoComparacion } from "@/lib/comparacion-residuales";

interface Residual {
  id: string;
  altoCm: number;
  anchoCm: number;
  cantidad: number;
  insumo: { descripcion: string; espesormm?: number | null };
}

interface Props {
  residual: Residual;
  onCerrar: () => void;
}

export function PanelComparacion({ residual, onCerrar }: Props) {
  const [resultado, setResultado] = useState<ResultadoComparacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargado, setCargado] = useState(false);

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/materiales-residuales/${residual.id}/comparacion`);
    if (res.ok) {
      setResultado(await res.json());
      setCargado(true);
    }
    setCargando(false);
  }

  // Cargar al montar
  if (!cargado && !cargando) cargar();

  const titulo = `${residual.insumo.descripcion}${residual.insumo.espesormm ? ` ${residual.insumo.espesormm}mm` : ""} — ${residual.altoCm}×${residual.anchoCm} cm × ${residual.cantidad} pieza${residual.cantidad !== 1 ? "s" : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} />

      {/* Panel lateral */}
      <div className="relative z-10 h-full w-full max-w-lg bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Comparación de retazo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{titulo}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onCerrar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cargando && (
            <p className="text-sm text-muted-foreground text-center py-8">Analizando…</p>
          )}

          {cargado && resultado && resultado.totalCortes === 0 && (
            <div className="text-center py-12">
              <TrendingDown className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Ningún corte del despiece de muebles activos entra en este retazo.
              </p>
            </div>
          )}

          {cargado && resultado && resultado.totalCortes > 0 && (
            <>
              {resultado.porMueble.map((grupo) => (
                <div key={grupo.muebleId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{grupo.muebleNombre}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{grupo.muebleCodigo}</span>
                    </div>
                    {grupo.ahorroTotal > 0 && (
                      <span className="text-xs font-mono font-semibold text-emerald-700">
                        {formatearPrecio(grupo.ahorroTotal)}
                      </span>
                    )}
                  </div>
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/60">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Pieza</th>
                          <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">Medidas</th>
                          <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">Cant.</th>
                          <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Ahorro est.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {grupo.cortes.map((corte) => (
                          <tr key={corte.despieceMaterialId} className="hover:bg-secondary/30">
                            <td className="px-3 py-1.5 font-medium truncate max-w-[140px]">
                              {corte.pieza}
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono text-muted-foreground">
                              {corte.altoCm}×{corte.anchoCm} cm
                              {corte.rotado && (
                                <span title="Entra rotado"><RotateCcw className="inline h-3 w-3 ml-1 text-amber-500" /></span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-center text-muted-foreground">{corte.cantidad}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-emerald-700">
                              {corte.ahorroEstimado > 0 ? formatearPrecio(corte.ahorroEstimado) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer con total */}
        {cargado && resultado && resultado.totalAhorro > 0 && (
          <div className="px-5 py-3 border-t border-border bg-secondary/30 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {resultado.totalCortes} corte{resultado.totalCortes !== 1 ? "s" : ""} en{" "}
              {resultado.porMueble.length} mueble{resultado.porMueble.length !== 1 ? "s" : ""}
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Ahorro total estimado</div>
              <div className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                {formatearPrecio(resultado.totalAhorro)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
