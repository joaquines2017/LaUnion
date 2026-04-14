"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface InsumoOpcion {
  id: string;
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  altoM: number | null;
  anchoM: number | null;
  precioRef: number | null; // precio mínimo vigente
}

interface Props {
  value: InsumoOpcion | null;
  onChange: (insumo: InsumoOpcion | null) => void;
  placeholder?: string;
  /** Si true, también acepta texto libre (sin vincular a un insumo) */
  textoLibre?: boolean;
}

export function AutocompletarInsumo({
  value,
  onChange,
  placeholder = "Buscar insumo…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [opciones, setOpciones] = useState<InsumoOpcion[]>([]);
  const [cargando, setCargando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setOpciones([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCargando(true);
      try {
        const res = await fetch(
          `/api/insumos?buscar=${encodeURIComponent(query)}&estado=activo`
        );
        if (!res.ok) return;
        const data = await res.json();
        setOpciones(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.map((i: any) => ({
            id: i.id,
            codigo: i.codigo,
            descripcion: i.descripcion,
            unidadMedida: i.unidadMedida,
            altoM: i.altoM ?? null,
            anchoM: i.anchoM ?? null,
            precioRef: i.precios?.[0]?.precio
              ? Number(i.precios[0].precio)
              : i.precioBase != null
              ? Number(i.precioBase)
              : null,
          }))
        );
      } finally {
        setCargando(false);
      }
    }, 300);
  }, [query]);

  function seleccionar(opcion: InsumoOpcion) {
    onChange(opcion);
    setOpen(false);
    setQuery("");
  }

  function limpiar(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 text-sm"
        >
          {value ? (
            <span className="truncate text-left">
              <span className="font-mono text-xs text-muted-foreground mr-1.5">
                {value.codigo}
              </span>
              {value.descripcion}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                onClick={limpiar}
              />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por código o descripción…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {cargando && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Buscando…
              </div>
            )}
            {!cargando && query.length < 2 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Escribí al menos 2 caracteres
              </div>
            )}
            {!cargando && query.length >= 2 && opciones.length === 0 && (
              <CommandEmpty>Sin resultados para &ldquo;{query}&rdquo;</CommandEmpty>
            )}
            {!cargando && opciones.length > 0 && (
              <CommandGroup>
                {opciones.map((op) => (
                  <CommandItem
                    key={op.id}
                    value={op.id}
                    onSelect={() => seleccionar(op)}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value?.id === op.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-mono text-xs text-muted-foreground shrink-0">
                        {op.codigo}
                      </span>
                      <span className="truncate">{op.descripcion}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                      <span className="bg-secondary px-1.5 py-0.5 rounded font-mono">
                        {op.unidadMedida}
                      </span>
                      {op.precioRef != null && (
                        <span className="text-foreground font-semibold font-mono">
                          ${op.precioRef.toLocaleString("es-AR")}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
