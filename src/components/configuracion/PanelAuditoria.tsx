"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearFecha } from "@/lib/formato";

interface LogEntry {
  id: string;
  fechaHora: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: string;
  entidad: string;
  entidadId: string;
  datosAnteriores: unknown;
  datosNuevos: unknown;
}

const ACCION_COLORS: Record<string, string> = {
  PRECIO_MODIFICADO:    "text-amber-700 bg-amber-50 border-amber-200",
  PRECIO_CREADO:        "text-emerald-700 bg-emerald-50 border-emerald-200",
  MUEBLE_MODIFICADO:    "text-blue-700 bg-blue-50 border-blue-200",
  MUEBLE_DESACTIVADO:   "text-red-700 bg-red-50 border-red-200",
  USUARIO_CREADO:       "text-violet-700 bg-violet-50 border-violet-200",
  USUARIO_MODIFICADO:   "text-violet-700 bg-violet-50 border-violet-200",
  USUARIO_ELIMINADO:    "text-red-700 bg-red-50 border-red-200",
};

export function PanelAuditoria() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [busquedaActiva, setBusquedaActiva] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  const cargar = useCallback(async (pagina: number, busqueda: string) => {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        page: String(pagina),
        pageSize: String(PAGE_SIZE),
        ...(busqueda ? { q: busqueda } : {}),
      });
      const res = await fetch(`/api/auditoria?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(page, busquedaActiva); }, [page, busquedaActiva, cargar]);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    setBusquedaActiva(q);
    setPage(1);
  }

  function limpiarBusqueda() {
    setQ("");
    setBusquedaActiva("");
    setPage(1);
  }

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  function formatJson(val: unknown) {
    if (!val) return null;
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="flex items-center gap-3">
        <form onSubmit={buscar} className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar acción, entidad…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {q && (
            <button type="button" onClick={limpiarBusqueda} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
        <Button variant="outline" size="sm" onClick={() => cargar(page, busquedaActiva)} disabled={cargando}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${cargando ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">
          {total} registro{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="na-table min-w-[700px]">
          <thead>
            <tr>
              <th className="w-40">Fecha/Hora</th>
              <th className="w-32">Usuario</th>
              <th className="w-48">Acción</th>
              <th>Entidad</th>
              <th className="text-center w-20">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Cargando…</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                  {busquedaActiva ? "Sin resultados para esa búsqueda." : "No hay registros de auditoría todavía."}
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const abierto = expandido === log.id;
                const colorClass = ACCION_COLORS[log.accion] ?? "text-muted-foreground bg-secondary border-border";
                return (
                  <>
                    <tr key={log.id} className={abierto ? "bg-secondary/30" : undefined}>
                      <td className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatearFecha(new Date(log.fechaHora))}
                        <span className="block text-[10px] opacity-60">
                          {new Date(log.fechaHora).toLocaleTimeString("es-AR")}
                        </span>
                      </td>
                      <td className="text-sm font-medium">{log.usuarioNombre}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${colorClass}`}>
                          {log.accion}
                        </span>
                      </td>
                      <td className="text-sm">
                        <span className="font-medium">{log.entidad}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground/60 truncate max-w-[120px] inline-block align-bottom">
                          {log.entidadId}
                        </span>
                      </td>
                      <td className="text-center">
                        {(log.datosAnteriores != null || log.datosNuevos != null) && (
                          <button
                            onClick={() => setExpandido(abierto ? null : log.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            {abierto ? "Ocultar" : "Ver"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {abierto && (
                      <tr key={`${log.id}-detail`} className="bg-secondary/20">
                        <td colSpan={5} className="px-4 pb-3 pt-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            {log.datosAnteriores != null && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Antes</p>
                                <pre className="text-xs bg-background rounded border border-border p-2 overflow-x-auto">
                                  {formatJson(log.datosAnteriores) ?? ""}
                                </pre>
                              </div>
                            )}
                            {log.datosNuevos != null && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Después</p>
                                <pre className="text-xs bg-background rounded border border-border p-2 overflow-x-auto">
                                  {formatJson(log.datosNuevos) ?? ""}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {totalPaginas}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
