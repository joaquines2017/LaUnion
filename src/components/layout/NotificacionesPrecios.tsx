"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Check, RefreshCw } from "lucide-react";

const LS_KEY = "launion-notif-leidas";

interface PrecioVencidoItem {
  insumoId: string;
  codigo: string;
  descripcion: string;
  proveedorNombre: string;
  diasVencido: number;
}

function getLeidas(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveLeidas(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

export function NotificacionesPrecios() {
  const [items, setItems] = useState<PrecioVencidoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [leidas, setLeidas] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotificaciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notificaciones/precios-vencidos");
      if (!res.ok) return;
      const data = await res.json() as { items: PrecioVencidoItem[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      // limpiar leídas que ya no existen en el servidor (precio fue actualizado)
      const idsActivos = new Set(data.items.map((i) => i.insumoId));
      setLeidas((prev) => {
        const limpias = new Set([...prev].filter((id) => idsActivos.has(id)));
        if (limpias.size !== prev.size) saveLeidas(limpias);
        return limpias;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // carga inicial del badge
  useEffect(() => {
    setLeidas(getLeidas());
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  // re-fetchea al volver a la pestaña
  useEffect(() => {
    const onFocus = () => fetchNotificaciones();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchNotificaciones]);

  // cierra al click afuera
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function marcarLeida(insumoId: string) {
    setLeidas((prev) => {
      const next = new Set(prev).add(insumoId);
      saveLeidas(next);
      return next;
    });
  }

  function marcarTodasLeidas() {
    const ids = new Set(items.map((i) => i.insumoId));
    saveLeidas(ids);
    setLeidas(ids);
  }

  const itemsNoLeidos = items.filter((i) => !leidas.has(i.insumoId));
  const badgeCount = itemsNoLeidos.length;

  function handleOpen() {
    setOpen((o) => !o);
    // re-fetchea al abrir para mostrar datos frescos
    if (!open) fetchNotificaciones();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        aria-label="Notificaciones de precios vencidos"
      >
        <Bell className="h-[18px] w-[18px]" />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 max-h-[420px] flex flex-col rounded-lg border border-border bg-card shadow-card z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-foreground">
              Precios vencidos
              {total > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({total})
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {badgeCount > 0 && (
                <button
                  onClick={marcarTodasLeidas}
                  className="flex items-center gap-1 text-xs text-primary hover:underline px-1.5 py-1 rounded transition-colors"
                  title="Marcar todas como leídas"
                >
                  <Check className="h-3 w-3" />
                  Leídas
                </button>
              )}
              <button
                onClick={() => fetchNotificaciones()}
                disabled={loading}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto">
            {loading && itemsNoLeidos.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : itemsNoLeidos.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {items.length === 0 ? "No hay precios vencidos." : "Todas las alertas están leídas."}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {itemsNoLeidos.map((item) => (
                  <div
                    key={item.insumoId}
                    className="flex items-start gap-2 px-3 py-2.5 hover:bg-secondary/50 transition-colors"
                  >
                    <Link
                      href={`/insumos/${item.insumoId}`}
                      onClick={() => setOpen(false)}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.descripcion}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.proveedorNombre} · hace {item.diasVencido}{" "}
                        {item.diasVencido === 1 ? "día" : "días"}
                      </p>
                    </Link>
                    <button
                      onClick={() => marcarLeida(item.insumoId)}
                      className="shrink-0 mt-0.5 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Marcar como leída"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
