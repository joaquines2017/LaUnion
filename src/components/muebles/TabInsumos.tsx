"use client";

import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompletarInsumo, type InsumoOpcion } from "./AutocompletarInsumo";
import { formatearPrecio, formatearNumeroInput, parsearNumero } from "@/lib/formato";

export interface FilaInsumo {
  _key: string;
  insumo: InsumoOpcion | null;
  descripcion: string;
  /** Para modoCalculo="placa": porcentaje de uso (ej: "65.5" = 65.5%). Para "unitario": cantidad normal. */
  cantidad: string;
  costoUnitario: string;
  costoTotal: number;
  modoCalculo: "placa" | "unitario";
}

interface Props {
  filas: FilaInsumo[];
  onChange: (filas: FilaInsumo[]) => void;
}

export function crearFilaInsumo(inicial?: Partial<FilaInsumo>): FilaInsumo {
  return {
    _key: Math.random().toString(36).slice(2),
    insumo: null,
    descripcion: "",
    cantidad: "1",
    costoUnitario: "0",
    costoTotal: 0,
    modoCalculo: "unitario",
    ...inicial,
  };
}

function calcularTotal(fila: FilaInsumo): number {
  const precio = parsearNumero(fila.costoUnitario);
  const cant = parseFloat(fila.cantidad) || 0;
  if (fila.modoCalculo === "placa") {
    // cant es el porcentaje de uso (ej: 65.5), precio es el costo de la placa completa
    return (cant / 100) * precio;
  }
  return cant * precio;
}

export function TabInsumos({ filas, onChange }: Props) {
  const costoTotal = filas.reduce((s, f) => s + f.costoTotal, 0);

  const actualizarFila = useCallback(
    (key: string, cambios: Partial<FilaInsumo>) => {
      onChange(
        filas.map((f) => {
          if (f._key !== key) return f;
          const updated = { ...f, ...cambios };
          updated.costoTotal = calcularTotal(updated);
          return updated;
        })
      );
    },
    [filas, onChange]
  );

  function seleccionarInsumo(key: string, insumo: InsumoOpcion | null) {
    const esPlaca = insumo?.unidadMedida === "placa";
    actualizarFila(key, {
      insumo,
      descripcion: insumo?.descripcion ?? "",
      modoCalculo: esPlaca ? "placa" : "unitario",
      costoUnitario: insumo?.precioRef != null ? formatearNumeroInput(insumo.precioRef) : "0",
      // Resetear cantidad al cambiar insumo
      cantidad: esPlaca ? "0" : "1",
    });
  }

  function agregarFila() {
    onChange([...filas, crearFilaInsumo()]);
  }

  function eliminarFila(key: string) {
    const nuevas = filas.filter((f) => f._key !== key);
    onChange(nuevas.length === 0 ? [crearFilaInsumo()] : nuevas);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[240px]">
                Insumo
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Descripción
              </th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">
                Cant. / % Uso
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">
                Precio unit.
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">
                Subtotal
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filas.map((fila) => (
              <tr key={fila._key} className="hover:bg-secondary/30 group">
                {/* Insumo */}
                <td className="px-2 py-1.5">
                  <AutocompletarInsumo
                    value={fila.insumo}
                    onChange={(ins) => seleccionarInsumo(fila._key, ins)}
                  />
                </td>

                {/* Descripción */}
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 text-sm"
                    value={fila.descripcion}
                    onChange={(e) =>
                      actualizarFila(fila._key, { descripcion: e.target.value })
                    }
                    placeholder="Descripción"
                  />
                </td>

                {/* Cantidad / % */}
                <td className="px-2 py-1.5">
                  <div className="relative flex items-center">
                    <Input
                      className="h-8 text-sm font-mono text-center pr-7"
                      type="number"
                      min="0"
                      step={fila.modoCalculo === "placa" ? "0.01" : "1"}
                      value={fila.cantidad}
                      onChange={(e) =>
                        actualizarFila(fila._key, { cantidad: e.target.value })
                      }
                    />
                    {fila.modoCalculo === "placa" && (
                      <span className="absolute right-2 text-xs font-semibold text-blue-600 pointer-events-none">
                        %
                      </span>
                    )}
                  </div>
                </td>

                {/* Precio unitario */}
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 text-sm font-mono text-right"
                    inputMode="decimal"
                    value={fila.costoUnitario}
                    onChange={(e) =>
                      actualizarFila(fila._key, { costoUnitario: e.target.value })
                    }
                  />
                </td>

                {/* Subtotal */}
                <td className="px-2 py-1.5 text-right font-mono text-sm font-semibold tabular-nums">
                  {formatearPrecio(fila.costoTotal)}
                </td>

                {/* Eliminar */}
                <td className="px-1 py-1.5">
                  <button
                    type="button"
                    onClick={() => eliminarFila(fila._key)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-secondary/30">
              <td
                colSpan={4}
                className="px-3 py-2 text-sm font-semibold text-muted-foreground text-right"
              >
                Total insumos
              </td>
              <td className="px-2 py-2 text-right font-mono font-bold text-foreground tabular-nums">
                {formatearPrecio(costoTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Agregar fila
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Placas de melamina: ingresá el porcentaje de uso (ej: 65.5%)
        </span>
      </div>
    </div>
  );
}
