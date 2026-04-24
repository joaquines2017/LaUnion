import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Number(searchParams.get("pageSize") ?? 50));
  const accion   = searchParams.get("accion") ?? undefined;
  const entidad  = searchParams.get("entidad") ?? undefined;
  const q        = searchParams.get("q") ?? undefined;

  const where = {
    ...(accion  ? { accion }  : {}),
    ...(entidad ? { entidad } : {}),
    ...(q ? { OR: [
      { accion:   { contains: q, mode: "insensitive" as const } },
      { entidad:  { contains: q, mode: "insensitive" as const } },
      { usuarioId:{ contains: q, mode: "insensitive" as const } },
    ]} : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.logAuditoria.findMany({
      where,
      orderBy: { fechaHora: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.logAuditoria.count({ where }),
  ]);

  // Resolver nombres de usuario en una sola query
  const usuarioIds = [...new Set(logs.map((l) => l.usuarioId))];
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: usuarioIds } },
    select: { id: true, nombreUsuario: true },
  });
  const usuarioMap = Object.fromEntries(usuarios.map((u) => [u.id, u.nombreUsuario]));

  const data = logs.map((l) => ({
    ...l,
    usuarioNombre: usuarioMap[l.usuarioId] ?? l.usuarioId,
  }));

  return NextResponse.json({ logs: data, total, page, pageSize });
}
