"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Imagen {
  id: string;
  url: string;
  filename: string;
  orden: number;
}

interface Props {
  muebleId: string;
  imagenesIniciales: Imagen[];
}

export function PaginaImagenes({ muebleId, imagenesIniciales }: Props) {
  const [imagenes, setImagenes] = useState<Imagen[]>(imagenesIniciales);
  const [actual, setActual] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const imagen = imagenes[actual] ?? null;

  function anterior() {
    setActual((i) => (i === 0 ? imagenes.length - 1 : i - 1));
  }
  function siguiente() {
    setActual((i) => (i === imagenes.length - 1 ? 0 : i + 1));
  }

  async function subirArchivos(files: FileList) {
    setSubiendo(true);
    try {
      const nuevas: Imagen[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} no es una imagen`);
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/muebles/${muebleId}/imagenes`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          nuevas.push(await res.json());
        } else {
          const err = await res.json();
          toast.error(`Error al subir ${file.name}: ${err.error ?? "desconocido"}`);
        }
      }
      if (nuevas.length > 0) {
        const actualizadas = [...imagenes, ...nuevas];
        setImagenes(actualizadas);
        setActual(actualizadas.length - 1);
        toast.success(nuevas.length === 1 ? "Imagen subida" : `${nuevas.length} imágenes subidas`);
      }
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function eliminarImagen(id: string) {
    setEliminando(id);
    try {
      const res = await fetch(`/api/muebles/${muebleId}/imagenes/${id}`, { method: "DELETE" });
      if (res.ok) {
        const nuevas = imagenes.filter((i) => i.id !== id);
        setImagenes(nuevas);
        setActual((prev) => Math.min(prev, Math.max(0, nuevas.length - 1)));
        toast.success("Imagen eliminada");
      } else {
        toast.error("No se pudo eliminar la imagen");
      }
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Carrusel principal */}
      {imagenes.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          {/* Imagen grande */}
          <div className="relative bg-secondary/20" style={{ height: "420px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagen!.url}
              alt={imagen!.filename}
              className="w-full h-full object-contain"
            />

            {imagenes.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={anterior}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={siguiente}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-3 right-4 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full font-mono">
                  {actual + 1} / {imagenes.length}
                </div>
              </>
            )}

            {/* Botón eliminar */}
            <button
              type="button"
              disabled={eliminando === imagen!.id}
              onClick={() => eliminarImagen(imagen!.id)}
              className="absolute top-3 right-3 bg-black/50 hover:bg-destructive text-white rounded-full p-1.5 transition-colors disabled:opacity-50"
              title="Eliminar imagen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Miniaturas */}
          {imagenes.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto bg-secondary/10">
              {imagenes.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActual(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    i === actual
                      ? "border-primary scale-105"
                      : "border-transparent opacity-60 hover:opacity-90"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 text-muted-foreground/30 gap-3">
          <ImageIcon className="h-16 w-16" />
          <p className="text-sm">Sin imágenes todavía</p>
        </div>
      )}

      {/* Zona de carga */}
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-secondary/20 transition-colors disabled:opacity-50"
          onDrop={(e) => { e.preventDefault(); e.dataTransfer.files.length > 0 && subirArchivos(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            {subiendo ? "Subiendo imágenes…" : "Clic o arrastrá para subir imágenes"}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">JPG, PNG, WEBP · múltiples archivos</p>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && subirArchivos(e.target.files)}
        />
      </div>

      {imagenes.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {imagenes.length} {imagenes.length === 1 ? "imagen" : "imágenes"}
        </p>
      )}
    </div>
  );
}
