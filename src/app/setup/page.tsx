import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FormSetup } from "@/components/setup/FormSetup";
import { Settings2 } from "lucide-react";

export const metadata = { title: "Configuración inicial — LaUnion" };

export default async function SetupPage() {
  const count = await prisma.empresa.count();
  if (count > 0) {
    const session = await auth();
    redirect(session ? "/" : "/login");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, hsl(226,34%,10%) 0%, hsl(226,34%,17%) 50%, hsl(220,30%,13%) 100%)",
      }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Settings2 className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bienvenido a LaUnion</h1>
            <p className="text-sm text-white/50 mt-1">
              Configuración inicial del sistema · Solo se hace una vez
            </p>
          </div>
        </div>

        <FormSetup />

        <p className="text-center text-xs text-white/25">
          LaUnion — Sistema de Costeo para Carpintería
        </p>
      </div>
    </div>
  );
}
