"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Email o contraseña incorrectos.");
    } else {
      router.push("/");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, hsl(226,34%,10%) 0%, hsl(226,34%,17%) 50%, hsl(220,30%,13%) 100%)",
      }}
    >
      {/* Card principal */}
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden border border-white/5">

        {/* Sección logo */}
        <div
          className="flex flex-col items-center justify-center py-4 px-6"
          style={{ background: "#ffffff" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-launion.png"
            alt="La Union Muebles"
            style={{ width: 130, height: "auto", display: "block" }}
          />
        </div>

        {/* Separador con degradado */}
        <div
          style={{
            height: 3,
            background:
              "linear-gradient(90deg, hsl(226,34%,15%) 0%, hsl(210,79%,46%) 50%, hsl(226,34%,15%) 100%)",
          }}
        />

        {/* Sección formulario */}
        <div className="px-8 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">
              Iniciar sesión
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresá tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="usuario@ejemplo.com"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Contraseña
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-10"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-md border border-destructive/20">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-semibold mt-2"
              disabled={loading}
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            La Union Muebles © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
