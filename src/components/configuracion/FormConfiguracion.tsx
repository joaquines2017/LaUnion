"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Info } from "lucide-react";

interface Config {
  factorDesperdicio: number;
  vigenciaPrecioDias: number;
}

export function FormConfiguracion({ config }: { config: Config }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [factor, setFactor] = useState(
    String(((config.factorDesperdicio - 1) * 100).toFixed(1))
  );
  const [vigencia, setVigencia] = useState(String(config.vigenciaPrecioDias));

  // El factor que se almacena es 1 + porcentaje/100 (ej: 10% → 1.10)
  const factorNumerico = 1 + parseFloat(factor || "0") / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        factorDesperdicio: factorNumerico,
        vigenciaPrecioDias: parseInt(vigencia) || 30,
      }),
    });

    if (res.ok) {
      toast.success("Configuración guardada");
      router.refresh();
    } else {
      toast.error("Error al guardar");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Factor de desperdicio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Factor de desperdicio</CardTitle>
          <CardDescription>
            Porcentaje adicional de material que se aplica al cálculo de placas
            para compensar el desperdicio en corte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1.5 w-40">
              <Label htmlFor="factor">Desperdicio (%)</Label>
              <div className="relative">
                <Input
                  id="factor"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={factor}
                  onChange={(e) => setFactor(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            <div className="pb-0.5 text-sm text-muted-foreground">
              Factor almacenado:{" "}
              <span className="font-mono font-semibold text-foreground">
                {isNaN(factorNumerico) ? "—" : factorNumerico.toFixed(3)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Con <strong>{factor || "0"}%</strong> de desperdicio, una pieza de 90×43 cm en
              una placa de 283×183 cm consume un{" "}
              <strong>
                {isNaN(factorNumerico)
                  ? "—"
                  : (
                      ((90 * 43) / (283 * 183)) *
                      factorNumerico *
                      100
                    ).toFixed(2)}
                %
              </strong>{" "}
              de la placa (sin factor: {(((90 * 43) / (283 * 183)) * 100).toFixed(2)}%).
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Vigencia de precios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vigencia de precios</CardTitle>
          <CardDescription>
            Cantidad de días antes de que un precio se considere desactualizado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-1.5 w-40">
              <Label htmlFor="vigencia">Días de vigencia</Label>
              <div className="relative">
                <Input
                  id="vigencia"
                  type="number"
                  min="1"
                  max="365"
                  value={vigencia}
                  onChange={(e) => setVigencia(e.target.value)}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  días
                </span>
              </div>
            </div>
            <div className="pb-0.5 text-sm text-muted-foreground">
              Los precios sin actualizar en más de{" "}
              <span className="font-semibold text-foreground">
                {vigencia || "30"} días
              </span>{" "}
              se marcarán como desactualizados.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </form>
  );
}
