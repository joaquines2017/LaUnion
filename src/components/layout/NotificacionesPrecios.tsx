"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

export interface PrecioVencidoItem {
  insumoId: string;
  codigo: string;
  descripcion: string;
  proveedorNombre: string;
  diasVencido: number;
}

interface NotificacionesPreciosProps {
  preciosVencidos: {
    items: PrecioVencidoItem[];
    total: number;
  };
}

export function NotificacionesPrecios({ preciosVencidos }: NotificacionesPreciosProps) {
  const { items, total } = preciosVencidos;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        aria-label="Notificaciones de precios vencidos"
      >
        <Bell className="h-4.5 w-4.5" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 max-h-96 overflow-y-auto rounded-lg border border-border bg-card shadow-card z-50">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Precios vencidos</h3>
          </div>
          {items.length > 0 ? (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <Link
                  key={item.insumoId}
                  href={`/insumos/${item.insumoId}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 hover:bg-secondary/50 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground truncate">{item.descripcion}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.proveedorNombre} · vencido hace {item.diasVencido}{" "}
                    {item.diasVencido === 1 ? "día" : "días"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No hay precios vencidos.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
