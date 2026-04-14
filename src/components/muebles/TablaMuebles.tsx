"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AccionesTabla } from "@/components/shared/AccionesTabla";
import { formatearPrecio } from "@/lib/formato";

interface Imagen { url: string; filename: string }

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

function CarruselModal({ imagenes }: { imagenes: Imagen[] }) {
  const [actual, setActual] = useState(0);
  if (imagenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 bg-secondary/30 rounded-lg text-muted-foreground/20">
        <ImageIcon className="h-14 w-14" />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="relative bg-secondary/20 rounded-lg overflow-hidden" style={{ height: 280 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagenes[actual].url} alt={imagenes[actual].filename}
          className="w-full h-full object-contain" />
        {imagenes.length > 1 && <>
          <button type="button" onClick={() => setActual(i => i === 0 ? imagenes.length - 1 : i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setActual(i => i === imagenes.length - 1 ? 0 : i + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5">
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="absolute bottom-2 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full font-mono">
            {actual + 1}/{imagenes.length}
          </span>
        </>}
      </div>
      {imagenes.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {imagenes.map((img, i) => (
            <button key={img.url} type="button" onClick={() => setActual(i)}
              className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                i === actual ? "border-primary" : "border-transparent opacity-50 hover:opacity-80"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TablaMuebles({ muebles, estadoFiltro, q }: Props) {
  const [sel, setSel] = useState<MuebleRow | null>(null);

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
            return (
              <tr key={m.id} className={estadoFiltro === "inactivo" ? "opacity-60" : ""}>
                {/* Foto */}
                <td className="px-3">
                  <button type="button" onClick={() => setSel(m)}
                    className="w-11 h-11 rounded-md overflow-hidden border border-border bg-secondary/40 flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all flex-shrink-0">
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
                  <button type="button" onClick={() => setSel(m)}
                    className="font-medium text-foreground hover:text-primary text-left transition-colors">
                    {m.nombre}
                  </button>
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
                <td>
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

      {/* Modal */}
      <Dialog open={!!sel} onOpenChange={(open) => !open && setSel(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
          {sel && <>
            <DialogTitle className="sr-only">{sel.nombre}</DialogTitle>

            {/* Carrusel */}
            <div className="p-4 bg-secondary/10 border-b border-border">
              <CarruselModal imagenes={sel.imagenes} />
            </div>

            {/* Detalle */}
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-0.5">{sel.codigo}</p>
                <h2 className="text-lg font-semibold text-foreground">{sel.nombre}</h2>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="na-badge bg-blue-50 text-blue-700 border border-blue-100">
                  {sel.categoria.nombre}
                </span>
                {Number(sel.costoActual) > 0 && (
                  <span className="font-mono font-bold text-foreground tabular-nums">
                    {formatearPrecio(Number(sel.costoActual))}
                  </span>
                )}
                <span className="text-muted-foreground text-xs">
                  {sel._count.materiales + sel._count.insumos} ítems
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button asChild size="sm">
                  <Link href={`/muebles/${sel.id}`}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar mueble
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSel(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}
