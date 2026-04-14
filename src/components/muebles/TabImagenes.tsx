"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ImagenMueble } from "./GestionImagenes";

interface Props {
  muebleId: string;
  imagenes: ImagenMueble[];
  onChange: (imagenes: ImagenMueble[]) => void;
}

export function TabImagenes({ muebleId, imagenes, onChange }: Props) {
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
          const data: ImagenMueble = await res.json();
          nuevas.push(data);
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
        const err = await res.json();
        toast.error("Error: " + (err.error ?? "desconocido"));
      }
    } finally {
      setEliminando(null);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) subirArchivos(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      {/* Zona de upload */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {subiendo
            ? "Subiendo…"
            : "Arrastrá imágenes acá o hacé clic para seleccionar"}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          JPG, PNG, WEBP · múltiples archivos permitidos
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && subirArchivos(e.target.files)}
        />
      </div>

      {/* Galería */}
      {imagenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40 gap-2">
          <ImageIcon className="h-10 w-10" />
          <span className="text-sm">Sin imágenes todavía</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {imagenes.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.filename}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  disabled={eliminando === img.id}
                  onClick={() => eliminarImagen(img.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {imagenes.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {imagenes.length} {imagenes.length === 1 ? "imagen" : "imágenes"}
        </p>
      )}
    </div>
  );
}
