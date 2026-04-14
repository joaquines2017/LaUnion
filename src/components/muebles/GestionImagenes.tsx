"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export interface ImagenMueble {
  id: string;
  url: string;
  filename: string;
  orden: number;
}

interface Props {
  muebleId: string;
  imagenes: ImagenMueble[];
  onChange: (imagenes: ImagenMueble[]) => void;
}

export function GestionImagenes({ muebleId, imagenes, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  async function subirArchivos(files: FileList) {
    setSubiendo(true);
    try {
      const nuevas: ImagenMueble[] = [];
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
        onChange([...imagenes, ...nuevas]);
        toast.success(
          nuevas.length === 1 ? "Imagen subida" : `${nuevas.length} imágenes subidas`
        );
      }
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function eliminarImagen(id: string) {
    setEliminando(id);
    try {
      const res = await fetch(`/api/muebles/${muebleId}/imagenes/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onChange(imagenes.filter((i) => i.id !== id));
        toast.success("Imagen eliminada");
      } else {
        toast.error("No se pudo eliminar la imagen");
      }
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Imágenes</p>

      {/* Grid de imágenes existentes */}
      {imagenes.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {imagenes.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square rounded-md overflow-hidden border border-border bg-secondary/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.filename}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button
                  type="button"
                  disabled={eliminando === img.id}
                  onClick={() => eliminarImagen(img.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-1.5 hover:bg-destructive/80"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Botón agregar más */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="aspect-square rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/30 transition-colors flex flex-col items-center justify-center text-muted-foreground gap-1"
          >
            {subiendo ? (
              <span className="text-xs">Subiendo…</span>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-xs">Agregar</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Zona de carga vacía */}
      {imagenes.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 hover:bg-secondary/30 transition-colors"
        >
          {subiendo ? (
            <p className="text-sm text-muted-foreground">Subiendo…</p>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Clic para agregar imágenes
              </p>
              <p className="text-xs text-muted-foreground/50 mt-0.5">
                JPG, PNG, WEBP · múltiples archivos
              </p>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && subirArchivos(e.target.files)}
      />
    </div>
  );
}
