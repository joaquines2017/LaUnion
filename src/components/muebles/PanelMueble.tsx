"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  X, ChevronLeft, ChevronRight, ImageIcon, Pencil,
  Trash2, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearPrecio } from "@/lib/formato";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Imagen { id: string; url: string; filename: string }

export interface MueblePanelData {
  id: string;
  codigo: string;
  nombre: string;
  costoActual: string | number;
  estado: string;
  categoria: { nombre: string };
  imagenes: Imagen[];
  _count: { materiales: number; insumos: number };
}

interface Props {
  mueble: MueblePanelData;
  onCerrar: () => void;
  onImagenesChange: (muebleId: string, imagenes: Imagen[]) => void;
}

export function PanelMueble({ mueble, onCerrar, onImagenesChange }: Props) {
  const router = useRouter();
  const [imagenes, setImagenes] = useState<Imagen[]>(mueble.imagenes);
  const [actual, setActual] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const safeActual = Math.min(actual, Math.max(0, imagenes.length - 1));

  const actualizarImagenes = useCallback((nuevas: Imagen[]) => {
    setImagenes(nuevas);
    onImagenesChange(mueble.id, nuevas);
  }, [mueble.id, onImagenesChange]);

  async function subirArchivos(files: FileList) {
    const validos = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validos.length === 0) { toast.error("Solo se aceptan imágenes"); return; }
    setSubiendo(true);
    const nuevas: Imagen[] = [];
    for (const file of validos) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/muebles/${mueble.id}/imagenes`, { method: "POST", body: fd });
      if (res.ok) {
        const img = await res.json();
        nuevas.push(img);
      } else {
        toast.error(`Error al subir ${file.name}`);
      }
    }
    if (nuevas.length > 0) {
      const actualizadas = [...imagenes, ...nuevas];
      actualizarImagenes(actualizadas);
      setActual(actualizadas.length - 1);
      toast.success(`${nuevas.length} imagen${nuevas.length !== 1 ? "es" : ""} subida${nuevas.length !== 1 ? "s" : ""}`);
      router.refresh();
    }
    setSubiendo(false);
  }

  async function eliminarImagen(img: Imagen) {
    if (!confirm(`¿Eliminar imagen "${img.filename}"?`)) return;
    const res = await fetch(`/api/muebles/${mueble.id}/imagenes/${img.id}`, { method: "DELETE" });
    if (res.ok) {
      const actualizadas = imagenes.filter((i) => i.id !== img.id);
      actualizarImagenes(actualizadas);
      setActual((a) => Math.min(a, Math.max(0, actualizadas.length - 1)));
      toast.success("Imagen eliminada");
      router.refresh();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} />

      {/* Panel */}
      <div className="relative z-10 h-full w-full max-w-md bg-background shadow-xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{mueble.codigo}</p>
            <h2 className="text-base font-semibold text-foreground truncate">{mueble.nombre}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="na-badge bg-blue-50 text-blue-700 border border-blue-100 text-xs">
                {mueble.categoria.nombre}
              </span>
              {Number(mueble.costoActual) > 0 && (
                <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                  {formatearPrecio(Number(mueble.costoActual))}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {mueble._count.materiales + mueble._count.insumos} ítems
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 mt-0.5" onClick={onCerrar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto">

          {/* Carrusel */}
          <div className="bg-secondary/20 border-b border-border">
            {imagenes.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-muted-foreground/20">
                <ImageIcon className="h-16 w-16" />
              </div>
            ) : (
              <div className="space-y-0">
                <div className="relative overflow-hidden" style={{ height: 260 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagenes[safeActual].url}
                    alt={imagenes[safeActual].filename}
                    className="w-full h-full object-contain"
                  />
                  {/* Botón eliminar imagen actual */}
                  <button
                    type="button"
                    onClick={() => eliminarImagen(imagenes[safeActual])}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                    title="Eliminar esta imagen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {imagenes.length > 1 && (
                    <>
                      <button type="button"
                        onClick={() => setActual(i => i === 0 ? imagenes.length - 1 : i - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button type="button"
                        onClick={() => setActual(i => i === imagenes.length - 1 ? 0 : i + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <span className="absolute bottom-2 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                        {safeActual + 1}/{imagenes.length}
                      </span>
                    </>
                  )}
                </div>
                {/* Miniaturas */}
                {imagenes.length > 1 && (
                  <div className="flex gap-1.5 p-2 overflow-x-auto bg-secondary/30">
                    {imagenes.map((img, i) => (
                      <button key={img.id} type="button" onClick={() => setActual(i)}
                        className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                          i === safeActual ? "border-primary" : "border-transparent opacity-50 hover:opacity-80"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zona de carga */}
          <div className="p-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && subirArchivos(e.target.files)}
            />
            <button
              type="button"
              disabled={subiendo}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (e.dataTransfer.files) subirArchivos(e.dataTransfer.files);
              }}
              className={`w-full border-2 border-dashed rounded-lg py-5 flex flex-col items-center gap-2 text-sm transition-colors ${
                drag
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary/70"
              } ${subiendo ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <Upload className="h-5 w-5" />
              <span>{subiendo ? "Subiendo…" : "Clic o arrastrá imágenes acá"}</span>
              <span className="text-xs opacity-70">JPG, PNG, WEBP</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <Button asChild size="sm" className="w-full">
            <Link href={`/muebles/${mueble.id}`}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar despiece y datos completos
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
