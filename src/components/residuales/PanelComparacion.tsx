"use client";

import { useState, useEffect } from "react";
import { X, RotateCcw, TrendingDown, Bookmark, BookmarkCheck, Loader2, AlertTriangle } from "lucide-react";
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
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/materiales-residuales/${residual.id}/comparacion`);
    if (res.ok) {
      const data: ResultadoComparacion = await res.json();
      setResultado(data);
      // Pre-seleccionar los ya reservados por este retazo
      const yaReservados = new Set<string>();
      for (const grupo of data.porMueble) {
        for (const c of grupo.cortes) {
          if (c.reservadoEnActual) yaReservados.add(c.despieceMaterialId);
        }
      }
      setSeleccionados(yaReservados);
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Suma de cantidades de los cortes seleccionados
  const todosCortes = resultado?.porMueble.flatMap((g) => g.cortes) ?? [];
  const cantidadSeleccionada = todosCortes
    .filter((c) => seleccionados.has(c.despieceMaterialId))
    .reduce((s, c) => s + c.cantidad, 0);
  const cantidadDisponible = resultado?.cantidadDisponible ?? residual.cantidad;
  const capacidadExcedida = cantidadSeleccionada > cantidadDisponible;

  function toggleCorte(corte: CorteCoincidente) {
    // No permitir seleccionar cortes reservados por OTRO retazo
    if (corte.reservadoEn && !corte.reservadoEnActual) return;

    const yaSeleccionado = seleccionados.has(corte.despieceMaterialId);

    // Al agregar: verificar que no supere la capacidad
    if (!yaSeleccionado) {
      const nuevaCantidad = cantidadSeleccionada + corte.cantidad;
      if (nuevaCantidad > cantidadDisponible) {
        toast.warning(
          `No alcanza: este corte necesita ${corte.cantidad} pieza${corte.cantidad !== 1 ? "s" : ""} ` +
          `y solo quedan ${cantidadDisponible - cantidadSeleccionada} disponible${cantidadDisponible - cantidadSeleccionada !== 1 ? "s" : ""}.`
        );
        return;
      }
    }

    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(corte.despieceMaterialId)) next.delete(corte.despieceMaterialId);
      else next.add(corte.despieceMaterialId);
      return next;
    });
  }

  async function guardarReservas() {
    if (!resultado) return;
    setGuardando(true);

    try {
      // POST con la lista completa deseada (semántica "set")
      const res = await fetch(`/api/materiales-residuales/${residual.id}/comparacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ despieceMaterialIds: [...seleccionados] }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Error al reservar");
        setGuardando(false);
        return;
      }

      toast.success(
        seleccionados.size > 0
          ? `${seleccionados.size} corte${seleccionados.size !== 1 ? "s" : ""} reservado${seleccionados.size !== 1 ? "s" : ""}`
          : "Reservas eliminadas"
      );
      await cargar();
      onReservasChange?.();
    } catch {
      toast.error("Error al guardar reservas");
    }
    setGuardando(false);
  }

  const titulo = `${residual.insumo.descripcion} — ${residual.altoCm}×${residual.anchoCm} cm`;

  // Ahorro de cortes seleccionados
  const ahorroSeleccionados = todosCortes
    .filter((c) => seleccionados.has(c.despieceMaterialId))
    .reduce((s, c) => s + c.ahorroEstimado, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} />

      <div className="relative z-10 h-full w-full max-w-lg bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
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
                Seleccioná los cortes que vas a usar de este retazo. La suma de piezas no puede superar la cantidad de retazos disponibles ({cantidadDisponible}).
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
                          <th className="w-8 px-2 py-1.5"></th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Pieza</th>
                          <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Medidas</th>
                          <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Cant.</th>
                          <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Ahorro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {grupo.cortes.map((corte) => {
                          const reservadoOtro = corte.reservadoEn && !corte.reservadoEnActual;
                          const checked = seleccionados.has(corte.despieceMaterialId);
                          // Deshabilitar si agregar excedería la capacidad
                          const excederia = !checked && (cantidadSeleccionada + corte.cantidad > cantidadDisponible);
                          const deshabilitado = !!reservadoOtro || excederia;
                          return (
                            <tr
                              key={corte.despieceMaterialId}
                              className={`transition-colors ${
                                reservadoOtro
                                  ? "opacity-40 cursor-not-allowed bg-secondary/20"
                                  : excederia && !checked
                                  ? "opacity-50 cursor-not-allowed"
                                  : checked
                                  ? "bg-primary/5 cursor-pointer hover:bg-primary/10"
                                  : "cursor-pointer hover:bg-secondary/30"
                              }`}
                              onClick={() => !deshabilitado && toggleCorte(corte)}
                            >
                              <td className="px-2 py-2 text-center">
                                {reservadoOtro ? (
                                  <span title="Reservado en otro retazo">
                                    <BookmarkCheck className="h-3.5 w-3.5 text-muted-foreground/50 mx-auto" />
                                  </span>
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={excederia && !checked}
                                    onChange={() => toggleCorte(corte)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded disabled:cursor-not-allowed"
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2 font-medium truncate max-w-[130px]">
                                {corte.pieza}
                                {reservadoOtro && (
                                  <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">(otro retazo)</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center font-mono text-muted-foreground whitespace-nowrap">
                                {corte.altoCm}×{corte.anchoCm}
                                {corte.rotado && (
                                  <span title="Entra rotado">
                                    <RotateCcw className="inline h-3 w-3 ml-1 text-amber-500" />
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center text-muted-foreground">{corte.cantidad}</td>
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
            {/* Indicador de capacidad */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Retazos utilizados</span>
                <span className={`font-mono font-semibold tabular-nums ${capacidadExcedida ? "text-destructive" : cantidadSeleccionada > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                  {cantidadSeleccionada} / {cantidadDisponible}
                </span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${capacidadExcedida ? "bg-destructive" : cantidadSeleccionada === cantidadDisponible ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, (cantidadSeleccionada / cantidadDisponible) * 100)}%` }}
                />
              </div>
            </div>

            {capacidadExcedida && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>La selección supera los retazos disponibles.</span>
              </div>
            )}

            {seleccionados.size > 0 && !capacidadExcedida && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {seleccionados.size} corte{seleccionados.size !== 1 ? "s" : ""} seleccionado{seleccionados.size !== 1 ? "s" : ""}
                </span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                  Ahorro: {formatearPrecio(ahorroSeleccionados)}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={guardarReservas}
                disabled={guardando || capacidadExcedida}
              >
                {guardando ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                )}
                {guardando ? "Guardando…" : "Guardar reservas"}
              </Button>
              <Button variant="outline" onClick={onCerrar}>Cerrar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
