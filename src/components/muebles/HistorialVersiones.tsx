"use client";

import { useState, useEffect } from "react";
import { History, RotateCcw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearPrecio, formatearFecha } from "@/lib/formato";
import { toast } from "sonner";

interface Version {
  id: string;
  numeroVersion: number;
  fecha: string;
  motivo: string | null;
  usuarioNombre: string;
  totalMateriales: number;
  totalInsumos: number;
  costoSnapshot: number;
}

interface Props {
  muebleId: string;
  onRestaurado: () => void;
}

export function HistorialVersiones({ muebleId, onRestaurado }: Props) {
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState(false);
  const [restaurando, setRestaurando] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch(`/api/muebles/${muebleId}/versiones`);
      if (res.ok) setVersiones(await res.json());
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [muebleId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function restaurar(v: Version) {
    if (!confirm(`¿Restaurar el despiece a la versión ${v.numeroVersion}? El estado actual se guardará como nueva versión.`)) return;
    setRestaurando(v.id);
    const res = await fetch(`/api/muebles/${muebleId}/versiones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId: v.id }),
    });
    if (res.ok) {
      toast.success(`Despiece restaurado a la versión ${v.numeroVersion}`);
      await cargar();
      onRestaurado();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al restaurar");
    }
    setRestaurando(null);
  }

  if (cargando) return null;
  if (versiones.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/40 transition-colors"
        onClick={() => setExpandido((v) => !v)}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <History className="h-4 w-4 text-muted-foreground" />
          Historial de versiones
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            ({versiones.length} guardadas)
          </span>
        </span>
        {expandido
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expandido && (
        <div className="border-t border-border">
          <table className="na-table">
            <thead>
              <tr>
                <th className="text-center w-16">Versión</th>
                <th className="w-36">Fecha</th>
                <th>Usuario</th>
                <th>Motivo</th>
                <th className="text-center">Mat.</th>
                <th className="text-center">Ins.</th>
                <th className="text-right">Costo snapshot</th>
                <th className="text-right w-28">Acción</th>
              </tr>
            </thead>
            <tbody>
              {versiones.map((v) => (
                <tr key={v.id}>
                  <td className="text-center font-mono text-sm font-semibold text-muted-foreground">
                    v{v.numeroVersion}
                  </td>
                  <td className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatearFecha(new Date(v.fecha))}
                    <span className="block opacity-60">
                      {new Date(v.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="text-sm">{v.usuarioNombre}</td>
                  <td className="text-sm text-muted-foreground">{v.motivo ?? "—"}</td>
                  <td className="text-center text-sm tabular-nums">{v.totalMateriales}</td>
                  <td className="text-center text-sm tabular-nums">{v.totalInsumos}</td>
                  <td className="text-right font-mono text-sm tabular-nums">
                    {v.costoSnapshot > 0 ? formatearPrecio(v.costoSnapshot) : "—"}
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      disabled={restaurando === v.id}
                      onClick={() => restaurar(v)}
                    >
                      {restaurando === v.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RotateCcw className="h-3 w-3" />}
                      Restaurar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
