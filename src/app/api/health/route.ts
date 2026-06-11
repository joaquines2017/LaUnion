import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import pkg from "../../../../package.json";

const startedAt = Date.now();

// RFO-003: health check para monitoreo y scripts de deploy.
// No requiere autenticación (ver excepción en proxy.ts).
export async function GET() {
  let db: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }

  const body = {
    status: db === "ok" ? "ok" : "error",
    version: pkg.version,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    db,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: db === "ok" ? 200 : 503 });
}
