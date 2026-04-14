"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  imagenes: { url: string; filename: string }[];
}

export function CarruselImagenes({ imagenes }: Props) {
  const [actual, setActual] = useState(0);

  if (imagenes.length === 0) return null;

  const anterior = () =>
    setActual((i) => (i === 0 ? imagenes.length - 1 : i - 1));
  const siguiente = () =>
    setActual((i) => (i === imagenes.length - 1 ? 0 : i + 1));

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card max-w-2xl">
      {/* Imagen principal */}
      <div className="relative bg-secondary/30 overflow-hidden" style={{ height: "320px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenes[actual].url}
          alt={imagenes[actual].filename}
          className="w-full h-full object-contain"
        />

        {/* Flechas (solo si hay más de una) */}
        {imagenes.length > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={siguiente}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Contador */}
            <div className="absolute bottom-2 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full font-mono">
              {actual + 1} / {imagenes.length}
            </div>
          </>
        )}
      </div>

      {/* Miniaturas (solo si hay más de una) */}
      {imagenes.length > 1 && (
        <div className="flex gap-1.5 p-2 overflow-x-auto bg-secondary/20">
          {imagenes.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActual(i)}
              className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all ${
                i === actual
                  ? "border-primary opacity-100"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.filename}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
