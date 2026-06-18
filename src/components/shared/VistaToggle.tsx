"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

type Vista = "grid" | "lista";

interface Props {
  vistaActual: Vista;
}

export function VistaToggle({ vistaActual }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setVista(v: Vista) {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "grid") params.delete("vista");
    else params.set("vista", v);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border">
      {([
        { v: "grid" as Vista, icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Tarjetas" },
        { v: "lista" as Vista, icon: <List className="h-3.5 w-3.5" />, label: "Lista" },
      ]).map(({ v, icon, label }) => (
        <button
          key={v}
          onClick={() => setVista(v)}
          title={label}
          className={cn(
            "p-1.5 rounded transition-colors",
            vistaActual === v
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
