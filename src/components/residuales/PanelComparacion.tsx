"use client";

import { useState, useEffect } from "react";
import { X, RotateCcw, TrendingDown, Bookmark, Loader2, AlertTriangle, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearPrecio } from "@/lib/formato";
import { toast } from "sonner";
import type { ResultadoComparacion, CorteCoincidente } from "@/lib/comparacion-residuales";

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
  // Map: despieceMaterialId → cantidad asignada desde este retazo (0 = no asignado)
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
        for (const c of grupo.cortes) {
          if (c.cantidadEnActual > 0) mapa.set(c.despieceMaterialId, c.cantidadEnActual);
        }
      }
      setCantidades(mapa);
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const todosCortes = resultado?.porMueble.flatMap((g) => g.cortes) ?? [];

  // Total de piezas que estoy asignando desde este retazo
  const totalAsignado = todosCortes.reduce((s, c) => s + (cantidades.get(c.despieceMaterialId) ?? 0), 0);
  const cantidadDisponible = resultado?.cantidadDisponible ?? residual.cantidad;
  const capacidadExcedida = totalAsignado > cantidadDisponible;

  // Ahorro de las piezas seleccionadas
  const ahorroTotal = todosCortes.reduce((s, c) => {
    const qty = cantidades.get(c.despieceMaterialId) ?? 0;
    if (qty === 0) return s;
    // Proporcional a la cantidad asignada sobre la total del corte
    return s + (c.ahorroEstimado * qty) / c.cantidad;
  }, 0);

  function setCantidad(corte: CorteCoincidente, valor: number) {
    const maxAsignable = corte.cantidad - corte.cantidadEnOtros;
    const nuevo = Math.max(0, Math.min(valor, maxAsignable));
    setCantidades((prev) => {
      const next = new Map(prev);
      if (nuevo === 0) next.delete(corte.despieceMaterialId);
      else next.set(corte.despieceMaterialId, nuevo);
      return next;
    });
  }

  function toggleCorte(corte: CorteCoincidente) {
    const actual = cantidades.get(corte.despieceMaterialId) ?? 0;
    if (actual > 0) {
      // Deseleccionar
      setCantidad(corte, 0);
    } else {
      // Seleccionar con el máximo posible
      const maxAsignable = corte.cantidad - corte.cantidadEnOtros;
      const capacidadRestante = cantidadDisponible - totalAsignado;
      const nuevo = Math.min(maxAsignable, capacidadRestante);
      if (nuevo <= 0) {
        toast.warning(`Sin capacidad: quedan ${capacidadRestante} pieza${capacidadRestante !== 1 ? "s" : ""} disponibles en este retazo.`);
        return;
      }
      setCantidad(corte, nuevo);
    }
  }

  async function guardarAsignaciones() {
    if (!resultado) return;
    setGuardando(true);

    const asignaciones = todosCortes
      .filter((c) => (cantidades.get(c.despieceMaterialId) ?? 0) > 0)
      .map((c) => ({ despieceMaterialId: c.despieceMaterialId, cantidad: cantidades.get(c.despieceMaterialId)! }));

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
          ? `${asignaciones.length} corte${asignaciones.length !== 1 ? "s" : ""} asignado${asignaciones.length !== 1 ? "s" : ""}`
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
  const cortesAsignados = todosCortes.filter((c) => (cantidades.get(c.despieceMaterialId) ?? 0) > 0).length;

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
                Indicá cuántas piezas de cada corte salís de este retazo. Podés asignar el mismo corte desde distintos retazos.
              </p>

              {resultado.porMueble.map((grupo) => (
                <div key={grupo.muebleId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{grupo.muebleNombre}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{grupo.muebleCodigo}</span>
                    </div>
                    <span className="text-xs font-mono text-emerald-700 font-semibold">
                      {formatearPrecio(grupo.ahorroTotal)}
                    </span>
                  </div>

                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/60">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Pieza</th>
                          <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Medidas</th>
                          <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Total</th>
                          <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">Desde este retazo</th>
                          <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Ahorro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {grupo.cortes.map((corte) => {
                          const qty = cantidades.get(corte.despieceMaterialId) ?? 0;
                          const maxAsignable = corte.cantidad - corte.cantidadEnOtros;
                          const asignado = qty > 0;
                          return (
                            <tr
                              key={corte.despieceMaterialId}
                              className={`transition-colors ${asignado ? "bg-primary/5" : "hover:bg-secondary/30"} cursor-pointer`}
                              onClick={() => toggleCorte(corte)}
                            >
                              <td className="px-3 py-2 font-medium max-w-[140px]">
                                <span className="truncate block">{corte.pieza}</span>
                              </td>
                              <td className="px-2 py-2 text-center font-mono text-muted-foreground whitespace-nowrap">
                                {corte.altoCm}×{corte.anchoCm}
                                {corte.rotado && (
                                  <span title="Entra rotado">
                                    <RotateCcw className="inline h-3 w-3 ml-1 text-amber-500" />
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center text-muted-foreground">
                                <span>{corte.cantidad}</span>
                                {corte.cantidadEnOtros > 0 && (
                                  <span className="ml-1 text-[10px] text-amber-600" title={`${corte.cantidadEnOtros} asignadas en otros retazos`}>
                                    ({corte.cantidadEnOtros} otros)
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30"
                                    onClick={() => setCantidad(corte, qty - 1)}
                                    disabled={qty === 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={maxAsignable}
                                    value={qty}
                                    onChange={(e) => setCantidad(corte, parseInt(e.target.value, 10) || 0)}
                                    className={`w-10 text-center rounded border text-sm font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring py-0.5 ${
                                      qty > 0 ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-background text-muted-foreground"
                                    }`}
                                  />
                                  <button
                                    className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30"
                                    onClick={() => setCantidad(corte, qty + 1)}
                                    disabled={qty >= maxAsignable || totalAsignado >= cantidadDisponible}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                  <span className="text-[10px] text-muted-foreground ml-0.5">/ {maxAsignable}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-emerald-700">
                                {corte.ahorroEstimado > 0 ? formatearPrecio(corte.ahorroEstimado) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
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
                  Piezas a asignar
                  {resultado.cantidadUsada > 0 && (
                    <span className="ml-1 text-muted-foreground/60">
                      ({resultado.cantidadUsada} ya asignada{resultado.cantidadUsada !== 1 ? "s" : ""})
                    </span>
                  )}
                </span>
                <span className={`font-mono font-semibold tabular-nums ${capacidadExcedida ? "text-destructive" : totalAsignado > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                  {totalAsignado} / {cantidadDisponible}
                </span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${capacidadExcedida ? "bg-destructive" : totalAsignado === cantidadDisponible ? "bg-amber-500" : "bg-emerald-500"}`}
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

            {cortesAsignados > 0 && !capacidadExcedida && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {cortesAsignados} corte{cortesAsignados !== 1 ? "s" : ""} · {totalAsignado} pz
                </span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                  Ahorro: {formatearPrecio(ahorroTotal)}
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
