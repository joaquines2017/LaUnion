import { NextResponse } from "next/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

interface EmpresaContext {
  empresaId: string;
  session: Session;
}

// RFF-001: helper comun para API routes que operan sobre datos de una
// empresa. Devuelve el contexto si la sesion es valida y tiene empresa
// asignada, o un NextResponse de error (401/403) listo para retornar.
export async function requireEmpresa(): Promise<EmpresaContext | NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const empresaId = (session.user as { empresaId?: string | null }).empresaId ?? null;
  if (!empresaId) {
    return NextResponse.json({ error: "Usuario sin empresa asignada" }, { status: 403 });
  }

  return { empresaId, session };
}

// RFF-001: variante para Server Components. Redirige a /login sin sesion,
// y muestra 404 si el usuario no tiene empresa asignada (superadmins y
// cuentas huerfanas no deben ver paginas de negocio).
export async function requireEmpresaPage(): Promise<EmpresaContext> {
  const session = await auth();
  if (!session) redirect("/login");

  const empresaId = (session.user as { empresaId?: string | null }).empresaId ?? null;
  if (!empresaId) notFound();

  return { empresaId, session };
}
