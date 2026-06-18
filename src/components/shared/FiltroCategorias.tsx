"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  categorias: { id: string; nombre: string }[];
  placeholder?: string;
}

export function FiltroCategorias({ categorias, placeholder = "Todas las categorías" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoriaActual = searchParams.get("categoriaId") ?? "todas";

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "todas") {
        params.delete("categoriaId");
      } else {
        params.set("categoriaId", value);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <Select value={categoriaActual} onValueChange={handleChange}>
      <SelectTrigger className="h-9 text-sm w-52">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">{placeholder}</SelectItem>
        {categorias.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
