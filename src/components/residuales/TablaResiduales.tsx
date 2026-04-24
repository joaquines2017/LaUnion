"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, Trash2, CheckCircle, Circle, Pencil, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PanelComparacion } from "./PanelComparacion";
import { PanelComparacionMultiple } from "./PanelComparacionMultiple";

interface InsumoRef {
  id: string;
  descripcion: string;
  espesormm: number | null;
  altoM: number | null;
  anchoM: number | null;
}

interface ReservaRef {
  muebleId: string;
  cantidadAsignada: number;
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

interface EditForm {
  altoCm: string;
  anchoCm: string;
  cantidad: string;
  nota: string;
}

interface Props {
  items: Residual[];
  onReservasChange?: () => void;
}

export function TablaResiduales({ items, onReservasChange }: Props) {
  const router = useRouter();
  const [panelId, setPanelId] = useState<string | null>(null);
  const [panelMultiple, setPanelMultiple] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<Residual | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ altoCm: "", anchoCm: "", cantidad: "", nota: "" });
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const residualPanel = panelId ? items.find((i) => i.id === panelId) ?? null : null;
  const residualesSeleccionados = items.filter((i) => seleccionados.has(i.id));

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    const disponibles = items.filter((i) => i.estado === "disponible").map((i) => i.id);
    const todosSeleccionados = disponibles.every((id) => seleccionados.has(id));
    if (todosSeleccionados) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(disponibles));
    }
  }

  function abrirEdicion(item: Residual) {
    setEditItem(item);
    setEditForm({
      altoCm: String(item.altoCm),
      anchoCm: String(item.anchoCm),
      cantidad: String(item.cantidad),
      nota: item.nota ?? "",
    });
  }

  async function guardarEdicion() {
    if (!editItem) return;
    const altoCm = parseFloat(editForm.altoCm);
    const anchoCm = parseFloat(editForm.anchoCm);
    const cantidad = parseInt(editForm.cantidad, 10);

    if (isNaN(altoCm) || altoCm <= 0) { toast.error("Alto inválido"); return; }
    if (isNaN(anchoCm) || anchoCm <= 0) { toast.error("Ancho inválido"); return; }
    if (isNaN(cantidad) || cantidad < 0) { toast.error("Cantidad inválida"); return; }

    setGuardandoEdit(true);
    const res = await fetch(`/api/materiales-residuales/${editItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        altoCm,
        anchoCm,
        cantidad,
        nota: editForm.nota.trim() || null,
      }),
    });

    if (res.ok) {
      toast.success("Retazo actualizado");
      setEditItem(null);
      onReservasChange?.();
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al actualizar");
    }
    setGuardandoEdit(false);
  }

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
      setSeleccionados((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
      router.refresh();
    }
  }

  const disponiblesIds = items.filter((i) => i.estado === "disponible").map((i) => i.id);
  const todosDisponiblesSeleccionados =
    disponiblesIds.length > 0 && disponiblesIds.every((id) => seleccionados.has(id));

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
        No hay retazos registrados.
      </div>
    );
  }

  return (
    <>
      {/* Barra de selección múltiple */}
      {seleccionados.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="text-foreground font-medium">
            {seleccionados.size} retazo{seleccionados.size !== 1 ? "s" : ""} seleccionado{seleccionados.size !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSeleccionados(new Set())}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => setPanelMultiple(true)}
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              Comparar seleccionados
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <table className="na-table">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={todosDisponiblesSeleccionados}
                  onChange={toggleTodos}
                  title="Seleccionar todos los disponibles"
                  className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                />
              </th>
              <th>Material</th>
              <th className="text-center">Dimensiones</th>
              <th className="text-center">Disponibles</th>
              <th>Nota</th>
              <th>Asignaciones</th>
              <th className="text-center">Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const disponible = item.estado === "disponible";
              const checked = seleccionados.has(item.id);
              const muebles = item.reservas.map((r) => ({
                ...r.mueble,
                cantidad: r.cantidadAsignada,
              }));
              return (
                <tr key={item.id} className={`${!disponible ? "opacity-50" : ""} ${checked ? "bg-primary/5" : ""}`}>
                  <td>
                    {disponible && (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSeleccion(item.id)}
                        className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                      />
                    )}
                  </td>
                  <td>
                    <div className="font-medium text-foreground">{item.insumo.descripcion}</div>
                    {item.insumo.espesormm && (
                      <div className="text-xs text-muted-foreground font-mono">{item.insumo.espesormm} mm</div>
                    )}
                  </td>
                  <td className="text-center font-mono text-sm tabular-nums">
                    {item.altoCm} × {item.anchoCm} cm
                  </td>
                  <td className="text-center font-mono text-sm tabular-nums">
                    <span className={item.cantidad === 0 ? "text-muted-foreground" : "text-foreground font-semibold"}>
                      {item.cantidad}
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground max-w-[200px]">
                    <span className="truncate block">{item.nota ?? "—"}</span>
                  </td>
                  <td className="max-w-[240px]">
                    {muebles.length === 0 ? (
                      <span className="text-xs text-muted-foreground/40">Sin asignar</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {muebles.map((m) => (
                          <div
                            key={m.codigo}
                            className="flex items-center justify-between gap-2 rounded-md bg-primary/5 border border-primary/15 px-2 py-1 text-[11px]"
                            title={m.nombre}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-muted-foreground shrink-0">{m.codigo}</span>
                              <span className="text-foreground font-medium truncate">{m.nombre}</span>
                            </div>
                            <span className="shrink-0 font-semibold text-primary tabular-nums">
                              {m.cantidad} pz
                            </span>
                          </div>
                        ))}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => abrirEdicion(item)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {disponible && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => setPanelId(item.id)}
                          title="Ver asignaciones"
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

      {/* Dialog de edición */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar retazo</DialogTitle>
            {editItem && (
              <p className="text-xs text-muted-foreground">{editItem.insumo.descripcion}</p>
            )}
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Alto (cm)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={editForm.altoCm}
                  onChange={(e) => setEditForm((f) => ({ ...f, altoCm: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Ancho (cm)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={editForm.anchoCm}
                  onChange={(e) => setEditForm((f) => ({ ...f, anchoCm: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Cantidad disponible</label>
              <input
                type="number"
                min="0"
                step="1"
                value={editForm.cantidad}
                onChange={(e) => setEditForm((f) => ({ ...f, cantidad: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                Retazos sin asignar actualmente disponibles.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Nota</label>
              <input
                type="text"
                value={editForm.nota}
                onChange={(e) => setEditForm((f) => ({ ...f, nota: e.target.value }))}
                placeholder="Opcional…"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditItem(null)} disabled={guardandoEdit}>
              Cancelar
            </Button>
            <Button onClick={guardarEdicion} disabled={guardandoEdit}>
              {guardandoEdit ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel individual */}
      {residualPanel && (
        <PanelComparacion
          residual={residualPanel}
          onCerrar={() => setPanelId(null)}
          onReservasChange={onReservasChange}
        />
      )}

      {/* Panel múltiple */}
      {panelMultiple && residualesSeleccionados.length > 0 && (
        <PanelComparacionMultiple
          residuales={residualesSeleccionados}
          onCerrar={() => setPanelMultiple(false)}
          onReservasChange={onReservasChange}
        />
      )}
    </>
  );
}
