"use client";

import { Layers } from "lucide-react";

interface InsumoRef {
  id: string;
  descripcion: string;
  espesormm: number | null;
  altoM: number | null;
  anchoM: number | null;
}

interface ReservaRef {
  cantidadAsignada: number;
}

interface Residual {
  insumoId: string;
  altoCm: number;
  anchoCm: number;
  cantidad: number;
  estado: string;
  insumo: InsumoRef;
  reservas: ReservaRef[];
}

interface ResumenGrupo {
  insumoId: string;
  descripcion: string;
  espesormm: number | null;
  altoPlacaM: number;
  anchoPlacaM: number;
  areaPlacaM2: number;
  cantidadRetazos: number;
  areaRetazosM2: number;
  placasEquivalentes: number;
}

interface Props {
  items: Residual[];
}

export function ResumenPlacas({ items }: Props) {
  // Solo placas disponibles con dimensiones definidas
  const disponibles = items.filter(
    (i) => i.estado === "disponible" && i.insumo.altoM && i.insumo.anchoM
  );

  if (disponibles.length === 0) return null;

  // Agrupar por insumo
  const grupos = new Map<string, ResumenGrupo>();
  for (const item of disponibles) {
    const { id: insumoId, descripcion, espesormm, altoM, anchoM } = item.insumo;
    const areaPlacaM2 = altoM! * anchoM!;
    const areaRetazoM2 = (item.altoCm * item.anchoCm * item.cantidad) / 10000;

    if (!grupos.has(insumoId)) {
      grupos.set(insumoId, {
        insumoId,
        descripcion,
        espesormm,
        altoPlacaM: altoM!,
        anchoPlacaM: anchoM!,
        areaPlacaM2,
        cantidadRetazos: 0,
        areaRetazosM2: 0,
        placasEquivalentes: 0,
      });
    }

    const g = grupos.get(insumoId)!;
    g.cantidadRetazos += item.cantidad;
    g.areaRetazosM2 += areaRetazoM2;
    g.placasEquivalentes = g.areaRetazosM2 / g.areaPlacaM2;
  }

  const lista = [...grupos.values()].sort((a, b) => b.areaRetazosM2 - a.areaRetazosM2);

  return (
    <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary shrink-0" />
        <h2 className="text-sm font-semibold text-foreground">Stock equivalente en placas</h2>
        <span className="text-xs text-muted-foreground ml-1">(retazos disponibles)</span>
      </div>

      <div className="divide-y divide-border">
        {lista.map((g) => {
          const pct = Math.min((g.placasEquivalentes % 1) * 100, 100);
          const placasEnteras = Math.floor(g.placasEquivalentes);

          return (
            <div key={g.insumoId} className="px-5 py-4">
              {/* Nombre y dimensiones */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-foreground">{g.descripcion}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Placa {g.altoPlacaM.toFixed(2)} × {g.anchoPlacaM.toFixed(2)} m
                    {g.espesormm ? ` · ${g.espesormm} mm` : ""}
                    {" · "}área {g.areaPlacaM2.toFixed(4)} m²
                  </p>
                </div>

                {/* Número grande: placas equivalentes */}
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground leading-none">
                    {g.placasEquivalentes.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">placas equivalentes</p>
                </div>
              </div>

              {/* Barra de progreso de la fracción */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {g.cantidadRetazos} retazo{g.cantidadRetazos !== 1 ? "s" : ""} ·{" "}
                    {g.areaRetazosM2.toFixed(3)} m² en stock
                  </span>
                  <span>
                    {placasEnteras > 0 ? (
                      <span className="text-emerald-600 font-medium">
                        {placasEnteras} entera{placasEnteras !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span>0 enteras</span>
                    )}
                    {" + "}
                    <span>{pct.toFixed(0)}% de una más</span>
                  </span>
                </div>

                {/* Barra segmentada: partes enteras + fracción */}
                <div className="flex gap-0.5 h-2">
                  {placasEnteras > 0 && (
                    <div
                      className="bg-emerald-500 rounded-sm"
                      style={{ flex: placasEnteras }}
                      title={`${placasEnteras} placa${placasEnteras !== 1 ? "s" : ""} completa${placasEnteras !== 1 ? "s" : ""}`}
                    />
                  )}
                  {pct > 0 && (
                    <div
                      className="bg-emerald-200 rounded-sm"
                      style={{ flex: pct / 100 }}
                      title={`${pct.toFixed(0)}% de una placa adicional`}
                    />
                  )}
                  {g.placasEquivalentes < 1 && (
                    <div className="flex-1 bg-secondary rounded-sm" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
