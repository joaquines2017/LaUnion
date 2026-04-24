"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, X, Search } from "lucide-react";
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

type FiltroEstado = "disponible" | "usado" | "todos";
type FiltroAsignacion = "todos" | "con" | "sin";

export default function ResidualesPage() {
  const [items, setItems] = useState<Residual[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("disponible");
  const [filtroAsignacion, setFiltroAsignacion] = useState<FiltroAsignacion>("todos");

  async function cargar() {
    setCargando(true);
    // Siempre traemos todos para que los filtros client-side funcionen sobre el total
    const res = await fetch(`/api/materiales-residuales?estado=todos`);
    if (res.ok) setItems(await res.json());
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  // Filtrado client-side
  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      // Estado
      if (filtroEstado !== "todos" && item.estado !== filtroEstado) return false;

      // Asignaciones
      if (filtroAsignacion === "con" && item.reservas.length === 0) return false;
      if (filtroAsignacion === "sin" && item.reservas.length > 0) return false;

      // Búsqueda: material, espesor o nota
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const matchMaterial = item.insumo.descripcion.toLowerCase().includes(q);
        const matchNota = item.nota?.toLowerCase().includes(q) ?? false;
        const matchEspesor = item.insumo.espesormm ? String(item.insumo.espesormm).includes(q) : false;
        if (!matchMaterial && !matchNota && !matchEspesor) return false;
      }

      return true;
    });
  }, [items, filtroEstado, filtroAsignacion, busqueda]);

  const totalDisponibles = items.filter((i) => i.estado === "disponible").length;
  const totalUsados = items.filter((i) => i.estado === "usado").length;
  const totalConAsignacion = items.filter((i) => i.reservas.length > 0).length;

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
        <Button onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
          {mostrarForm ? "Cancelar" : "Agregar retazo"}
        </Button>
      </div>

      {/* Métricas rápidas */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-emerald-700">{totalDisponibles}</span>{" "}
          disponible{totalDisponibles !== 1 ? "s" : ""}
        </span>
        {totalUsados > 0 && (
          <span>
            <span className="font-semibold">{totalUsados}</span>{" "}
            usado{totalUsados !== 1 ? "s" : ""}
          </span>
        )}
        {totalConAsignacion > 0 && (
          <span>
            <span className="font-semibold text-primary">{totalConAsignacion}</span>{" "}
            con asignación
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

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar material o nota…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Estado */}
        <div className="flex rounded-md border border-input overflow-hidden text-sm">
          {(["disponible", "todos", "usado"] as FiltroEstado[]).map((opcion) => (
            <button
              key={opcion}
              onClick={() => setFiltroEstado(opcion)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                filtroEstado === opcion
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-background text-muted-foreground hover:bg-secondary"
              }`}
            >
              {opcion === "disponible" ? "Disponibles" : opcion === "usado" ? "Usados" : "Todos"}
            </button>
          ))}
        </div>

        {/* Asignaciones */}
        <div className="flex rounded-md border border-input overflow-hidden text-sm">
          {([
            { value: "todos", label: "Todas" },
            { value: "con", label: "Con asignación" },
            { value: "sin", label: "Sin asignación" },
          ] as { value: FiltroAsignacion; label: string }[]).map((opcion) => (
            <button
              key={opcion.value}
              onClick={() => setFiltroAsignacion(opcion.value)}
              className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
                filtroAsignacion === opcion.value
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-background text-muted-foreground hover:bg-secondary"
              }`}
            >
              {opcion.label}
            </button>
          ))}
        </div>

        {/* Contador de resultados */}
        {(busqueda || filtroEstado !== "disponible" || filtroAsignacion !== "todos") && (
          <span className="text-xs text-muted-foreground">
            {itemsFiltrados.length} resultado{itemsFiltrados.length !== 1 ? "s" : ""}
            {itemsFiltrados.length !== items.length && ` de ${items.length}`}
          </span>
        )}
      </div>

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <TablaResiduales items={itemsFiltrados} onReservasChange={cargar} />
      )}
    </div>
  );
}
