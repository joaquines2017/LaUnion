"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Upload, Trash2, ImageIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Categoria { id: string; nombre: string }
interface Mueble { id: string; codigo: string; nombre: string; categoriaId: string }
interface Imagen { id: string; url: string; filename: string; orden: number }

interface Props {
  mueble?: Mueble;
  categorias: Categoria[];
  imagenesIniciales?: Imagen[];
}

export function FormMueble({ mueble, categorias, imagenesIniciales = [] }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoriaId, setCategoriaId] = useState(mueble?.categoriaId ?? "");
  const [imagenes, setImagenes] = useState<Imagen[]>(imagenesIniciales);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  // Mueble recién creado (para habilitar imágenes sin redirigir inmediatamente)
  const [muebleCreado, setMuebleCreado] = useState<Mueble | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // El mueble activo puede venir del prop (edición) o del estado (recién creado)
  const muebleActivo = mueble ?? muebleCreado;
  const esNuevo = !mueble;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = { nombre: fd.get("nombre") as string, categoriaId };
    if (esNuevo) data.codigo = fd.get("codigo") as string;

    const res = await fetch(muebleActivo ? `/api/muebles/${muebleActivo.id}` : "/api/muebles", {
      method: muebleActivo ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const result = await res.json();
      if (esNuevo && !muebleCreado) {
        // Primera creación: activar zona de imágenes sin redirigir
        setMuebleCreado(result);
        toast.success("Mueble creado. Ahora podés agregar imágenes.");
      } else if (mueble) {
        toast.success("Mueble actualizado");
        router.refresh();
      } else {
        toast.success("Mueble actualizado");
      }
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al guardar");
    }
    setLoading(false);
  }

  async function subirArchivos(files: FileList) {
    if (!muebleActivo) return;
    setSubiendo(true);
    const nuevas: Imagen[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} no es una imagen`); continue; }
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/muebles/${muebleActivo.id}/imagenes`, { method: "POST", body: fd });
      if (res.ok) nuevas.push(await res.json());
      else { const e = await res.json(); toast.error(e.error ?? "Error al subir"); }
    }
    if (nuevas.length) {
      setImagenes(prev => [...prev, ...nuevas]);
      toast.success(nuevas.length === 1 ? "Imagen subida" : `${nuevas.length} imágenes subidas`);
    }
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function eliminarImagen(id: string) {
    if (!muebleActivo) return;
    setEliminando(id);
    const res = await fetch(`/api/muebles/${muebleActivo.id}/imagenes/${id}`, { method: "DELETE" });
    if (res.ok) { setImagenes(prev => prev.filter(i => i.id !== id)); toast.success("Imagen eliminada"); }
    else toast.error("No se pudo eliminar");
    setEliminando(null);
  }

  return (
    /* Layout: una columna en mobile, dos columnas en lg+ */
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Columna izquierda: datos ─────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
        <h3 className="na-card-title">Datos del mueble</h3>

        <form id="form-mueble" onSubmit={handleSubmit} className="space-y-4">
          {esNuevo && (
            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código interno *</Label>
              <Input
                id="codigo" name="codigo" required
                placeholder="Ej: 05-147-000" className="font-mono"
                disabled={!!muebleCreado}
              />
              <p className="text-xs text-muted-foreground">Código único, no se puede cambiar.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre" name="nombre" required
              defaultValue={muebleActivo?.nombre}
              placeholder="Ej: Placard 3 puertas corredizas"
              disabled={!!muebleCreado && esNuevo}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoría *</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId} disabled={!!muebleCreado && esNuevo}>
              <SelectTrigger><SelectValue placeholder="Seleccioná una categoría" /></SelectTrigger>
              <SelectContent>
                {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2 flex-wrap">
            {/* Botón guardar: oculto si ya se creó y estamos en modo nuevo */}
            {!(esNuevo && muebleCreado) && (
              <Button type="submit" form="form-mueble" disabled={loading || !categoriaId}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {loading ? "Guardando..." : mueble ? "Guardar cambios" : "Crear mueble"}
              </Button>
            )}
            {/* Ir al detalle (solo después de crear) */}
            {muebleCreado && (
              <Button asChild>
                <Link href={`/muebles/${muebleCreado.id}`}>
                  Ir al detalle
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            )}
            {/* Cancelar (solo cuando no se creó todavía) */}
            {!muebleCreado && (
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* ── Columna derecha: imágenes ─────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
        <h3 className="na-card-title flex items-center justify-between">
          <span>Imágenes</span>
          {imagenes.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">{imagenes.length} foto{imagenes.length !== 1 ? "s" : ""}</span>
          )}
        </h3>

        {!muebleActivo ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40 gap-2 border-2 border-dashed border-border rounded-lg">
            <ImageIcon className="h-8 w-8" />
            <p className="text-xs text-center">Guardá el mueble primero<br />para agregar imágenes</p>
          </div>
        ) : (
          <>
            {/* Zona de carga */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              onDrop={e => { e.preventDefault(); e.dataTransfer.files.length && subirArchivos(e.dataTransfer.files); }}
              onDragOver={e => e.preventDefault()}
              className="w-full border-2 border-dashed border-border rounded-lg py-4 px-3 text-center hover:border-primary/50 hover:bg-secondary/20 transition-colors disabled:opacity-50"
            >
              <Upload className="h-5 w-5 mx-auto text-muted-foreground/50 mb-1.5" />
              <p className="text-xs text-muted-foreground">
                {subiendo ? "Subiendo…" : "Clic o arrastrá imágenes aquí"}
              </p>
            </button>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => e.target.files && subirArchivos(e.target.files)} />

            {/* Galería */}
            {imagenes.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imagenes.map(img => (
                  <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        type="button"
                        disabled={eliminando === img.id}
                        onClick={() => eliminarImagen(img.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-white rounded-full p-1.5 hover:bg-destructive/80 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {imagenes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/30 gap-1.5">
                <ImageIcon className="h-10 w-10" />
                <p className="text-xs">Sin imágenes todavía</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
