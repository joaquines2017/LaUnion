"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatearPrecio, formatearFecha, parsearNumero } from "@/lib/formato";
import { Plus, CheckCircle, AlertTriangle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { ModalRecalculo } from "@/components/precios/ModalRecalculo";
import type { ResultadoCascada } from "@/lib/recalculo-cascada";

interface Proveedor {
  id: string;
  nombre: string;
}

interface Precio {
  id: string;
  precio: number | string | { toString(): string };
  fechaVigencia: Date | string;
  estado: string;
  proveedor: { id: string; nombre: string };
  desactualizado?: boolean;
}

export function TablaPrecios({
  insumoId,
  insumoNombre,
  precios,
  proveedores,
  vigenciaDias,
  precioSeleccionadoId: precioSeleccionadoIdInicial,
}: {
  insumoId: string;
  insumoNombre?: string;
  precios: Precio[];
  proveedores: Proveedor[];
  vigenciaDias?: number;
  precioSeleccionadoId?: string | null;
}) {
  const router = useRouter();
  const [proveedorId, setProveedorId] = useState("");
  const [precio, setPrecio] = useState("");
  const [loading, setLoading] = useState(false);
  const [seleccionandoId, setSeleccionandoId] = useState<string | null>(null);
  const [precioSeleccionadoId, setPrecioSeleccionadoId] = useState<string | null>(
    precioSeleccionadoIdInicial ?? null
  );

  // Estado para el modal de recálculo
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cascada, setCascada] = useState<ResultadoCascada | null>(null);
  const [precioAnterior, setPrecioAnterior] = useState<number | null>(null);
  const [precioNuevo, setPrecioNuevo] = useState(0);

  // Precio mínimo vigente
  const precioMin = precios
    .filter((p) => p.estado === "vigente")
    .sort((a, b) => Number(a.precio) - Number(b.precio))[0];

  // Precio actualmente en uso (seleccionado manual o mínimo)
  const precioEnUso = precioSeleccionadoId
    ? precios.find((p) => p.id === precioSeleccionadoId && p.estado === "vigente") ?? precioMin
    : precioMin;

  async function handleAgregarPrecio() {
    if (!proveedorId || !precio) return;
    setLoading(true);

    const nuevoPrecio = parsearNumero(precio);
    const provConPrecio = precios.find((p) => p.proveedor.id === proveedorId);
    const anterior = provConPrecio ? Number(provConPrecio.precio) : null;

    const res = await fetch("/api/precios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        insumoId,
        proveedorId,
        precio: nuevoPrecio,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Precio guardado");
      setPrecio("");
      setProveedorId("");
      router.refresh();

      // Mostrar modal de recálculo si hubo muebles afectados
      if (data.cascada && data.cascada.lineasActualizadas > 0) {
        setPrecioAnterior(anterior);
        setPrecioNuevo(nuevoPrecio);
        setCascada(data.cascada);
        setModalAbierto(true);
      }
    } else {
      toast.error("Error al guardar el precio");
    }

    setLoading(false);
  }

  async function handleSeleccionarPrecio(precioId: string | null) {
    setSeleccionandoId(precioId ?? "");
    const res = await fetch(`/api/insumos/${insumoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precioSeleccionadoId: precioId }),
    });
    if (res.ok) {
      setPrecioSeleccionadoId(precioId);
      toast.success(precioId ? "Precio seleccionado como referencia" : "Selección eliminada — se usará el mínimo");
      router.refresh();
    } else {
      toast.error("Error al guardar la selección");
    }
    setSeleccionandoId(null);
  }

  const proveedoresConPrecio = new Set(precios.map((p) => p.proveedor.id));

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Precios por proveedor</CardTitle>
          <div className="flex items-center gap-3">
            {precioSeleccionadoId && (
              <button
                onClick={() => handleSeleccionarPrecio(null)}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Usar mínimo automático
              </button>
            )}
            {precioEnUso && (
              <span className={`text-sm font-semibold flex items-center gap-1 ${precioSeleccionadoId ? "text-blue-700" : "text-green-700"}`}>
                {precioSeleccionadoId
                  ? <Star className="h-3.5 w-3.5" />
                  : <CheckCircle className="h-3.5 w-3.5" />
                }
                {precioSeleccionadoId ? "Precio en uso" : "Mejor precio"}:{" "}
                {formatearPrecio(Number(precioEnUso.precio))} — {precioEnUso.proveedor.nombre}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agregar / actualizar precio */}
          <div className="flex gap-3 items-end p-3 bg-secondary/40 rounded-lg border border-border">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Proveedor
              </label>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                      {!proveedoresConPrecio.has(p.id) && (
                        <span className="text-xs text-muted-foreground/60 ml-1">
                          (sin precio)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Precio (ARS)
              </label>
              <Input
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Ej: 78.000,50"
                inputMode="decimal"
              />
            </div>
            <Button
              onClick={handleAgregarPrecio}
              disabled={!proveedorId || !precio || loading}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              {proveedoresConPrecio.has(proveedorId) ? "Actualizar" : "Agregar"}
            </Button>
          </div>

          {/* Tabla de precios */}
          {precios.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Proveedor
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Precio
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Vigente desde
                  </th>
                  <th className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Usar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {precios
                  .sort((a, b) => Number(a.precio) - Number(b.precio))
                  .map((p) => {
                    const esSeleccionado = p.id === precioSeleccionadoId;
                    const esMasBarato = p.proveedor.id === precioMin?.proveedor.id;
                    return (
                      <tr
                        key={p.id}
                        className={
                          esSeleccionado
                            ? "bg-blue-50/60"
                            : !precioSeleccionadoId && esMasBarato
                            ? "bg-emerald-50/60"
                            : ""
                        }
                      >
                        <td className="py-2.5 font-medium text-foreground">
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.proveedor.nombre}
                            {esSeleccionado && (
                              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                seleccionado
                              </Badge>
                            )}
                            {!precioSeleccionadoId && esMasBarato && (
                              <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                                más barato
                              </Badge>
                            )}
                            {p.desactualizado && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                <AlertTriangle className="h-3 w-3" />
                                {vigenciaDias ? `+${vigenciaDias}d` : "desactualizado"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-semibold font-mono tabular-nums">
                          {formatearPrecio(Number(p.precio))}
                        </td>
                        <td className="py-2.5 text-muted-foreground text-xs">
                          {formatearFecha(p.fechaVigencia)}
                        </td>
                        <td className="py-2.5 text-center">
                          <Badge
                            variant={
                              p.estado === "vigente" ? "default" : "secondary"
                            }
                          >
                            {p.estado}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-center">
                          {p.estado === "vigente" && (
                            esSeleccionado ? (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium">
                                <Star className="h-3.5 w-3.5 fill-blue-600" />
                                En uso
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={seleccionandoId !== null}
                                onClick={() => handleSeleccionarPrecio(p.id)}
                              >
                                Usar
                              </Button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay precios cargados para este insumo.
            </p>
          )}
        </CardContent>
      </Card>

      <ModalRecalculo
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        cascada={cascada}
        insumoNombre={insumoNombre ?? ""}
        precioAnterior={precioAnterior}
        precioNuevo={precioNuevo}
      />
    </>
  );
}
