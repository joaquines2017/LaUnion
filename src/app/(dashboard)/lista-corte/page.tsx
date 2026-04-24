"use client";

import { useState, useEffect, useMemo } from "react";
import { FileSpreadsheet, FileText, ArrowUpDown, ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MuebleRef {
  id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
}

interface FilaCorte {
  id: string;
  anchoCm: number;
  altoCm: number;
  espesormm: number | null;
  cantidad: number;
  pieza: string;
  insumo: string | null;
  muebles: MuebleRef[];
}

type SortField = "anchoCm" | "altoCm" | "cantidad" | "pieza";
type SortDir = "asc" | "desc";
interface SortKey { field: SortField; dir: SortDir }

const FIELD_LABELS: Record<SortField, string> = {
  anchoCm:  "Ancho",
  altoCm:   "Alto",
  cantidad: "Cantidad",
  pieza:    "Pieza",
};

export default function ListaCorte() {
  const [filas, setFilas] = useState<FilaCorte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [sortKeys, setSortKeys] = useState<SortKey[]>([
    { field: "anchoCm", dir: "desc" },
    { field: "altoCm",  dir: "desc" },
  ]);
  const [exportando, setExportando] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    fetch("/api/lista-corte")
      .then((r) => r.json())
      .then((data) => { setFilas(data); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  // Filtrado
  const filasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return filas;
    const q = busqueda.toLowerCase();
    return filas.filter(
      (f) =>
        f.pieza.toLowerCase().includes(q) ||
        (f.insumo ?? "").toLowerCase().includes(q) ||
        f.muebles.some(
          (m) => m.codigo.toLowerCase().includes(q) || m.nombre.toLowerCase().includes(q)
        )
    );
  }, [filas, busqueda]);

  // Ordenación multi-clave
  const filasOrdenadas = useMemo(() => {
    return [...filasFiltradas].sort((a, b) => {
      for (const { field, dir } of sortKeys) {
        const va = a[field];
        const vb = b[field];
        let cmp = 0;
        if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
        else cmp = String(va ?? "").localeCompare(String(vb ?? ""), "es");
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [filasFiltradas, sortKeys]);

  function toggleSort(field: SortField) {
    setSortKeys((prev) => {
      const existing = prev.find((k) => k.field === field);
      if (existing) {
        // Si ya está primero: invertir dirección
        if (prev[0].field === field) {
          return prev.map((k) => k.field === field ? { ...k, dir: k.dir === "desc" ? "asc" : "desc" } : k);
        }
        // Moverlo al frente
        return [existing, ...prev.filter((k) => k.field !== field)];
      }
      // Agregar como primer criterio
      return [{ field, dir: "desc" }, ...prev.slice(0, 2)];
    });
  }

  function SortIcon({ field }: { field: SortField }) {
    const idx = sortKeys.findIndex((k) => k.field === field);
    if (idx === -1) return <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />;
    const { dir } = sortKeys[idx];
    return (
      <span className="inline-flex items-center gap-0.5">
        {dir === "desc"
          ? <ArrowDown className="h-3.5 w-3.5 text-primary" />
          : <ArrowUp   className="h-3.5 w-3.5 text-primary" />}
        {idx === 0 && sortKeys.length > 1 && (
          <span className="text-[9px] font-bold text-primary tabular-nums">1</span>
        )}
        {idx === 1 && (
          <span className="text-[9px] font-bold text-primary/60 tabular-nums">2</span>
        )}
      </span>
    );
  }

  // Build sort param string para la API de exportación
  const sortParam = sortKeys
    .map((k) => `${k.field}:${k.dir}`)
    .join(",");

  async function exportar(tipo: "excel" | "pdf") {
    setExportando(tipo);
    const url = `/api/lista-corte/${tipo}?sort=${encodeURIComponent(sortParam)}`;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `lista-corte-${new Date().toISOString().slice(0, 10)}.${tipo === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExportando(null);
    }
  }

  const totalPiezas = filasOrdenadas.reduce((s, f) => s + f.cantidad, 0);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Lista de Corte</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Todos los cortes del despiece de muebles activos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportar("excel")}
            disabled={exportando !== null || cargando}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            {exportando === "excel" ? "Generando…" : "Excel"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportar("pdf")}
            disabled={exportando !== null || cargando}
          >
            <FileText className="h-4 w-4 mr-1.5 text-red-500" />
            {exportando === "pdf" ? "Generando…" : "PDF"}
          </Button>
        </div>
      </div>

      {/* Métricas + búsqueda */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{filasOrdenadas.length}</span> corte{filasOrdenadas.length !== 1 ? "s" : ""}
            {filasOrdenadas.length !== filas.length && ` de ${filas.length}`}
          </span>
          <span>
            <span className="font-semibold text-foreground">{totalPiezas}</span> piezas en total
          </span>
        </div>

        <div className="relative ml-auto min-w-[220px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar pieza, insumo, mueble…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Indicador de orden activo */}
      {sortKeys.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>Orden:</span>
          {sortKeys.map((k, i) => (
            <button
              key={k.field}
              onClick={() => toggleSort(k.field)}
              className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-primary font-medium hover:bg-primary/10 transition-colors"
            >
              <span>{i + 1}.</span>
              <span>{FIELD_LABELS[k.field]}</span>
              {k.dir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
            </button>
          ))}
          <span className="text-muted-foreground/60">· hacé clic en una columna para cambiar el orden</span>
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-card overflow-x-auto">
          <table className="na-table min-w-[800px]">
            <thead>
              <tr>
                <th
                  className="text-center cursor-pointer select-none hover:bg-secondary/60 transition-colors w-24"
                  onClick={() => toggleSort("anchoCm")}
                >
                  <span className="inline-flex items-center gap-1.5 justify-center">
                    Ancho (cm) <SortIcon field="anchoCm" />
                  </span>
                </th>
                <th
                  className="text-center cursor-pointer select-none hover:bg-secondary/60 transition-colors w-24"
                  onClick={() => toggleSort("altoCm")}
                >
                  <span className="inline-flex items-center gap-1.5 justify-center">
                    Alto (cm) <SortIcon field="altoCm" />
                  </span>
                </th>
                <th className="text-center w-16">Esp. (mm)</th>
                <th
                  className="text-center cursor-pointer select-none hover:bg-secondary/60 transition-colors w-20"
                  onClick={() => toggleSort("cantidad")}
                >
                  <span className="inline-flex items-center gap-1.5 justify-center">
                    Cant. <SortIcon field="cantidad" />
                  </span>
                </th>
                <th
                  className="cursor-pointer select-none hover:bg-secondary/60 transition-colors"
                  onClick={() => toggleSort("pieza")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Pieza / Detalle <SortIcon field="pieza" />
                  </span>
                </th>
                <th>Insumo</th>
                <th>Muebles</th>
              </tr>
            </thead>
            <tbody>
              {filasOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                    {busqueda ? "Sin resultados para esa búsqueda." : "No hay cortes con medidas registradas."}
                  </td>
                </tr>
              ) : (
                filasOrdenadas.map((f) => (
                  <tr key={f.id}>
                    <td className="text-center font-mono font-semibold tabular-nums text-sm">
                      {f.anchoCm}
                    </td>
                    <td className="text-center font-mono font-semibold tabular-nums text-sm">
                      {f.altoCm}
                    </td>
                    <td className="text-center text-sm text-muted-foreground tabular-nums">
                      {f.espesormm ?? "—"}
                    </td>
                    <td className="text-center font-semibold text-sm tabular-nums">
                      {f.cantidad}
                    </td>
                    <td className="text-sm font-medium text-foreground">
                      {f.pieza}
                    </td>
                    <td className="text-sm text-muted-foreground max-w-[220px]">
                      <span className="truncate block">{f.insumo ?? "—"}</span>
                    </td>
                    <td className="max-w-[280px]">
                      <div className="flex flex-col gap-1">
                        {f.muebles.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs text-muted-foreground shrink-0">{m.codigo}</span>
                            <span className="text-sm text-foreground truncate flex-1">{m.nombre}</span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-primary ml-1">
                              ×{m.cantidad}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
