"use client";

import { useState, useEffect } from "react";
import { X, RotateCcw, TrendingDown, Bookmark, Loader2, AlertTriangle, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearPrecio } from "@/lib/formato";
import { toast } from "sonner";
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
  onReservasChange?: () => void;
}

export function PanelComparacion({ residual, onCerrar, onReservasChange }: Props) {
  const [resultado, setResultado] = useState<ResultadoComparacion | null>(null);
  const [cargando, setCargando] = useState(true);
  // Map: muebleId → cantidad de retazos asignados a ese mueble
  const [cantidades, setCantidades] = useState<Map<string, number>>(new Map());
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/materiales-residuales/${residual.id}/comparacion`);
    if (res.ok) {
      const data: ResultadoComparacion = await res.json();
      setResultado(data);
      // Pre-cargar cantidades desde las asignaciones actuales
      const mapa = new Map<string, number>();
      for (const grupo of data.porMueble) {
        if (grupo.cantidadAsignada > 0) mapa.set(grupo.muebleId, grupo.cantidadAsignada);
      }
      setCantidades(mapa);
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cantidadDisponible = resultado?.cantidadDisponible ?? residual.cantidad;

  // Total de retazos que estoy asignando
  const totalAsignado = resultado
    ? resultado.porMueble.reduce((s, g) => s + (cantidades.get(g.muebleId) ?? 0), 0)
    : 0;
  const capacidadExcedida = totalAsignado > cantidadDisponible;

  function setCantidad(muebleId: string, valor: number) {
    const nuevo = Math.max(0, Math.min(valor, cantidadDisponible));
    setCantidades((prev) => {
      const next = new Map(prev);
      if (nuevo === 0) next.delete(muebleId);
      else next.set(muebleId, nuevo);
      return next;
    });
  }

  function toggleMueble(muebleId: string) {
    const actual = cantidades.get(muebleId) ?? 0;
    if (actual > 0) {
      setCantidad(muebleId, 0);
    } else {
      const capacidadRestante = cantidadDisponible - totalAsignado;
      if (capacidadRestante <= 0) {
        toast.warning(`Sin capacidad: ya asignaste los ${cantidadDisponible} retazo${cantidadDisponible !== 1 ? "s" : ""} disponibles.`);
        return;
      }
      setCantidad(muebleId, Math.min(1, capacidadRestante));
    }
  }

  async function guardarAsignaciones() {
    if (!resultado) return;
    setGuardando(true);

    const asignaciones = resultado.porMueble
      .filter((g) => (cantidades.get(g.muebleId) ?? 0) > 0)
      .map((g) => ({ muebleId: g.muebleId, cantidad: cantidades.get(g.muebleId)! }));

    try {
      const res = await fetch(`/api/materiales-residuales/${residual.id}/comparacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignaciones }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Error al asignar");
        setGuardando(false);
        return;
      }

      toast.success(
        asignaciones.length > 0
          ? `Asignado a ${asignaciones.length} mueble${asignaciones.length !== 1 ? "s" : ""}`
          : "Asignaciones eliminadas"
      );
      await cargar();
      onReservasChange?.();
    } catch {
      toast.error("Error al guardar asignaciones");
    }
    setGuardando(false);
  }

  const titulo = `${residual.insumo.descripcion} — ${residual.altoCm}×${residual.anchoCm} cm`;
  const muebesAsignados = resultado?.porMueble.filter((g) => (cantidades.get(g.muebleId) ?? 0) > 0).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} />

      <div className="relative z-10 h-full w-full max-w-xl bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Asignación de retazo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{titulo}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onCerrar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cargando && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analizando cortes…</span>
            </div>
          )}

          {!cargando && resultado?.totalCortes === 0 && (
            <div className="text-center py-12">
              <TrendingDown className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Ningún corte del despiece de muebles activos entra en este retazo.
              </p>
            </div>
          )}

          {!cargando && resultado && resultado.totalCortes > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Indicá cuántos retazos de este material asignás a cada mueble. Los cortes listados debajo son de referencia: son las piezas del despiece que entran en este retazo.
              </p>

              <div className="space-y-3">
                {resultado.porMueble.map((grupo) => {
                  const qty = cantidades.get(grupo.muebleId) ?? 0;
                  const asignado = qty > 0;
                  const capacidadRestante = cantidadDisponible - totalAsignado + qty;

                  return (
                    <div
                      key={grupo.muebleId}
                      className={`rounded-lg border transition-colors ${
                        asignado ? "border-primary/30 bg-primary/5" : "border-border bg-background"
                      }`}
                    >
                      {/* Cabecera del mueble */}
                      <div
                        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
                        onClick={() => toggleMueble(grupo.muebleId)}
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-foreground">{grupo.muebleNombre}</span>
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{grupo.muebleCodigo}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {grupo.cortes.length} pieza{grupo.cortes.length !== 1 ? "s" : ""} coincidentes
                          </span>
                        </div>

                        {/* Control de cantidad */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30"
                            onClick={() => setCantidad(grupo.muebleId, qty - 1)}
                            disabled={qty === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={capacidadRestante}
                            value={qty}
                            onChange={(e) => setCantidad(grupo.muebleId, parseInt(e.target.value, 10) || 0)}
                            className={`w-12 text-center rounded border text-sm font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring py-0.5 ${
                              qty > 0
                                ? "border-primary/40 bg-primary/5 text-primary"
                                : "border-border bg-background text-muted-foreground"
                            }`}
                          />
                          <button
                            className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30"
                            onClick={() => setCantidad(grupo.muebleId, qty + 1)}
                            disabled={totalAsignado >= cantidadDisponible && qty === (cantidades.get(grupo.muebleId) ?? 0)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <span className="text-[10px] text-muted-foreground ml-0.5">retazo{qty !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      {/* Cortes de referencia */}
                      <div className="border-t border-border/50 mx-3 mb-3">
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left pb-1 font-medium pl-1">Pieza</th>
                              <th className="text-center pb-1 font-medium">Medidas</th>
                              <th className="text-center pb-1 font-medium">Cant.</th>
                              <th className="text-right pb-1 font-medium pr-1">Ahorro est.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {grupo.cortes.map((corte) => (
                              <tr key={corte.despieceMaterialId} className="text-muted-foreground">
                                <td className="py-1 pl-1 max-w-[160px]">
                                  <span className="font-medium block truncate">{corte.pieza}</span>
                                  {corte.insumoNombre && (
                                    <span className="text-[10px] text-muted-foreground/60 block truncate">{corte.insumoNombre}</span>
                                  )}
                                </td>
                                <td className="py-1 text-center font-mono whitespace-nowrap">
                                  {corte.altoCm}×{corte.anchoCm}
                                  {corte.rotado && (
                                    <span title="Entra rotado">
                                      <RotateCcw className="inline h-3 w-3 ml-1 text-amber-500" />
                                    </span>
                                  )}
                                </td>
                                <td className="py-1 text-center">{corte.cantidad}</td>
                                <td className="py-1 text-right font-mono text-emerald-700 pr-1">
                                  {corte.ahorroEstimado > 0 ? formatearPrecio(corte.ahorroEstimado) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!cargando && resultado && resultado.totalCortes > 0 && (
          <div className="px-5 py-3 border-t border-border bg-secondary/20 shrink-0 space-y-2">
            {/* Barra de capacidad */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Retazos a asignar
                  {resultado.cantidadUsada > 0 && (
                    <span className="ml-1 text-muted-foreground/60">
                      ({resultado.cantidadUsada} ya asignado{resultado.cantidadUsada !== 1 ? "s" : ""})
                    </span>
                  )}
                </span>
                <span className={`font-mono font-semibold tabular-nums ${
                  capacidadExcedida ? "text-destructive" : totalAsignado > 0 ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {totalAsignado} / {cantidadDisponible}
                </span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    capacidadExcedida ? "bg-destructive" :
                    totalAsignado === cantidadDisponible ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, (totalAsignado / cantidadDisponible) * 100)}%` }}
                />
              </div>
            </div>

            {capacidadExcedida && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>La asignación supera los retazos disponibles.</span>
              </div>
            )}

            {muebesAsignados > 0 && !capacidadExcedida && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {muebesAsignados} mueble{muebesAsignados !== 1 ? "s" : ""} · {totalAsignado} retazo{totalAsignado !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={guardarAsignaciones}
                disabled={guardando || capacidadExcedida}
              >
                {guardando ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                )}
                {guardando ? "Guardando…" : "Guardar asignaciones"}
              </Button>
              <Button variant="outline" onClick={onCerrar}>Cerrar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
