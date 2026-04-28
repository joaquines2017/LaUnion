"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, User, Globe, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function FormNuevaEmpresa() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [exitoso, setExitoso] = useState(false);
  const [form, setForm] = useState({
    nombre: "", dominio: "", adminEmail: "", adminNombre: "",
  });

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/superadmin/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.emailError) {
        toast.warning(`Empresa creada, pero el email no se envió: ${data.emailError}`);
      } else {
        toast.success("Empresa creada — contraseña enviada por email");
      }
      setExitoso(true);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al crear la empresa");
    }
    setGuardando(false);
  }

  if (exitoso) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <div>
          <p className="text-lg font-semibold text-foreground">¡Empresa creada!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Se envió un email a <strong>{form.adminEmail}</strong> con las credenciales de acceso.
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <Button onClick={() => { setExitoso(false); setForm({ nombre: "", dominio: "", adminEmail: "", adminNombre: "" }); }}>
            Crear otra empresa
          </Button>
          <Button variant="outline" onClick={() => router.push("/superadmin")}>
            Ver todas las empresas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Datos de la empresa</h3>

        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Nombre de la empresa *"
            value={form.nombre}
            onChange={set("nombre")}
            required
          />
        </div>

        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Dominio (opcional, ej: mueblesm.ddns.net)"
            value={form.dominio}
            onChange={set("dominio")}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Usuario administrador</h3>

        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Nombre del administrador *"
            value={form.adminNombre}
            onChange={set("adminNombre")}
            required
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            type="email"
            placeholder="Email del administrador *"
            value={form.adminEmail}
            onChange={set("adminEmail")}
            required
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Se generará una contraseña automáticamente y se enviará a este email.
        </p>
      </div>

      <Button type="submit" disabled={guardando} className="w-full">
        {guardando ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando empresa…</>
        ) : (
          "Crear empresa y enviar credenciales"
        )}
      </Button>
    </form>
  );
}
