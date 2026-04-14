"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  placeholder?: string;
}

export function FiltrosBusqueda({ placeholder = "Buscar…" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const estadoActual = searchParams.get("estado") ?? "activo";
  const qActual = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(qActual);

  // Sync input when URL changes externally
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const actualizarUrl = useCallback(
    (nuevoQ: string, nuevoEstado: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nuevoQ) {
        params.set("q", nuevoQ);
      } else {
        params.delete("q");
      }
      params.set("estado", nuevoEstado);
      // Preserve other params (e.g. categoriaId) except page
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      actualizarUrl(query, estadoActual);
    }, 350);
    return () => clearTimeout(timer);
    // Only run when query changes, not on estadoActual changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const tabs = [
    { value: "activo", label: "Activos" },
    { value: "inactivo", label: "Inactivos" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Buscador */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Tabs activo / inactivo */}
      <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => actualizarUrl(query, tab.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded transition-colors",
              estadoActual === tab.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
