"use client";

import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompletarInsumo, type InsumoOpcion } from "./AutocompletarInsumo";

export interface FilaMaterial {
  _key: string;
  insumo: InsumoOpcion | null;
  productoNombre: string;
  altoCm: string;
  anchoCm: string;
  cantidad: string;
}

interface Props {
  filas: FilaMaterial[];
  onChange: (filas: FilaMaterial[]) => void;
}

export function crearFilaMaterial(inicial?: Partial<FilaMaterial>): FilaMaterial {
  return {
    _key: Math.random().toString(36).slice(2),
    insumo: null,
    productoNombre: "",
    altoCm: "",
    anchoCm: "",
    cantidad: "1",
    ...inicial,
  };
}

export function TabDespiece({ filas, onChange }: Props) {
  const actualizarFila = useCallback(
    (key: string, cambios: Partial<FilaMaterial>) => {
      onChange(filas.map((f) => (f._key !== key ? f : { ...f, ...cambios })));
    },
    [filas, onChange]
  );

  function seleccionarInsumo(key: string, insumo: InsumoOpcion | null) {
    actualizarFila(key, {
      insumo,
      productoNombre: insumo?.descripcion ?? "",
    });
  }

  function agregarFila() {
    onChange([...filas, crearFilaMaterial()]);
  }

  function eliminarFila(key: string) {
    const nuevas = filas.filter((f) => f._key !== key);
    onChange(nuevas.length === 0 ? [crearFilaMaterial()] : nuevas);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[240px]">
                Material
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Descripción
              </th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">
                Largo (cm)
              </th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">
                Ancho (cm)
              </th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-24">
                Cantidad
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filas.map((fila) => (
              <tr key={fila._key} className="hover:bg-secondary/30 group">
                {/* Material */}
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
                    value={fila.productoNombre}
                    onChange={(e) =>
                      actualizarFila(fila._key, { productoNombre: e.target.value })
                    }
                    placeholder="Ej: Lateral derecho"
                  />
                </td>

                {/* Largo */}
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 text-sm font-mono text-center"
                    type="number"
                    min="0"
                    step="0.1"
                    value={fila.altoCm}
                    onChange={(e) =>
                      actualizarFila(fila._key, { altoCm: e.target.value })
                    }
                    placeholder="cm"
                  />
                </td>

                {/* Ancho */}
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 text-sm font-mono text-center"
                    type="number"
                    min="0"
                    step="0.1"
                    value={fila.anchoCm}
                    onChange={(e) =>
                      actualizarFila(fila._key, { anchoCm: e.target.value })
                    }
                    placeholder="cm"
                  />
                </td>

                {/* Cantidad */}
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 text-sm font-mono text-center"
                    type="number"
                    min="1"
                    step="1"
                    value={fila.cantidad}
                    onChange={(e) =>
                      actualizarFila(fila._key, { cantidad: e.target.value })
                    }
                  />
                </td>

                {/* Eliminar */}
                <td className="px-1 py-1.5">
                  <button
                    type="button"
                    onClick={() => eliminarFila(fila._key)}
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-opacity p-1 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Agregar fila
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Lista de cortes · los costos se cargan en la pestaña Insumos
        </span>
      </div>
    </div>
  );
}
