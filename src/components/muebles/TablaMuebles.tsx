"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { AccionesTabla } from "@/components/shared/AccionesTabla";
import { formatearPrecio } from "@/lib/formato";
import { PanelMueble } from "./PanelMueble";
import type { MueblePanelData } from "./PanelMueble";

interface Imagen { id: string; url: string; filename: string }

export interface MuebleRow {
  id: string;
  codigo: string;
  nombre: string;
  costoActual: string | number | { toString(): string };
  estado: string;
  categoria: { nombre: string };
  imagenes: Imagen[];
  _count: { materiales: number; insumos: number };
}

interface Props {
  muebles: MuebleRow[];
  estadoFiltro: string;
  q?: string;
}

export function TablaMuebles({ muebles: mueblesProp, estadoFiltro, q }: Props) {
  const [muebles, setMuebles] = useState<MuebleRow[]>(mueblesProp);
  const [selId, setSelId] = useState<string | null>(null);

  const seleccionado = selId ? muebles.find((m) => m.id === selId) ?? null : null;

  const handleImagenesChange = useCallback((muebleId: string, imagenes: Imagen[]) => {
    setMuebles((prev) =>
      prev.map((m) => m.id === muebleId ? { ...m, imagenes } : m)
    );
  }, []);

  return (
    <>
      <table className="na-table">
        <thead>
          <tr>
            <th className="w-16">Foto</th>
            <th>Código</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th className="text-right">Costo</th>
            <th className="w-20"></th>
          </tr>
        </thead>
        <tbody>
          {muebles.map((m) => {
            const img = m.imagenes[0]?.url ?? null;
            const activo = selId === m.id;
            return (
              <tr
                key={m.id}
                className={`cursor-pointer ${estadoFiltro === "inactivo" ? "opacity-60" : ""} ${
                  activo ? "bg-primary/5" : ""
                }`}
                onClick={() => setSelId(activo ? null : m.id)}
              >
                {/* Foto */}
                <td className="px-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setSelId(activo ? null : m.id)}
                    className={`w-11 h-11 rounded-md overflow-hidden border bg-secondary/40 flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all flex-shrink-0 ${
                      activo ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                  >
                    {img
                      ? <img src={img} alt={m.nombre} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                      : <ImageIcon className="h-4 w-4 text-muted-foreground/30" />}
                  </button>
                </td>
                {/* Código */}
                <td>
                  <span className="font-mono text-xs text-muted-foreground">{m.codigo}</span>
                </td>
                {/* Nombre */}
                <td>
                  <span className={`font-medium text-left transition-colors ${activo ? "text-primary" : "text-foreground"}`}>
                    {m.nombre}
                  </span>
                </td>
                {/* Categoría */}
                <td>
                  <span className="na-badge bg-blue-50 text-blue-700 border border-blue-100">
                    {m.categoria.nombre}
                  </span>
                </td>
                {/* Costo */}
                <td className="text-right font-mono font-semibold tabular-nums">
                  {Number(m.costoActual) > 0
                    ? formatearPrecio(Number(m.costoActual))
                    : <span className="text-muted-foreground/40 text-xs font-normal font-sans">Sin costo</span>}
                </td>
                {/* Acciones */}
                <td onClick={(e) => e.stopPropagation()}>
                  <AccionesTabla id={m.id} entidad="muebles" nombre={m.nombre} estadoActual={m.estado} />
                </td>
              </tr>
            );
          })}
          {muebles.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                {q ? `Sin resultados para "${q}"` : estadoFiltro === "inactivo"
                  ? "No hay muebles inactivos."
                  : <>No hay muebles. <Link href="/muebles/nuevo" className="text-primary hover:underline font-medium">Crear el primero</Link></>}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {seleccionado && (
        <PanelMueble
          mueble={seleccionado as MueblePanelData}
          onCerrar={() => setSelId(null)}
          onImagenesChange={handleImagenesChange}
        />
      )}
    </>
  );
}
