"use client";

import { Info, Layers, Package } from "lucide-react";

interface InsumoRef {
  id: string;
  descripcion: string;
  espesormm: number | null;
  altoM: number | null;
  anchoM: number | null;
}

interface Residual {
  insumoId: string;
  altoCm: number;
  anchoCm: number;
  cantidad: number;
  estado: string;
  insumo: InsumoRef;
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

function PlacaCard({ g }: { g: ResumenGrupo }) {
  const minPlacas = g.placasEquivalentes * 0.9;
  const maxPlacas = g.placasEquivalentes * 1.1;
  const placasEnteras = Math.floor(g.placasEquivalentes);
  const fraccion = g.placasEquivalentes - placasEnteras;
  const scale = Math.max(Math.ceil(maxPlacas + 0.001), 1);

  const pctEnteras = (placasEnteras / scale) * 100;
  const pctFraccion = (fraccion / scale) * 100;
  const pctRangeLeft = (minPlacas / scale) * 100;
  const pctRangeWidth = ((maxPlacas - minPlacas) / scale) * 100;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 bg-secondary/30 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground leading-snug">
              {g.descripcion}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Placa {g.altoPlacaM.toFixed(2)} × {g.anchoPlacaM.toFixed(2)} m
              {" · "}área {g.areaPlacaM2.toFixed(3)} m²
            </p>
          </div>
          {g.espesormm && (
            <span className="shrink-0 text-xs font-mono font-semibold bg-primary/10 text-primary rounded px-2 py-0.5">
              {g.espesormm} mm
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4 flex-1">
        {/* Main value + range */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-4xl font-bold tabular-nums text-foreground leading-none">
              {g.placasEquivalentes.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">placas equivalentes</div>
          </div>
          <div className="text-right pb-0.5">
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide">
              ±10% margen
            </div>
            <div className="text-sm font-mono font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
              {minPlacas.toFixed(2)} – {maxPlacas.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Visual bars */}
        <div className="space-y-2">
          {/* Main bar: enteras (verde fuerte) + fracción (verde claro) */}
          <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
            {placasEnteras > 0 && (
              <div
                className="h-full bg-emerald-500 shrink-0 transition-all"
                style={{ width: `${pctEnteras}%` }}
                title={`${placasEnteras} placa${placasEnteras !== 1 ? "s" : ""} completa${placasEnteras !== 1 ? "s" : ""}`}
              />
            )}
            {fraccion > 0.001 && (
              <div
                className="h-full bg-emerald-200 dark:bg-emerald-700 shrink-0 transition-all"
                style={{ width: `${pctFraccion}%` }}
                title={`${(fraccion * 100).toFixed(0)}% de placa adicional`}
              />
            )}
          </div>

          {/* Range bar ±10% */}
          <div className="h-1.5 rounded-full bg-secondary/60 relative overflow-hidden">
            <div
              className="absolute inset-y-0 bg-amber-400/60 dark:bg-amber-500/50 rounded-full"
              style={{ left: `${pctRangeLeft}%`, width: `${pctRangeWidth}%` }}
            />
          </div>

          {/* Labels */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {placasEnteras > 0 ? (
                <>
                  <span className="text-emerald-600 font-semibold">{placasEnteras}</span>
                  {" "}entera{placasEnteras !== 1 ? "s" : ""}
                  {fraccion > 0.001 && (
                    <span className="text-muted-foreground/60">
                      {" + "}{(fraccion * 100).toFixed(0)}% de una más
                    </span>
                  )}
                </>
              ) : (
                <span>{(fraccion * 100).toFixed(0)}% de una placa</span>
              )}
            </span>
            <span className="text-amber-600/80 dark:text-amber-400/70 font-mono text-[10px]">
              {minPlacas.toFixed(2)} ─ {maxPlacas.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-secondary/10 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {g.cantidadRetazos} retazo{g.cantidadRetazos !== 1 ? "s" : ""}
          </span>
          <span className="font-mono tabular-nums">
            {g.areaRetazosM2.toFixed(3)} m² en stock
          </span>
        </div>
      </div>
    </div>
  );
}

export function ResumenPlacas({ items }: Props) {
  const disponibles = items.filter(
    (i) => i.estado === "disponible" && i.insumo.altoM && i.insumo.anchoM
  );
  const sinDims = items.filter(
    (i) => i.estado === "disponible" && (!i.insumo.altoM || !i.insumo.anchoM)
  );

  if (disponibles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 px-8 py-16 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-semibold text-foreground">Sin datos de placas</p>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
          Para calcular el stock equivalente en placas, los insumos deben tener las dimensiones estándar configuradas (alto × ancho en metros).
        </p>
      </div>
    );
  }

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
  const totalM2 = lista.reduce((s, g) => s + g.areaRetazosM2, 0);
  const totalRetazos = lista.reduce((s, g) => s + g.cantidadRetazos, 0);
  const totalPlacasEq = lista.reduce((s, g) => s + g.placasEquivalentes, 0);

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">Materiales</div>
          <div className="text-2xl font-bold text-foreground mt-0.5 tabular-nums">{lista.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">tipos con dimensiones</div>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">Retazos</div>
          <div className="text-2xl font-bold text-foreground mt-0.5 tabular-nums">{totalRetazos}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">unidades disponibles</div>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">Área total</div>
          <div className="text-2xl font-bold text-foreground mt-0.5 tabular-nums font-mono">{totalM2.toFixed(2)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">m² acumulados</div>
        </div>
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
          <div className="text-xs text-emerald-700 dark:text-emerald-400">Placas equiv. totales</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums font-mono">
            {totalPlacasEq.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">suma de todos los materiales</div>
        </div>
      </div>

      {/* Margin explanation */}
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          El rango <strong>±10%</strong> contempla variaciones en el aprovechamiento real al momento de cortar.
          La barra verde muestra el estimado base; la banda ámbar, el rango de incertidumbre.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((g) => (
          <PlacaCard key={g.insumoId} g={g} />
        ))}
      </div>

      {/* Materials without plate dims */}
      {sinDims.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/30 px-4 py-3">
          <Package className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hay{" "}
            <span className="font-semibold text-foreground">{sinDims.length}</span>{" "}
            retazo{sinDims.length !== 1 ? "s" : ""} de materiales sin dimensiones de placa configuradas — no se incluyen en este cálculo.
            Configurá alto y ancho en{" "}
            <a href="/insumos" className="underline hover:text-foreground transition-colors">
              Insumos
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
