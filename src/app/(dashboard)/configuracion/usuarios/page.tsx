import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GestionUsuarios } from "@/components/configuracion/GestionUsuarios";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as { role?: string }).role !== "administrador") {
    redirect("/configuracion");
  }

  const usuarios = await prisma.usuario.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nombreUsuario: true,
      email: true,
      rol: true,
      estado: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Usuarios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Administrá los accesos al sistema. Solo los administradores pueden ver esta sección.
        </p>
      </div>
      <GestionUsuarios
        usuarios={usuarios.map((u) => ({ ...u, rol: u.rol as "administrador" | "operador" | "lectura", estado: u.estado as "activo" | "inactivo", createdAt: u.createdAt.toISOString() }))}
        sesionId={(session.user as { id?: string }).id ?? ""}
      />
    </div>
  );
}
