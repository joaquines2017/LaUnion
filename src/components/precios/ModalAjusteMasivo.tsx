"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatearPrecio, parsearNumero } from "@/lib/formato";

type Operacion = "aumentar" | "reducir";
type Tipo = "porcentaje" | "monto";
type Redondeo = "ninguno" | "entero" | "decena" | "centena";
type Alcance = "filtro" | "todos";

function calcularNuevo(
  actual: number,
  operacion: Operacion,
  tipo: Tipo,
  valor: number,
  redondeo: Redondeo
): number {
  let nuevo =
    tipo === "porcentaje"
      ? operacion === "aumentar"
        ? actual * (1 + valor / 100)
        : actual * (1 - valor / 100)
      : operacion === "aumentar"
      ? actual + valor
      : actual - valor;

  if (redondeo === "entero") nuevo = Math.round(nuevo);
  else if (redondeo === "decena") nuevo = Math.round(nuevo / 10) * 10;
  else if (redondeo === "centena") nuevo = Math.round(nuevo / 100) * 100;

  return Math.max(nuevo, 0.01);
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAplicado: () => void;
  proveedorIdFiltro?: string;
  categoriaIdFiltro?: string;
  q?: string;
  totalFiltrado: number;
  precioEjemplo: number;
}

export function ModalAjusteMasivo({
  open,
  onClose,
  onAplicado,
  proveedorIdFiltro,
  categoriaIdFiltro,
  q,
  totalFiltrado,
  precioEjemplo,
}: Props) {
  const [operacion, setOperacion] = useState<Operacion>("aumentar");
  const [tipo, setTipo] = useState<Tipo>("porcentaje");
  const [valorStr, setValorStr] = useState("10");
  const [redondeo, setRedondeo] = useState<Redondeo>("ninguno");
  const [alcance, setAlcance] = useState<Alcance>("filtro");
  const [aplicando, setAplicando] = useState(false);

  const valor = parsearNumero(valorStr);
  const valorValido = !isNaN(valor) && valor > 0;

  const precioNuevoEjemplo = useMemo(() => {
    if (!valorValido || precioEjemplo <= 0) return null;
    return calcularNuevo(precioEjemplo, operacion, tipo, valor, redondeo);
  }, [operacion, tipo, valor, redondeo, valorValido, precioEjemplo]);

  const diferencia = precioNuevoEjemplo !== null ? precioNuevoEjemplo - precioEjemplo : null;

  async function aplicar() {
    if (!valorValido) { toast.error("Ingresá un valor válido"); return; }
    setAplicando(true);
    try {
      const body: Record<string, unknown> = { operacion, tipo, valor, redondeo };
      if (alcance === "filtro") {
        if (proveedorIdFiltro) body.proveedorId = proveedorIdFiltro;
        if (categoriaIdFiltro) body.categoriaId = categoriaIdFiltro;
        if (q) body.q = q;
      }
      const res = await fetch("/api/precios/ajuste-masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json() as { actualizados: number; lineasActualizadas: number };
        const msg = `${data.actualizados} precio${data.actualizados !== 1 ? "s" : ""} actualizados`;
        const extra = data.lineasActualizadas > 0
          ? ` · ${data.lineasActualizadas} línea${data.lineasActualizadas !== 1 ? "s" : ""} de muebles recalculadas`
          : "";
        toast.success(msg + extra);
        onAplicado();
        onClose();
      } else {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Error al aplicar ajuste");
      }
    } finally {
      setAplicando(false);
    }
  }

  const hayFiltroActivo = !!(proveedorIdFiltro || categoriaIdFiltro || q);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !aplicando) onClose(); }}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Ajuste masivo de precios</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Operación */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Operación</p>
            <div className="flex rounded-md border border-input overflow-hidden text-sm">
              <button
                onClick={() => setOperacion("aumentar")}
                className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                  operacion === "aumentar"
                    ? "bg-emerald-600 text-white font-medium"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Aumentar
              </button>
              <button
                onClick={() => setOperacion("reducir")}
                className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                  operacion === "reducir"
                    ? "bg-red-600 text-white font-medium"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                Reducir
              </button>
            </div>
          </div>

          {/* Tipo + Valor */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Ajuste</p>
            <div className="flex gap-2 items-stretch">
              <div className="flex rounded-md border border-input overflow-hidden text-sm shrink-0">
                <button
                  onClick={() => setTipo("porcentaje")}
                  className={`px-3 py-2 font-mono transition-colors ${
                    tipo === "porcentaje"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  %
                </button>
                <button
                  onClick={() => setTipo("monto")}
                  className={`px-3 py-2 transition-colors ${
                    tipo === "monto"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  $ monto
                </button>
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorStr}
                  onChange={(e) => setValorStr(e.target.value)}
                  placeholder="0"
                  className="w-full h-full rounded-md border border-input bg-background px-3 py-2 pr-7 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {tipo === "porcentaje" ? "%" : "$"}
                </span>
              </div>
            </div>
          </div>

          {/* Redondeo */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Redondeo del resultado</p>
            <div className="flex rounded-md border border-input overflow-hidden text-xs">
              {(
                [
                  { v: "ninguno" as Redondeo, label: "Sin redondeo" },
                  { v: "entero" as Redondeo, label: "Al peso" },
                  { v: "decena" as Redondeo, label: "×10" },
                  { v: "centena" as Redondeo, label: "×100" },
                ]
              ).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setRedondeo(v)}
                  className={`flex-1 py-2 px-1.5 transition-colors text-center ${
                    redondeo === v
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Alcance */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Aplicar a</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-input hover:bg-secondary/40 transition-colors">
                <input
                  type="radio"
                  name="alcance"
                  checked={alcance === "filtro"}
                  onChange={() => setAlcance("filtro")}
                  className="accent-primary shrink-0"
                />
                <div className="text-sm leading-snug">
                  {hayFiltroActivo ? "Filtro actual" : "Todos los precios (filtro actual vacío)"}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    — {totalFiltrado} precio{totalFiltrado !== 1 ? "s" : ""}
                  </span>
                </div>
              </label>
              {hayFiltroActivo && (
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-input hover:bg-secondary/40 transition-colors">
                  <input
                    type="radio"
                    name="alcance"
                    checked={alcance === "todos"}
                    onChange={() => setAlcance("todos")}
                    className="accent-primary shrink-0"
                  />
                  <span className="text-sm">Todos los precios vigentes</span>
                </label>
              )}
            </div>
          </div>

          {/* Preview */}
          {valorValido && precioNuevoEjemplo !== null && precioEjemplo > 0 && diferencia !== null && (
            <div className="rounded-lg bg-secondary/50 border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1.5">Vista previa (usando el primer precio de la lista)</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {formatearPrecio(precioEjemplo)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    operacion === "aumentar" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatearPrecio(precioNuevoEjemplo)}
                </span>
                <span
                  className={`text-xs ml-0.5 ${
                    operacion === "aumentar" ? "text-emerald-600/80" : "text-red-600/80"
                  }`}
                >
                  ({operacion === "aumentar" ? "+" : ""}{tipo === "porcentaje"
                    ? `${valor}%`
                    : formatearPrecio(diferencia)
                  })
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-1">
          <Button variant="outline" onClick={onClose} disabled={aplicando}>
            Cancelar
          </Button>
          <Button
            onClick={aplicar}
            disabled={aplicando || !valorValido}
            className={
              operacion === "reducir"
                ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                : ""
            }
          >
            {aplicando
              ? "Aplicando…"
              : `${operacion === "aumentar" ? "Aumentar" : "Reducir"} ${
                  alcance === "filtro" ? totalFiltrado : "todos los"
                } precio${alcance === "filtro" && totalFiltrado === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
