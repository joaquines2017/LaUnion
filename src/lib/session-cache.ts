import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

// RNFP-004: el middleware (proxy.ts) llama a auth() en todas las requests
// que matchea, incluidas las varias llamadas paralelas a /api/* que dispara
// una sola carga de página. auth() decodifica/verifica el JWT de sesión en
// cada invocación, así que cacheamos el resultado por un período corto,
// indexado por el header Cookie completo (idéntico entre requests del mismo
// navegador/sesión).
const TTL_MS = 10_000;
const MAX_ENTRADAS = 500;

const cache = new Map<string, { session: Session | null; expira: number }>();

export async function getCachedSession(request: NextRequest): Promise<Session | null> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return auth();

  const ahora = Date.now();
  const cacheado = cache.get(cookie);
  if (cacheado && cacheado.expira > ahora) return cacheado.session;

  const session = await auth();

  if (cache.size >= MAX_ENTRADAS) cache.clear();
  cache.set(cookie, { session, expira: ahora + TTL_MS });

  return session;
}
