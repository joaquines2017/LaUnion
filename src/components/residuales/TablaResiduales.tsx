"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, Trash2, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PanelComparacion } from "./PanelComparacion";

interface InsumoRef {
  id: string;
  descripcion: string;
  espesormm: number | null;
  altoM: number | null;
  anchoM: number | null;
}

interface ReservaRef {
  muebleId: string;
  mueble: { nombre: string; codigo: string };
}

interface Residual {
  id: string;
  insumoId: string;
  altoCm: number;
  anchoCm: number;
  cantidad: number;
  nota: string | null;
  estado: string;
  createdAt: string;
  insumo: InsumoRef;
  reservas: ReservaRef[];
}

interface Props {
  items: Residual[];
  onReservasChange?: () => void;
}

export function TablaResiduales({ items, onReservasChange }: Props) {
  const router = useRouter();
  const [panelId, setPanelId] = useState<string | null>(null);

  const residualPanel = panelId ? items.find((i) => i.id === panelId) ?? null : null;

  async function toggleEstado(item: Residual) {
    const nuevoEstado = item.estado === "disponible" ? "usado" : "disponible";
    const res = await fetch(`/api/materiales-residuales/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) {
      toast.success(nuevoEstado === "usado" ? "Marcado como usado" : "Marcado como disponible");
      router.refresh();
    }
  }

  async function eliminar(item: Residual) {
    if (!confirm(`¿Eliminar retazo de ${item.insumo.descripcion} ${item.altoCm}×${item.anchoCm} cm?`)) return;
    const res = await fetch(`/api/materiales-residuales/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Retazo eliminado");
      router.refresh();
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
        No hay retazos registrados.
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <table className="na-table">
          <thead>
            <tr>
              <th>Material</th>
              <th className="text-center">Dimensiones</th>
              <th className="text-center">Piezas</th>
              <th>Nota</th>
              <th>Reservas</th>
              <th className="text-center">Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const disponible = item.estado === "disponible";
              // Deduplicate muebles from reservas
              const muebleMap = new Map<string, { nombre: string; codigo: string }>();
              for (const r of item.reservas) {
                if (!muebleMap.has(r.muebleId)) muebleMap.set(r.muebleId, r.mueble);
              }
              const muebles = Array.from(muebleMap.values());
              return (
                <tr key={item.id} className={!disponible ? "opacity-50" : ""}>
                  <td>
                    <div className="font-medium text-foreground">{item.insumo.descripcion}</div>
                    {item.insumo.espesormm && (
                      <div className="text-xs text-muted-foreground font-mono">{item.insumo.espesormm} mm</div>
                    )}
                  </td>
                  <td className="text-center font-mono text-sm tabular-nums">
                    {item.altoCm} × {item.anchoCm} cm
                  </td>
                  <td className="text-center font-mono text-sm">{item.cantidad}</td>
                  <td className="text-sm text-muted-foreground max-w-[200px]">
                    <span className="truncate block">{item.nota ?? "—"}</span>
                  </td>
                  <td className="max-w-[220px]">
                    {muebles.length === 0 ? (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {muebles.map((m) => (
                          <span
                            key={m.codigo}
                            className="inline-flex items-center gap-1 text-[11px] bg-primary/8 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-medium"
                            title={m.nombre}
                          >
                            <span className="font-mono">{m.codigo}</span>
                            <span className="text-primary/70 truncate max-w-[80px]">{m.nombre}</span>
                          </span>
                        ))}
                        <span className="text-[11px] text-muted-foreground self-center">
                          {item.reservas.length} corte{item.reservas.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => toggleEstado(item)}
                      title={disponible ? "Marcar como usado" : "Marcar como disponible"}
                      className="inline-flex items-center gap-1.5 text-xs font-medium"
                    >
                      {disponible ? (
                        <>
                          <Circle className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
                          <span className="text-emerald-700">Disponible</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Usado</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex gap-1 justify-end">
                      {disponible && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                          onClick={() => setPanelId(item.id)}
                          title="Ver comparación"
                        >
                          <BarChart2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => eliminar(item)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {residualPanel && (
        <PanelComparacion
          residual={residualPanel}
          onCerrar={() => setPanelId(null)}
          onReservasChange={onReservasChange}
        />
      )}
    </>
  );
}
