"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Check, X, Search, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatearPrecio, formatearFecha, formatearNumeroInput, parsearNumero } from "@/lib/formato";
import { ModalRecalculo } from "@/components/precios/ModalRecalculo";
import type { ResultadoCascada } from "@/lib/recalculo-cascada";

export interface PrecioFila {
  id: string;
  insumoId: string;
  proveedorId: string;
  precio: string;
  fechaVigencia: string;
  desactualizado: boolean;
  insumo: { codigo: string; descripcion: string; categoriaId: string; categoria: { nombre: string } };
  proveedor: { nombre: string };
}

interface Props {
  precios: PrecioFila[];
  proveedores: { id: string; nombre: string }[];
  categorias: { id: string; nombre: string }[];
  proveedorIdFiltro?: string;
  categoriaIdFiltro?: string;
  q?: string;
  vigenciaDias: number;
  paginaActual: number;
  totalItems: number;
  itemsPorPagina: number;
}

export function GestionPrecios({
  precios,
  proveedores,
  categorias,
  proveedorIdFiltro,
  categoriaIdFiltro,
  q,
  vigenciaDias,
  paginaActual,
  totalItems,
  itemsPorPagina,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filtros locales (debounce en texto)
  const [queryLocal, setQueryLocal] = useState(q ?? "");

  const actualizarUrl = useCallback(
    (cambios: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(cambios)) {
        if (v) params.set(k, v); else params.delete(k);
      }
      if (!("page" in cambios)) params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => actualizarUrl({ q: queryLocal || undefined }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryLocal]);

  // Edición inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Modal recálculo
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cascada, setCascada] = useState<ResultadoCascada | null>(null);
  const [precioAnterior, setPrecioAnterior] = useState<number | null>(null);
  const [precioNuevo, setPrecioNuevo] = useState(0);
  const [insumoNombre, setInsumoNombre] = useState("");

  function iniciarEdicion(fila: PrecioFila) {
    setEditId(fila.id);
    setEditValor(formatearNumeroInput(Number(fila.precio)));
  }

  async function guardarPrecio(fila: PrecioFila) {
    const nuevo = parsearNumero(editValor);
    if (isNaN(nuevo) || nuevo <= 0) { toast.error("Precio inválido"); return; }
    setGuardando(true);

    const res = await fetch("/api/precios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insumoId: fila.insumoId, proveedorId: fila.proveedorId, precio: nuevo }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Precio actualizado");
      setEditId(null);
      router.refresh();
      if (data.cascada?.lineasActualizadas > 0) {
        setPrecioAnterior(Number(fila.precio));
        setPrecioNuevo(nuevo);
        setInsumoNombre(fila.insumo.descripcion);
        setCascada(data.cascada);
        setModalAbierto(true);
      }
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al guardar");
    }
    setGuardando(false);
  }

  const totalPaginas = Math.ceil(totalItems / itemsPorPagina);

  return (
    <>
      {/* ── Barra de filtros ── */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Texto */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={queryLocal}
            onChange={(e) => setQueryLocal(e.target.value)}
            placeholder="Buscar por código o descripción…"
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Proveedor */}
        <div className="w-52">
          <Select
            value={proveedorIdFiltro ?? "todos"}
            onValueChange={(v) => actualizarUrl({ proveedorId: v === "todos" ? undefined : v })}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos los proveedores" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Categoría */}
        <div className="w-48">
          <Select
            value={categoriaIdFiltro ?? "todas"}
            onValueChange={(v) => actualizarUrl({ categoriaId: v === "todas" ? undefined : v })}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-muted-foreground ml-auto self-center">
          {totalItems} precio{totalItems !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        {precios.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No hay precios con los filtros seleccionados.
          </div>
        ) : (
          <table className="na-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Insumo</th>
                <th>Categoría</th>
                <th>Proveedor</th>
                <th className="!text-right w-48">Precio</th>
                <th className="w-40">Vigente desde</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {precios.map((fila) => {
                const enEdicion = editId === fila.id;
                return (
                  <tr key={fila.id}>
                    <td className="font-mono text-xs text-muted-foreground">{fila.insumo.codigo}</td>
                    <td className="font-medium max-w-[220px]">
                      <span className="truncate block">{fila.insumo.descripcion}</span>
                    </td>
                    <td>
                      <span className="na-badge na-badge-blue">{fila.insumo.categoria.nombre}</span>
                    </td>
                    <td className="text-sm">{fila.proveedor.nombre}</td>
                    <td className="text-right w-48 whitespace-nowrap">
                      {enEdicion ? (
                        <Input
                          inputMode="decimal"
                          value={editValor}
                          onChange={(e) => setEditValor(e.target.value)}
                          className="h-7 w-32 text-right text-sm ml-auto"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") guardarPrecio(fila); if (e.key === "Escape") setEditId(null); }}
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
                          <span title={`Sin actualizar hace más de ${vigenciaDias} días`}>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right">
                      {enEdicion ? (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => guardarPrecio(fila)} disabled={guardando}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => setEditId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => iniciarEdicion(fila)} title="Editar precio">
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

        {/* Paginador */}
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
            <span>{((paginaActual - 1) * itemsPorPagina) + 1}–{Math.min(paginaActual * itemsPorPagina, totalItems)} de {totalItems}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 px-2"
                disabled={paginaActual <= 1}
                onClick={() => actualizarUrl({ page: String(paginaActual - 1) })}>
                ‹ Anterior
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2"
                disabled={paginaActual >= totalPaginas}
                onClick={() => actualizarUrl({ page: String(paginaActual + 1) })}>
                Siguiente ›
              </Button>
            </div>
          </div>
        )}
      </div>

      <ModalRecalculo
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        cascada={cascada}
        insumoNombre={insumoNombre}
        precioAnterior={precioAnterior}
        precioNuevo={precioNuevo}
      />
    </>
  );
}
