"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FormMueble } from "./FormMueble";
import { TabDespiece, crearFilaMaterial, type FilaMaterial } from "./TabDespiece";
import { TabInsumos, crearFilaInsumo, type FilaInsumo } from "./TabInsumos";
import { formatearPrecio, formatearNumeroInput, parsearNumero } from "@/lib/formato";
import { toast } from "sonner";
import type { InsumoOpcion } from "./AutocompletarInsumo";

// ─── Tipos que vienen del servidor ────────────────────────────────────────────

interface InsumoDBRef {
  id: string;
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  altoM: number | null;
  anchoM: number | null;
  precios?: { precio: string | number }[];
}

interface MaterialDB {
  id: string;
  insumoId: string | null;
  productoNombre: string;
  medidas: string | null;
  cantidad: string | number;
  costoUnitario: string | number;
  costoTotal: string | number;
  orden: number;
  insumo?: InsumoDBRef | null;
}

interface InsumoLineaDB {
  id: string;
  insumoId: string | null;
  descripcion: string;
  cantidad: string | number;
  costoUnitario: string | number;
  costoTotal: string | number;
  orden: number;
  insumo?: InsumoDBRef | null;
}

interface Mueble {
  id: string;
  codigo: string;
  nombre: string;
  categoriaId: string;
  costoActual: string | number;
  estado: string;
}

interface Categoria {
  id: string;
  nombre: string;
}

interface ImagenMueble {
  id: string;
  url: string;
  filename: string;
  orden: number;
}

interface Props {
  mueble: Mueble;
  categorias: Categoria[];
  materialesIniciales: MaterialDB[];
  insumosIniciales: InsumoLineaDB[];
  imagenesIniciales?: ImagenMueble[];
  factorDesperdicio?: number;
}

// ─── Conversores DB → estado UI ───────────────────────────────────────────────

function dbInsumoAOpcion(i: InsumoDBRef): InsumoOpcion {
  return {
    id: i.id,
    codigo: i.codigo,
    descripcion: i.descripcion,
    unidadMedida: i.unidadMedida,
    altoM: i.altoM,
    anchoM: i.anchoM,
    precioRef: i.precios?.[0] ? Number(i.precios[0].precio) : null,
  };
}

function dbAFilaMaterial(m: MaterialDB): FilaMaterial {
  const insumo = m.insumo ? dbInsumoAOpcion(m.insumo) : null;
  const partes = m.medidas ? m.medidas.split("x") : [];
  return crearFilaMaterial({
    insumo,
    productoNombre: m.productoNombre,
    altoCm: partes[0] ?? "",
    anchoCm: partes[1] ?? "",
    cantidad: String(m.cantidad),
  });
}

function dbAFilaInsumo(i: InsumoLineaDB): FilaInsumo {
  const insumo = i.insumo ? dbInsumoAOpcion(i.insumo) : null;
  const esPlaca = insumo?.unidadMedida === "placa";
  const cantidadDisplay = esPlaca
    ? String(Math.round(Number(i.cantidad) * 10000) / 100)
    : String(i.cantidad);
  const fila = crearFilaInsumo({
    insumo,
    descripcion: i.descripcion,
    cantidad: cantidadDisplay,
    costoUnitario: formatearNumeroInput(Number(i.costoUnitario)),
    modoCalculo: esPlaca ? "placa" : "unitario",
  });
  fila.costoTotal = Number(i.costoTotal);
  return fila;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function DetalleMueble({
  mueble,
  categorias,
  materialesIniciales,
  insumosIniciales,
  imagenesIniciales = [],
  factorDesperdicio: _factorDesperdicio = 1.1,
}: Props) {
  const router = useRouter();

  const [materiales, setMateriales] = useState<FilaMaterial[]>(() =>
    materialesIniciales.length > 0
      ? materialesIniciales.map(dbAFilaMaterial)
      : [crearFilaMaterial()]
  );

  const [insumos, setInsumos] = useState<FilaInsumo[]>(() =>
    insumosIniciales.length > 0
      ? insumosIniciales.map(dbAFilaInsumo)
      : [crearFilaInsumo()]
  );

  const [guardando, setGuardando] = useState(false);

  const costoTotal = insumos.reduce((s, f) => s + f.costoTotal, 0);

  async function guardarDespiece() {
    setGuardando(true);
    try {
      const materialesPayload = materiales
        .filter((f) => f.productoNombre.trim())
        .map((f, i) => ({
          insumoId: f.insumo?.id ?? null,
          productoNombre: f.productoNombre,
          medidas: f.altoCm && f.anchoCm ? `${f.altoCm}x${f.anchoCm}` : null,
          cantidad: Math.max(parseFloat(f.cantidad) || 1, 0.0001),
          costoUnitario: 0,
          costoTotal: 0,
          orden: i,
        }));

      const insumosPayload = insumos
        .filter((f) => f.descripcion.trim())
        .map((f, i) => {
          const cant =
            f.modoCalculo === "placa"
              ? (parseFloat(f.cantidad) || 0) / 100
              : parseFloat(f.cantidad) || 0;
          return {
            insumoId: f.insumo?.id ?? null,
            descripcion: f.descripcion,
            cantidad: Math.max(cant, 0),
            costoUnitario: parsearNumero(f.costoUnitario),
            costoTotal: f.costoTotal,
            orden: i,
          };
        });

      const res = await fetch(`/api/muebles/${mueble.id}/despiece`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materiales: materialesPayload, insumos: insumosPayload }),
      });

      if (res.ok) {
        toast.success("Despiece guardado");
        router.refresh();
      } else {
        const err = await res.json();
        toast.error("Error: " + (err.error ?? "desconocido"));
      }
    } finally {
      setGuardando(false);
    }
  }

  const cantMateriales = materiales.filter((f) => f.productoNombre.trim()).length;
  const cantInsumos = insumos.filter((f) => f.descripcion.trim()).length;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="mueble">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="mueble">Datos del mueble</TabsTrigger>
            <TabsTrigger value="despiece">
              Despiece
              {cantMateriales > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded font-mono">
                  {cantMateriales}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="insumos">
              Insumos
              {cantInsumos > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded font-mono">
                  {cantInsumos}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {costoTotal > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Costo total</div>
                <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {formatearPrecio(costoTotal)}
                </div>
              </div>
              <Button onClick={guardarDespiece} disabled={guardando} size="sm">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {guardando ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          )}
          {costoTotal === 0 && (
            <Button onClick={guardarDespiece} disabled={guardando} size="sm">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          )}
        </div>

        {/* Tab: Datos del mueble + imágenes */}
        <TabsContent value="mueble" className="mt-4">
          <FormMueble
            mueble={mueble}
            categorias={categorias}
            imagenesIniciales={imagenesIniciales}
          />
        </TabsContent>

        {/* Tab: Despiece */}
        <TabsContent value="despiece" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <TabDespiece filas={materiales} onChange={setMateriales} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Insumos */}
        <TabsContent value="insumos" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <TabInsumos filas={insumos} onChange={setInsumos} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
