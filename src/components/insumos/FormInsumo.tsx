"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ModalRecalculo } from "@/components/precios/ModalRecalculo";
import type { ResultadoCascada } from "@/lib/recalculo-cascada";
import { formatearNumeroInput, parsearNumero } from "@/lib/formato";

const UNIDADES = [
  { value: "unidad", label: "Unidad" },
  { value: "placa", label: "Placa" },
  { value: "metro", label: "Metro" },
  { value: "metroLineal", label: "Metro lineal" },
  { value: "kilo", label: "Kilo" },
  { value: "par", label: "Par" },
  { value: "juego", label: "Juego" },
  { value: "rollo", label: "Rollo" },
];

interface Categoria {
  id: string;
  nombre: string;
}

interface Insumo {
  id: string;
  codigo: string;
  descripcion: string;
  categoriaId: string;
  unidadMedida: string;
  espesormm: number | null;
  altoM: number | null;
  anchoM: number | null;
  precioBase: number | null;
}

export function FormInsumo({
  insumo,
  categorias,
}: {
  insumo?: Insumo;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [unidad, setUnidad] = useState(insumo?.unidadMedida ?? "unidad");
  const [categoriaId, setCategoriaId] = useState(insumo?.categoriaId ?? "");
  const [precioBase, setPrecioBase] = useState(insumo?.precioBase != null ? formatearNumeroInput(insumo.precioBase) : "");

  // Modal recálculo cascada
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cascada, setCascada] = useState<ResultadoCascada | null>(null);
  const [precioAnteriorModal, setPrecioAnteriorModal] = useState<number | null>(null);
  const [precioNuevoModal, setPrecioNuevoModal] = useState(0);

  const esPlaca = unidad === "placa";
  const esGasto = categorias.find((c) => c.id === categoriaId)?.nombre?.toLowerCase().includes("gasto") ?? false;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      descripcion: fd.get("descripcion") as string,
      categoriaId,
      unidadMedida: unidad,
    };

    if (!insumo) {
      data.codigo = fd.get("codigo") as string;
    }

    if (esPlaca) {
      const esp = parseFloat(fd.get("espesormm") as string);
      const alto = parseFloat(fd.get("altoM") as string);
      const ancho = parseFloat(fd.get("anchoM") as string);
      if (!isNaN(esp)) data.espesormm = esp;
      if (!isNaN(alto)) data.altoM = alto;
      if (!isNaN(ancho)) data.anchoM = ancho;
    }

    const precioBaseVal = parsearNumero(precioBase);
    if (!isNaN(precioBaseVal) && precioBaseVal > 0) {
      data.precioBase = precioBaseVal;
    } else if (insumo && precioBase === "") {
      data.precioBase = null; // permite borrar el precio base al editar
    }

    const url = insumo ? `/api/insumos/${insumo.id}` : "/api/insumos";
    const method = insumo ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const resData = await res.json();
      router.refresh();

      const c = resData?.cascada;
      if (c?.lineasActualizadas > 0) {
        toast.success(
          insumo
            ? `Insumo actualizado — ${c.muebleAfectados} mueble${c.muebleAfectados !== 1 ? "s" : ""} recalculado${c.muebleAfectados !== 1 ? "s" : ""}`
            : "Insumo creado"
        );
        const precioBaseVal = parsearNumero(precioBase);
        setPrecioAnteriorModal(insumo?.precioBase ?? null);
        setPrecioNuevoModal(isNaN(precioBaseVal) ? 0 : precioBaseVal);
        setCascada(c);
        setModalAbierto(true);
      } else {
        toast.success(insumo ? "Insumo actualizado" : "Insumo creado");
        if (!insumo) {
          router.push("/insumos");
        }
      }
    } else {
      try {
        const err = await res.json();
        const msg = typeof err.error === "string" ? err.error : JSON.stringify(err.error);
        toast.error(msg);
      } catch {
        toast.error("Error al guardar el insumo");
      }
    }

    setLoading(false);
  }

  return (
    <>
    <ModalRecalculo
      open={modalAbierto}
      onClose={() => { setModalAbierto(false); router.push("/insumos"); }}
      cascada={cascada}
      insumoNombre={insumo?.descripcion ?? ""}
      precioAnterior={precioAnteriorModal}
      precioNuevo={precioNuevoModal}
    />
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!insumo && (
            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código interno *</Label>
              <Input
                id="codigo"
                name="codigo"
                required
                placeholder="Ej: 04-100-0001"
                className="font-mono"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Input
              id="descripcion"
              name="descripcion"
              required
              defaultValue={insumo?.descripcion}
              placeholder="Ej: Placa de Melamina 18mm Blanca"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Unidad de medida</Label>
              <Select value={unidad} onValueChange={setUnidad}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dimensiones de placa — solo visible si unidad = placa */}
          {esPlaca && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="space-y-1.5">
                <Label htmlFor="espesormm">Espesor (mm)</Label>
                <Input
                  id="espesormm"
                  name="espesormm"
                  type="number"
                  step="0.1"
                  defaultValue={insumo?.espesormm ?? ""}
                  placeholder="Ej: 18"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="altoM">Alto (metros)</Label>
                <Input
                  id="altoM"
                  name="altoM"
                  type="number"
                  step="0.01"
                  defaultValue={insumo?.altoM ?? ""}
                  placeholder="Ej: 2.83"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="anchoM">Ancho (metros)</Label>
                <Input
                  id="anchoM"
                  name="anchoM"
                  type="number"
                  step="0.01"
                  defaultValue={insumo?.anchoM ?? ""}
                  placeholder="Ej: 1.83"
                />
              </div>
            </div>
          )}

          {/* Precio base — solo visible para categorías de gastos */}
          {esGasto && (
            <div className="space-y-1.5">
              <Label htmlFor="precioBase">Precio base (ARS)</Label>
              <Input
                id="precioBase"
                inputMode="decimal"
                value={precioBase}
                onChange={(e) => setPrecioBase(e.target.value)}
                placeholder="Ej: 15.000,00"
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Precio fijo sin proveedor. Se usará para calcular costos de muebles.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || !categoriaId}>
              {loading ? "Guardando..." : insumo ? "Guardar cambios" : "Crear insumo"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </>
  );
}
