"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PowerOff, Power } from "lucide-react";

interface Props {
  id: string;
  entidad: "insumos" | "proveedores" | "muebles";
  estadoActual: string;
  nombre: string;
}

export function BotonEstado({ id, entidad, estadoActual, nombre }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const activo = estadoActual === "activo";

  async function handleDesactivar() {
    setLoading(true);
    const res = await fetch(`/api/${entidad}/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${nombre} desactivado`);
      router.refresh();
    } else {
      toast.error("Error al desactivar");
    }
    setLoading(false);
  }

  async function handleReactivar() {
    setLoading(true);
    const res = await fetch(`/api/${entidad}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "activo" }),
    });
    if (res.ok) {
      toast.success(`${nombre} reactivado`);
      router.refresh();
    } else {
      toast.error("Error al reactivar");
    }
    setLoading(false);
  }

  if (!activo) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleReactivar}
        disabled={loading}
        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
      >
        <Power className="h-4 w-4 mr-1.5" />
        {loading ? "Reactivando…" : "Reactivar"}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive/60"
        >
          <PowerOff className="h-4 w-4 mr-1.5" />
          Desactivar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar {nombre}?</AlertDialogTitle>
          <AlertDialogDescription>
            El registro quedará inactivo y no aparecerá en los listados por
            defecto. Podés reactivarlo en cualquier momento desde la vista de
            inactivos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDesactivar}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sí, desactivar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
