"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, X, Search, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TablaResiduales } from "@/components/residuales/TablaResiduales";
import { FormResidual } from "@/components/residuales/FormResidual";
import { ResumenPlacas } from "@/components/residuales/ResumenPlacas";

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
  const [tab, setTab] = useState("retazos");

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("disponible");
  const [filtroAsignacion, setFiltroAsignacion] = useState<FiltroAsignacion>("todos");

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/materiales-residuales?estado=todos`);
    if (res.ok) setItems(await res.json());
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      if (filtroEstado !== "todos" && item.estado !== filtroEstado) return false;
      if (filtroAsignacion === "con" && item.reservas.length === 0) return false;
      if (filtroAsignacion === "sin" && item.reservas.length > 0) return false;
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

  const materialesConPlaca = useMemo(() => {
    const ids = new Set(
      items
        .filter((i) => i.estado === "disponible" && i.insumo.altoM && i.insumo.anchoM)
        .map((i) => i.insumoId)
    );
    return ids.size;
  }, [items]);

  function abrirForm() {
    setMostrarForm(true);
    setTab("retazos");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Materiales Residuales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Retazos disponibles y su aprovechamiento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/materiales-residuales/excel", "_blank")}
            disabled={cargando}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/materiales-residuales/pdf", "_blank")}
            disabled={cargando}
          >
            <FileText className="h-4 w-4 mr-1.5 text-red-500" />
            PDF
          </Button>
          <Button onClick={mostrarForm && tab === "retazos" ? () => setMostrarForm(false) : abrirForm} size="sm">
            {mostrarForm && tab === "retazos"
              ? <><X className="h-4 w-4 mr-1.5" />Cancelar</>
              : <><Plus className="h-4 w-4 mr-1.5" />Agregar retazo</>
            }
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v !== "retazos") setMostrarForm(false); }}>
        <TabsList>
          <TabsTrigger value="retazos">
            Retazos
            {!cargando && totalDisponibles > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded font-mono">
                {totalDisponibles}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="placas">
            Stock en Placas
            {!cargando && materialesConPlaca > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded font-mono">
                {materialesConPlaca}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Retazos ── */}
        <TabsContent value="retazos" className="mt-5 space-y-4">
          {/* Métricas rápidas */}
          {!cargando && (
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
          )}

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

            <div className="flex rounded-md border border-input overflow-hidden text-sm">
              {(["disponible", "todos", "usado"] as FiltroEstado[]).map((opcion) => (
                <button
                  key={opcion}
                  onClick={() => setFiltroEstado(opcion)}
                  className={`px-3 py-1.5 transition-colors ${
                    filtroEstado === opcion
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {opcion === "disponible" ? "Disponibles" : opcion === "usado" ? "Usados" : "Todos"}
                </button>
              ))}
            </div>

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
        </TabsContent>

        {/* ── Tab Stock en Placas ── */}
        <TabsContent value="placas" className="mt-5">
          {cargando ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <ResumenPlacas items={items} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
