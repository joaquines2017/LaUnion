"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, PowerOff, Power } from "lucide-react";
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

interface Props {
  id: string;
  entidad: "insumos" | "proveedores" | "muebles";
  nombre: string;
  estadoActual: string;
}

export function AccionesTabla({ id, entidad, nombre, estadoActual }: Props) {
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

  return (
    <div className="flex items-center gap-1">
      {/* Editar */}
      <Link
        href={`/${entidad}/${id}`}
        title="Editar"
        className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Link>

      {/* Desactivar / Reactivar */}
      {activo ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              title="Desactivar"
              disabled={loading}
              className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <PowerOff className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desactivar {nombre}?</AlertDialogTitle>
              <AlertDialogDescription>
                El registro quedará inactivo. Podés reactivarlo desde la vista
                de inactivos en cualquier momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDesactivar}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Desactivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <button
          title="Reactivar"
          onClick={handleReactivar}
          disabled={loading}
          className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-emerald-50 transition-colors text-muted-foreground hover:text-emerald-600 disabled:opacity-50"
        >
          <Power className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
