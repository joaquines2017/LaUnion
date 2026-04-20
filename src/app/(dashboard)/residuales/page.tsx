"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TablaResiduales } from "@/components/residuales/TablaResiduales";
import { FormResidual } from "@/components/residuales/FormResidual";

interface InsumoRef {
  id: string;
  descripcion: string;
  espesormm: number | null;
  altoM: number | null;
  anchoM: number | null;
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
}

export default function ResidualesPage() {
  const [items, setItems] = useState<Residual[]>([]);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    const estado = mostrarTodos ? "todos" : "disponible";
    const res = await fetch(`/api/materiales-residuales?estado=${estado}`);
    if (res.ok) setItems(await res.json());
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [mostrarTodos]); // eslint-disable-line react-hooks/exhaustive-deps

  const disponibles = items.filter((i) => i.estado === "disponible").length;
  const usados = items.filter((i) => i.estado === "usado").length;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Materiales Residuales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Retazos disponibles y su aprovechamiento en muebles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarTodos}
              onChange={(e) => setMostrarTodos(e.target.checked)}
              className="rounded"
            />
            Mostrar usados
          </label>
          <Button onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {mostrarForm ? "Cancelar" : "Agregar retazo"}
          </Button>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-emerald-700">{disponibles}</span> disponible{disponibles !== 1 ? "s" : ""}
        </span>
        {usados > 0 && (
          <span>
            <span className="font-semibold">{usados}</span> usado{usados !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Formulario inline */}
      {mostrarForm && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Nuevo retazo</h2>
            <FormResidual
              onGuardado={() => { setMostrarForm(false); cargar(); }}
              onCancelar={() => setMostrarForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <TablaResiduales items={items} />
      )}
    </div>
  );
}
