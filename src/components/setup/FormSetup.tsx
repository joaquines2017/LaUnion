"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

export function FormSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [empresaNombre, setEmpresaNombre] = useState("");
  const [adminNombre, setAdminNombre] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (adminPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (adminPassword !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaNombre, adminNombre, adminEmail, adminPassword }),
    });

    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al configurar el sistema.");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="bg-card rounded-2xl border border-white/8 shadow-2xl px-8 py-10 text-center space-y-5">
        <div className="flex justify-center">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">¡Sistema configurado!</h2>
          <p className="text-sm text-muted-foreground">
            <strong>{empresaNombre}</strong> está lista para usar.
            Iniciá sesión con el email y contraseña que configuraste.
          </p>
        </div>
        <Button className="w-full h-10 font-semibold" onClick={() => router.push("/login")}>
          Ir al login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-card rounded-2xl border border-white/8 shadow-2xl overflow-hidden">

        {/* Sección empresa */}
        <div className="px-8 pt-8 pb-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Tu empresa
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Este nombre aparecerá en el sistema.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="empresaNombre">Nombre de la empresa *</Label>
            <Input
              id="empresaNombre"
              value={empresaNombre}
              onChange={e => setEmpresaNombre(e.target.value)}
              placeholder="Ej: Carpintería García"
              required
              className="h-10"
            />
          </div>
        </div>

        <div className="border-t border-border mx-8" />

        {/* Sección admin */}
        <div className="px-8 pt-6 pb-8 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Cuenta de administrador
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Con estas credenciales vas a ingresar al sistema.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminNombre">Nombre de usuario *</Label>
            <Input
              id="adminNombre"
              value={adminNombre}
              onChange={e => setAdminNombre(e.target.value)}
              placeholder="Ej: admin"
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminEmail">Email *</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="admin@miempresa.com"
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminPassword">Contraseña *</Label>
            <div className="relative">
              <Input
                id="adminPassword"
                type={showPass ? "text" : "password"}
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar">Confirmar contraseña *</Label>
            <Input
              id="confirmar"
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repetí la contraseña"
              required
              className="h-10"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-md border border-destructive/20">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full h-10 font-semibold mt-2" disabled={loading}>
            {loading ? "Configurando…" : "Configurar sistema"}
          </Button>
        </div>
      </div>
    </form>
  );
}
