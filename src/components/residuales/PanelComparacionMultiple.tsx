"use client";

import { useState, useEffect } from "react";
import { X, RotateCcw, TrendingDown, Bookmark, Loader2, AlertTriangle, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearPrecio } from "@/lib/formato";
import { toast } from "sonner";
import type { ResultadoComparacion } from "@/lib/comparacion-residuales";

interface ResidualBasico {
  id: string;
  altoCm: number;
  anchoCm: number;
  cantidad: number;
  insumo: { descripcion: string; espesormm?: number | null };
}

interface Props {
  residuales: ResidualBasico[];
  onCerrar: () => void;
  onReservasChange?: () => void;
}

interface DatosResidual {
  residualId: string;
  resultado: ResultadoComparacion;
  // muebleId → cantidad a asignar desde este residual
  cantidades: Map<string, number>;
}

export function PanelComparacionMultiple({ residuales, onCerrar, onReservasChange }: Props) {
  const [datos, setDatos] = useState<DatosResidual[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  // Qué residual está expandido (-1 = todos)
  const [expandido, setExpandido] = useState<string | null>(residuales[0]?.id ?? null);

  async function cargar() {
    setCargando(true);
    const resultados = await Promise.all(
      residuales.map(async (r) => {
        const res = await fetch(`/api/materiales-residuales/${r.id}/comparacion`);
        if (!res.ok) return null;
        const data: ResultadoComparacion = await res.json();
        const cantidades = new Map<string, number>();
        for (const grupo of data.porMueble) {
          if (grupo.cantidadAsignada > 0) cantidades.set(grupo.muebleId, grupo.cantidadAsignada);
        }
        return { residualId: r.id, resultado: data, cantidades } satisfies DatosResidual;
      })
    );
    setDatos(resultados.filter(Boolean) as DatosResidual[]);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setCantidad(residualId: string, muebleId: string, valor: number) {
    const dr = datos.find((d) => d.residualId === residualId);
    if (!dr) return;
    const nuevo = Math.max(0, Math.min(valor, dr.resultado.cantidadDisponible));
    setDatos((prev) =>
      prev.map((d) => {
        if (d.residualId !== residualId) return d;
        const next = new Map(d.cantidades);
        if (nuevo === 0) next.delete(muebleId);
        else next.set(muebleId, nuevo);
        return { ...d, cantidades: next };
      })
    );
  }

  function totalAsignado(dr: DatosResidual) {
    return Array.from(dr.cantidades.values()).reduce((s, v) => s + v, 0);
  }

  async function guardarTodo() {
    setGuardando(true);
    let errores = 0;
    let totalMuebles = 0;

    for (const dr of datos) {
      const asignaciones = dr.resultado.porMueble
        .filter((g) => (dr.cantidades.get(g.muebleId) ?? 0) > 0)
        .map((g) => ({ muebleId: g.muebleId, cantidad: dr.cantidades.get(g.muebleId)! }));

      const res = await fetch(`/api/materiales-residuales/${dr.residualId}/comparacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignaciones }),
      });

      if (!res.ok) {
        const err = await res.json();
        const residual = residuales.find((r) => r.id === dr.residualId);
        toast.error(`${residual?.insumo.descripcion ?? "Retazo"}: ${err.error ?? "Error al asignar"}`);
        errores++;
      } else {
        totalMuebles += asignaciones.length;
      }
    }

    if (errores === 0) {
      toast.success(
        totalMuebles > 0
          ? `Asignado a ${totalMuebles} combinación${totalMuebles !== 1 ? "es" : ""}`
          : "Asignaciones eliminadas"
      );
      await cargar();
      onReservasChange?.();
    }
    setGuardando(false);
  }

  const hayExceso = datos.some((dr) => totalAsignado(dr) > dr.resultado.cantidadDisponible);
  const totalMuebesAsignados = datos.reduce(
    (s, dr) => s + [...dr.cantidades.values()].filter((v) => v > 0).length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} />

      <div className="relative z-10 h-full w-full max-w-2xl bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Asignación múltiple</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {residuales.length} retazo{residuales.length !== 1 ? "s" : ""} seleccionado{residuales.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onCerrar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {cargando && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analizando retazos…</span>
            </div>
          )}

          {!cargando && datos.map((dr) => {
            const residual = residuales.find((r) => r.id === dr.residualId)!;
            const abierto = expandido === dr.residualId;
            const total = totalAsignado(dr);
            const exceso = total > dr.resultado.cantidadDisponible;

            return (
              <div key={dr.residualId} className="rounded-lg border border-border overflow-hidden">
                {/* Cabecera del retazo */}
                <button
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                  onClick={() => setExpandido(abierto ? null : dr.residualId)}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground">{residual.insumo.descripcion}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {residual.altoCm}×{residual.anchoCm} cm
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    {dr.resultado.totalCortes === 0 ? (
                      <span className="text-muted-foreground/60">Sin coincidencias</span>
                    ) : (
                      <>
                        <span className={exceso ? "text-destructive font-semibold" : "text-muted-foreground"}>
                          {total}/{dr.resultado.cantidadDisponible} asignados
                        </span>
                        <span className="text-muted-foreground">{dr.resultado.totalCortes} cortes coincidentes</span>
                      </>
                    )}
                    <span className="text-muted-foreground">{abierto ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Contenido desplegable */}
                {abierto && (
                  <div className="px-4 py-3 space-y-3">
                    {dr.resultado.totalCortes === 0 ? (
                      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                        <TrendingDown className="h-4 w-4 shrink-0" />
                        <span>Ningún corte del despiece encaja en este retazo.</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Indicá cuántos retazos de <strong>{residual.insumo.descripcion} ({residual.altoCm}×{residual.anchoCm} cm)</strong> asignás a cada mueble.
                        </p>

                        {/* Barra de capacidad */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Retazos a asignar</span>
                            <span className={`font-mono font-semibold ${exceso ? "text-destructive" : "text-foreground"}`}>
                              {total} / {dr.resultado.cantidadDisponible}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${exceso ? "bg-destructive" : total === dr.resultado.cantidadDisponible ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(100, (total / dr.resultado.cantidadDisponible) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {dr.resultado.porMueble.map((grupo) => {
                          const qty = dr.cantidades.get(grupo.muebleId) ?? 0;
                          const capacidadRestante = dr.resultado.cantidadDisponible - total + qty;

                          return (
                            <div
                              key={grupo.muebleId}
                              className={`rounded-md border transition-colors ${qty > 0 ? "border-primary/30 bg-primary/5" : "border-border"}`}
                            >
                              <div className="flex items-center justify-between gap-3 px-3 py-2">
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-foreground">{grupo.muebleNombre}</span>
                                  <span className="ml-2 font-mono text-xs text-muted-foreground">{grupo.muebleCodigo}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {grupo.cortes.length} pieza{grupo.cortes.length !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30"
                                    onClick={() => setCantidad(dr.residualId, grupo.muebleId, qty - 1)}
                                    disabled={qty === 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={capacidadRestante}
                                    value={qty}
                                    onChange={(e) => setCantidad(dr.residualId, grupo.muebleId, parseInt(e.target.value, 10) || 0)}
                                    className={`w-10 text-center rounded border text-sm font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring py-0.5 ${
                                      qty > 0 ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-background text-muted-foreground"
                                    }`}
                                  />
                                  <button
                                    className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30"
                                    onClick={() => setCantidad(dr.residualId, grupo.muebleId, qty + 1)}
                                    disabled={total >= dr.resultado.cantidadDisponible && qty === (dr.cantidades.get(grupo.muebleId) ?? 0)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Cortes de referencia (colapsados por defecto) */}
                              <div className="border-t border-border/40 mx-3 mb-2">
                                <table className="w-full text-[11px] mt-1.5">
                                  <tbody className="divide-y divide-border/30">
                                    {grupo.cortes.map((corte) => (
                                      <tr key={corte.despieceMaterialId} className="text-muted-foreground">
                                        <td className="py-0.5 pl-1 max-w-[140px]">
                                          <span className="truncate block">{corte.pieza}</span>
                                          {corte.insumoNombre && (
                                            <span className="text-[10px] opacity-60 block truncate">{corte.insumoNombre}</span>
                                          )}
                                        </td>
                                        <td className="py-0.5 text-center font-mono whitespace-nowrap">
                                          {corte.altoCm}×{corte.anchoCm}
                                          {corte.rotado && <RotateCcw className="inline h-2.5 w-2.5 ml-1 text-amber-500" />}
                                        </td>
                                        <td className="py-0.5 text-center">{corte.cantidad} pz</td>
                                        <td className="py-0.5 text-right font-mono text-emerald-700 pr-1">
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
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!cargando && (
          <div className="px-5 py-3 border-t border-border bg-secondary/20 shrink-0 space-y-2">
            {hayExceso && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Algún retazo tiene más asignaciones que disponibles.</span>
              </div>
            )}

            {totalMuebesAsignados > 0 && !hayExceso && (
              <p className="text-xs text-muted-foreground">
                {datos.length} retazo{datos.length !== 1 ? "s" : ""} · {totalMuebesAsignados} asignación{totalMuebesAsignados !== 1 ? "es" : ""} a guardar
              </p>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={guardarTodo}
                disabled={guardando || hayExceso}
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
