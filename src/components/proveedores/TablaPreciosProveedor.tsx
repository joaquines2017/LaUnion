"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Search, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatearPrecio, formatearFecha, formatearNumeroInput, parsearNumero } from "@/lib/formato";
import { ModalRecalculo } from "@/components/precios/ModalRecalculo";
import type { ResultadoCascada } from "@/lib/recalculo-cascada";

export interface PrecioProveedorFila {
  id: string;
  insumoId: string;
  precio: string;
  fechaVigencia: string;
  desactualizado: boolean;
  insumo: {
    codigo: string;
    descripcion: string;
    categoriaId: string;
    categoria: { nombre: string };
  };
}

interface InsumoOpcion {
  id: string;
  codigo: string;
  descripcion: string;
  categoriaId: string;
  categoria: { nombre: string };
}

interface Props {
  proveedorId: string;
  precios: PrecioProveedorFila[];
  categorias: { id: string; nombre: string }[];
  insumosDisponibles: InsumoOpcion[];   // insumos activos para agregar precio
  vigenciaDias: number;
}

export function TablaPreciosProveedor({
  proveedorId,
  precios: preciosIniciales,
  categorias,
  insumosDisponibles,
  vigenciaDias,
}: Props) {
  const router = useRouter();

  // Filtros cliente
  const [busqueda, setBusqueda] = useState("");
  const [categoriaBusq, setCategoriaBusq] = useState("todas");

  // Edición inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Formulario nuevo precio
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nuevoInsumoId, setNuevoInsumoId] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [busquedaInsumo, setBusquedaInsumo] = useState("");

  // Modal recálculo
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cascada, setCascada] = useState<ResultadoCascada | null>(null);
  const [precioAnterior, setPrecioAnterior] = useState<number | null>(null);
  const [precioNuevoModal, setPrecioNuevoModal] = useState(0);
  const [insumoNombreModal, setInsumoNombreModal] = useState("");

  // IDs de insumos que ya tienen precio
  const insumosConPrecio = useMemo(
    () => new Set(preciosIniciales.map((p) => p.insumoId)),
    [preciosIniciales]
  );

  // Filtrar filas
  const preciosFiltrados = useMemo(() => {
    return preciosIniciales.filter((p) => {
      const matchCat = categoriaBusq === "todas" || p.insumo.categoriaId === categoriaBusq;
      const q = busqueda.toLowerCase();
      const matchQ =
        !q ||
        p.insumo.descripcion.toLowerCase().includes(q) ||
        p.insumo.codigo.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [preciosIniciales, busqueda, categoriaBusq]);

  // Insumos disponibles para agregar (sin precio aún)
  const insumosSinPrecio = useMemo(() => {
    const q = busquedaInsumo.toLowerCase();
    return insumosDisponibles
      .filter((i) => !insumosConPrecio.has(i.id))
      .filter(
        (i) =>
          !q ||
          i.descripcion.toLowerCase().includes(q) ||
          i.codigo.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [insumosDisponibles, insumosConPrecio, busquedaInsumo]);

  async function llamarApiPrecios(insumoId: string, precio: number, precioViejo: number | null, insumoNombre: string) {
    const res = await fetch("/api/precios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insumoId, proveedorId, precio }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success("Precio guardado");
      router.refresh();
      if (data.cascada?.lineasActualizadas > 0) {
        setPrecioAnterior(precioViejo);
        setPrecioNuevoModal(precio);
        setInsumoNombreModal(insumoNombre);
        setCascada(data.cascada);
        setModalAbierto(true);
      }
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al guardar");
    }
  }

  async function guardarEdicion(fila: PrecioProveedorFila) {
    const nuevo = parsearNumero(editValor);
    if (isNaN(nuevo) || nuevo <= 0) { toast.error("Precio inválido"); return; }
    setGuardando(true);
    await llamarApiPrecios(fila.insumoId, nuevo, Number(fila.precio), fila.insumo.descripcion);
    setEditId(null);
    setGuardando(false);
  }

  async function agregarNuevoPrecio() {
    if (!nuevoInsumoId || !nuevoPrecio) return;
    const precio = parsearNumero(nuevoPrecio);
    if (isNaN(precio) || precio <= 0) { toast.error("Precio inválido"); return; }
    setGuardando(true);
    const insumo = insumosDisponibles.find((i) => i.id === nuevoInsumoId);
    await llamarApiPrecios(nuevoInsumoId, precio, null, insumo?.descripcion ?? "");
    setNuevoInsumoId("");
    setNuevoPrecio("");
    setBusquedaInsumo("");
    setMostrarFormNuevo(false);
    setGuardando(false);
  }

  return (
    <>
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border bg-secondary/40 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-foreground">
            Precios vigentes{" "}
            <span className="text-muted-foreground font-normal">
              ({preciosFiltrados.length}{busqueda || categoriaBusq !== "todas" ? ` de ${preciosIniciales.length}` : ""})
            </span>
          </h2>
          <Button size="sm" variant="outline" onClick={() => setMostrarFormNuevo((v) => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Agregar precio
          </Button>
        </div>

        {/* Formulario nuevo precio */}
        {mostrarFormNuevo && (
          <div className="px-5 py-4 border-b border-border bg-secondary/20 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nuevo precio para este proveedor</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Buscar insumo</label>
                <Input
                  placeholder="Escribí código o descripción…"
                  value={busquedaInsumo}
                  onChange={(e) => { setBusquedaInsumo(e.target.value); setNuevoInsumoId(""); }}
                  className="h-8 text-sm"
                />
              </div>
              {insumosSinPrecio.length > 0 && (
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-muted-foreground">Insumo *</label>
                  <Select value={nuevoInsumoId} onValueChange={setNuevoInsumoId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccioná insumo" /></SelectTrigger>
                    <SelectContent>
                      {insumosSinPrecio.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          <span className="font-mono text-xs text-muted-foreground mr-2">{i.codigo}</span>
                          {i.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1 w-36">
                <label className="text-xs font-medium text-muted-foreground">Precio (ARS) *</label>
                <Input
                  inputMode="decimal"
                  placeholder="Ej: 78.000,50"
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={agregarNuevoPrecio} disabled={!nuevoInsumoId || !nuevoPrecio || guardando}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setMostrarFormNuevo(false); setNuevoInsumoId(""); setNuevoPrecio(""); setBusquedaInsumo(""); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {busquedaInsumo && insumosSinPrecio.length === 0 && (
              <p className="text-xs text-muted-foreground">No hay insumos sin precio que coincidan.</p>
            )}
          </div>
        )}

        {/* Filtros */}
        {preciosIniciales.length > 5 && (
          <div className="px-5 py-3 border-b border-border flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Filtrar por código o nombre…"
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={categoriaBusq} onValueChange={setCategoriaBusq}>
              <SelectTrigger className="h-8 text-sm w-44">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tabla */}
        {preciosFiltrados.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-10">
            {preciosIniciales.length === 0
              ? "Este proveedor no tiene precios cargados todavía."
              : "Sin resultados con los filtros aplicados."}
          </p>
        ) : (
          <table className="na-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Insumo</th>
                <th>Categoría</th>
                <th className="text-right">Precio</th>
                <th>Vigente desde</th>
                <th className="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {preciosFiltrados.map((fila) => {
                const enEdicion = editId === fila.id;
                return (
                  <tr key={fila.id}>
                    <td className="font-mono text-xs text-muted-foreground">{fila.insumo.codigo}</td>
                    <td className="font-medium">{fila.insumo.descripcion}</td>
                    <td>
                      <span className="na-badge na-badge-blue">{fila.insumo.categoria.nombre}</span>
                    </td>
                    <td className="text-right">
                      {enEdicion ? (
                        <Input
                          inputMode="decimal"
                          value={editValor}
                          onChange={(e) => setEditValor(e.target.value)}
                          className="h-7 w-32 text-right text-sm ml-auto"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") guardarEdicion(fila); if (e.key === "Escape") setEditId(null); }}
                        />
                      ) : (
                        <span className={`font-mono font-semibold tabular-nums ${fila.desactualizado ? "text-amber-700" : ""}`}>
                          {formatearPrecio(Number(fila.precio))}
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {formatearFecha(fila.fechaVigencia)}
                        {fila.desactualizado && (
                          <span title={`Sin actualizar hace más de ${vigenciaDias} días`}><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /></span>
                        )}
                      </div>
                    </td>
                    <td className="text-right">
                      {enEdicion ? (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30"
                            onClick={() => guardarEdicion(fila)} disabled={guardando}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                            onClick={() => setEditId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => { setEditId(fila.id); setEditValor(formatearNumeroInput(Number(fila.precio))); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ModalRecalculo
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        cascada={cascada}
        insumoNombre={insumoNombreModal}
        precioAnterior={precioAnterior}
        precioNuevo={precioNuevoModal}
      />
    </>
  );
}
