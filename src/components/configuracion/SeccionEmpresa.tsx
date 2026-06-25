"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Trash2, Building2 } from "lucide-react";

interface Props {
  empresa: { id: string; nombre: string; logoUrl: string | null };
}

export function SeccionEmpresa({ empresa }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState(empresa.nombre);
  const [logoUrl, setLogoUrl] = useState(empresa.logoUrl);
  const [savingNombre, setSavingNombre] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSavingNombre(true);
    const res = await fetch("/api/empresa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (res.ok) {
      toast.success("Nombre actualizado");
      router.refresh();
    } else {
      toast.error("Error al guardar");
    }
    setSavingNombre(false);
  }

  async function subirLogo(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    setSubiendo(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/empresa/logo", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setLogoUrl(data.logoUrl);
      toast.success("Logo actualizado");
      router.refresh();
    } else {
      toast.error("Error al subir el logo");
    }
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function eliminarLogo() {
    const res = await fetch("/api/empresa/logo", { method: "DELETE" });
    if (res.ok) {
      setLogoUrl(null);
      toast.success("Logo eliminado");
      router.refresh();
    } else {
      toast.error("Error al eliminar");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Datos de la empresa
        </CardTitle>
        <CardDescription>
          Nombre y logo que identifican a tu empresa en el sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Nombre */}
        <form onSubmit={guardarNombre} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="empresaNombre">Nombre de la empresa</Label>
            <div className="flex gap-2">
              <Input
                id="empresaNombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Nombre de la empresa"
                required
                className="max-w-xs"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={savingNombre || nombre === empresa.nombre}
              >
                {savingNombre ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </form>

        {/* Logo */}
        <div className="space-y-3">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="h-20 w-40 rounded-lg border border-border bg-secondary/30 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo de la empresa"
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground/30" />
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={subiendo}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {subiendo ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={eliminarLogo}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG o SVG. Se mostrará en el sidebar y en los reportes PDF.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && subirLogo(e.target.files[0])}
          />
        </div>

      </CardContent>
    </Card>
  );
}
