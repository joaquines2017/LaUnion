"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

interface Props {
  imagenes: { url: string; filename: string }[];
  nombre: string;
}

export function TarjetaImagenCiclo({ imagenes, nombre }: Props) {
  const [idx, setIdx] = useState(0);

  if (imagenes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <ImageIcon className="h-10 w-10 text-muted-foreground/15" />
      </div>
    );
  }

  const anterior = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx(i => (i === 0 ? imagenes.length - 1 : i - 1));
  };

  const siguiente = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx(i => (i === imagenes.length - 1 ? 0 : i + 1));
  };

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imagenes[idx].url}
        alt={nombre}
        className="w-full h-full object-cover transition-opacity duration-200"
      />

      {imagenes.length > 1 && (
        <>
          <button
            type="button"
            onClick={anterior}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={siguiente}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1 right-1.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {idx + 1}/{imagenes.length}
          </div>
        </>
      )}
    </>
  );
}
