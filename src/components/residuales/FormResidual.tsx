"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompletarInsumo } from "@/components/muebles/AutocompletarInsumo";
import type { InsumoOpcion } from "@/components/muebles/AutocompletarInsumo";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  onGuardado?: () => void;
  onCancelar?: () => void;
}

export function FormResidual({ onGuardado, onCancelar }: Props) {
  const router = useRouter();
  const [insumo, setInsumo] = useState<InsumoOpcion | null>(null);
  const [altoCm, setAltoCm] = useState("");
  const [anchoCm, setAnchoCm] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!insumo) { toast.error("Seleccioná un insumo"); return; }
    const alto = parseFloat(altoCm);
    const ancho = parseFloat(anchoCm);
    const cant = parseInt(cantidad, 10);
    if (!alto || !ancho || alto <= 0 || ancho <= 0) { toast.error("Ingresá dimensiones válidas"); return; }
    if (!cant || cant <= 0) { toast.error("La cantidad debe ser mayor a 0"); return; }

    setGuardando(true);
    const res = await fetch("/api/materiales-residuales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insumoId: insumo.id, altoCm: alto, anchoCm: ancho, cantidad: cant, nota: nota || undefined }),
    });

    if (res.ok) {
      toast.success("Retazo registrado");
      router.refresh();
      onGuardado?.();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al guardar");
    }
    setGuardando(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Material *</Label>
        <AutocompletarInsumo
          value={insumo}
          onChange={setInsumo}
          placeholder="Buscar insumo (melamina, vidrio, fibro…)"
        />
        {insumo && insumo.altoM && insumo.anchoM && (
          <p className="text-xs text-muted-foreground">
            Placa estándar: {insumo.altoM * 100}×{insumo.anchoM * 100} cm
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="altoCm">Alto (cm) *</Label>
          <Input
            id="altoCm"
            type="number"
            step="0.1"
            min="0.1"
            value={altoCm}
            onChange={(e) => setAltoCm(e.target.value)}
            placeholder="Ej: 90"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="anchoCm">Ancho (cm) *</Label>
          <Input
            id="anchoCm"
            type="number"
            step="0.1"
            min="0.1"
            value={anchoCm}
            onChange={(e) => setAnchoCm(e.target.value)}
            placeholder="Ej: 50"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cantidad">Piezas</Label>
          <Input
            id="cantidad"
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nota">Nota (opcional)</Label>
        <Input
          id="nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: Sobró de cocina Martínez"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Registrar retazo"}
        </Button>
        {onCancelar && (
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
