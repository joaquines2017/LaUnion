"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface ItemCatalogo {
  id: string;
  nombre: string;
  descripcion?: string | null;
  _count?: { muebles?: number; insumos?: number };
}

interface Props {
  items: ItemCatalogo[];
  endpoint: string; // e.g. "/api/categorias-mueble"
  labelSingular: string; // e.g. "categoría"
  labelPlural: string;   // e.g. "categorías"
  conDescripcion?: boolean;
}

export function GestionCatalogo({
  items: itemsIniciales,
  endpoint,
  labelSingular,
  labelPlural,
  conDescripcion = false,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ItemCatalogo[]>(itemsIniciales);

  // Formulario de alta
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDesc, setNuevoDesc] = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  // Fila en edición
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Eliminación
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setGuardandoNuevo(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre.trim(), descripcion: nuevoDesc.trim() || undefined }),
    });
    if (res.ok) {
      const creado = await res.json();
      setItems((prev) => [...prev, { ...creado, _count: { muebles: 0, insumos: 0 } }]);
      setNuevoNombre("");
      setNuevoDesc("");
      toast.success(`${labelSingular.charAt(0).toUpperCase() + labelSingular.slice(1)} creada`);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al guardar");
    }
    setGuardandoNuevo(false);
  }

  function iniciarEdicion(item: ItemCatalogo) {
    setEditId(item.id);
    setEditNombre(item.nombre);
    setEditDesc(item.descripcion ?? "");
  }

  async function guardarEdicion(id: string) {
    if (!editNombre.trim()) return;
    setGuardandoEdit(true);
    const res = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre.trim(), descripcion: editDesc.trim() || undefined }),
    });
    if (res.ok) {
      const actualizado = await res.json();
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...actualizado } : i)));
      setEditId(null);
      toast.success("Actualizado");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al actualizar");
    }
    setGuardandoEdit(false);
  }

  async function eliminar(item: ItemCatalogo) {
    const enUso = (item._count?.muebles ?? 0) + (item._count?.insumos ?? 0);
    if (enUso > 0) {
      toast.error(`No se puede eliminar: está en uso por ${enUso} registro${enUso !== 1 ? "s" : ""}`);
      return;
    }
    setEliminandoId(item.id);
    const res = await fetch(`${endpoint}/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Eliminado");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al eliminar");
    }
    setEliminandoId(null);
  }

  const totalEnUso = (item: ItemCatalogo) =>
    (item._count?.muebles ?? 0) + (item._count?.insumos ?? 0);

  return (
    <div className="space-y-6">
      {/* Formulario alta */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h3 className="na-card-title mb-4">Nueva {labelSingular}</h3>
        <form onSubmit={agregar} className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <Input
              placeholder={`Nombre de la ${labelSingular} *`}
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              required
            />
          </div>
          {conDescripcion && (
            <div className="flex-[2] min-w-[220px]">
              <Input
                placeholder="Descripción (opcional)"
                value={nuevoDesc}
                onChange={(e) => setNuevoDesc(e.target.value)}
              />
            </div>
          )}
          <Button type="submit" disabled={guardandoNuevo || !nuevoNombre.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {guardandoNuevo ? "Guardando…" : "Agregar"}
          </Button>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            {items.length} {items.length !== 1 ? labelPlural : labelSingular}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm">Sin {labelPlural} todavía</p>
          </div>
        ) : (
          <table className="na-table">
            <thead>
              <tr>
                <th>Nombre</th>
                {conDescripcion && <th>Descripción</th>}
                <th className="text-center">En uso</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const enEdicion = editId === item.id;
                const enUso = totalEnUso(item);
                return (
                  <tr key={item.id}>
                    <td>
                      {enEdicion ? (
                        <Input
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{item.nombre}</span>
                      )}
                    </td>
                    {conDescripcion && (
                      <td>
                        {enEdicion ? (
                          <Input
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="h-7 text-sm"
                            placeholder="Descripción (opcional)"
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {item.descripcion || "—"}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="text-center">
                      {enUso > 0 ? (
                        <span className="na-badge na-badge-blue">{enUso}</span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      {enEdicion ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30"
                            onClick={() => guardarEdicion(item.id)}
                            disabled={guardandoEdit}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                            onClick={() => setEditId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => iniciarEdicion(item)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            disabled={enUso > 0 || eliminandoId === item.id}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                            onClick={() => eliminar(item)}
                            title={enUso > 0 ? "En uso, no se puede eliminar" : "Eliminar"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
