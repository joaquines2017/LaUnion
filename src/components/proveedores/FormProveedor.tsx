"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Proveedor {
  id: string;
  nombre: string;
  cuit: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  observaciones: string | null;
}

export function FormProveedor({ proveedor }: { proveedor?: Proveedor }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const data = {
      nombre: fd.get("nombre") as string,
      cuit: fd.get("cuit") as string || undefined,
      telefono: fd.get("telefono") as string || undefined,
      email: fd.get("email") as string || undefined,
      direccion: fd.get("direccion") as string || undefined,
      observaciones: fd.get("observaciones") as string || undefined,
    };

    const url = proveedor
      ? `/api/proveedores/${proveedor.id}`
      : "/api/proveedores";
    const method = proveedor ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(proveedor ? "Proveedor actualizado" : "Proveedor creado");
      router.push("/proveedores");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error("Error al guardar: " + JSON.stringify(err.error));
    }

    setLoading(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre / Razón social *</Label>
            <Input
              id="nombre"
              name="nombre"
              required
              defaultValue={proveedor?.nombre}
              placeholder="Ej: Herrajes Ya"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                name="cuit"
                defaultValue={proveedor?.cuit ?? ""}
                placeholder="20-12345678-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                name="telefono"
                defaultValue={proveedor?.telefono ?? ""}
                placeholder="011 4123-4567"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={proveedor?.email ?? ""}
              placeholder="ventas@proveedor.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              name="direccion"
              defaultValue={proveedor?.direccion ?? ""}
              placeholder="Av. Corrientes 1234, CABA"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input
              id="observaciones"
              name="observaciones"
              defaultValue={proveedor?.observaciones ?? ""}
              placeholder="Condiciones de pago, plazos de entrega..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : proveedor ? "Guardar cambios" : "Crear proveedor"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
