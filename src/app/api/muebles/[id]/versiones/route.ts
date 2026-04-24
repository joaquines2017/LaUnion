import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";
import { registrarLog } from "@/lib/auditoria";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: muebleId } = await params;

  const versiones = await prisma.versionDespiece.findMany({
    where: { muebleId },
    orderBy: { numeroVersion: "desc" },
    select: {
      id: true,
      numeroVersion: true,
      fecha: true,
      motivo: true,
      usuarioId: true,
      snapshotMateriales: true,
      snapshotInsumos: true,
    },
  });

  // Resolver nombres de usuario
  const usuarioIds = [...new Set(versiones.map((v) => v.usuarioId))];
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: usuarioIds } },
    select: { id: true, nombreUsuario: true },
  });
  const usuarioMap = Object.fromEntries(usuarios.map((u) => [u.id, u.nombreUsuario]));

  const data = versiones.map((v) => {
    const mats = v.snapshotMateriales as Array<{ costoTotal: unknown }>;
    const ins  = v.snapshotInsumos   as Array<{ costoTotal: unknown }>;
    const costoSnapshot =
      mats.reduce((s, m) => s + Number(m.costoTotal ?? 0), 0) +
      ins.reduce( (s, i) => s + Number(i.costoTotal ?? 0), 0);
    return {
      id: v.id,
      numeroVersion: v.numeroVersion,
      fecha: v.fecha,
      motivo: v.motivo,
      usuarioNombre: usuarioMap[v.usuarioId] ?? v.usuarioId,
      totalMateriales: mats.length,
      totalInsumos: ins.length,
      costoSnapshot,
    };
  });

  return NextResponse.json(data);
}

// POST /api/muebles/[id]/versiones  { versionId }  → restaurar esa versión
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: muebleId } = await params;
  const { versionId } = await req.json();

  const version = await prisma.versionDespiece.findUnique({ where: { id: versionId } });
  if (!version || version.muebleId !== muebleId) {
    return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });
  }

  type MatSnap = {
    insumoId?: string | null;
    productoNombre: string;
    medidas?: string | null;
    cantidad: number;
    costoUnitario: number;
    costoTotal: number;
    orden?: number;
  };
  type InsSnap = {
    insumoId?: string | null;
    descripcion: string;
    cantidad: number;
    costoUnitario: number;
    costoTotal: number;
    orden?: number;
  };

  const materiales = version.snapshotMateriales as MatSnap[];
  const insumos    = version.snapshotInsumos    as InsSnap[];
  const usuarioId  = (session.user as { id?: string }).id ?? "sistema";

  // Snapshot actual antes de restaurar
  const [matsActuales, insActuales, ultimaVersion] = await Promise.all([
    prisma.despieceMaterial.findMany({ where: { muebleId }, orderBy: { orden: "asc" } }),
    prisma.despieceInsumo.findMany(  { where: { muebleId }, orderBy: { orden: "asc" } }),
    prisma.versionDespiece.findFirst({ where: { muebleId }, orderBy: { numeroVersion: "desc" } }),
  ]);
  const numeroVersion = (ultimaVersion?.numeroVersion ?? 0) + 1;

  const costoTotal =
    materiales.reduce((s, m) => s + Number(m.costoTotal ?? 0), 0) +
    insumos.reduce(   (s, i) => s + Number(i.costoTotal ?? 0), 0);

  await prisma.$transaction(async (tx) => {
    // Guardar estado actual como nueva versión
    if (matsActuales.length > 0 || insActuales.length > 0) {
      await tx.versionDespiece.create({
        data: {
          muebleId,
          numeroVersion,
          usuarioId,
          motivo: `Restaurado a v${version.numeroVersion}`,
          snapshotMateriales: matsActuales as object[],
          snapshotInsumos:    insActuales  as object[],
        },
      });
    }

    await tx.despieceMaterial.deleteMany({ where: { muebleId } });
    await tx.despieceInsumo.deleteMany(  { where: { muebleId } });

    if (materiales.length > 0) {
      await tx.despieceMaterial.createMany({
        data: materiales.map((m, i) => ({
          muebleId,
          insumoId:      m.insumoId ?? null,
          productoNombre: m.productoNombre,
          medidas:        m.medidas ?? null,
          cantidad:       new Decimal(m.cantidad),
          costoUnitario:  new Decimal(m.costoUnitario),
          costoTotal:     new Decimal(m.costoTotal),
          orden:          m.orden ?? i,
        })),
      });
    }
    if (insumos.length > 0) {
      await tx.despieceInsumo.createMany({
        data: insumos.map((ins, i) => ({
          muebleId,
          insumoId:     ins.insumoId ?? null,
          descripcion:  ins.descripcion,
          cantidad:     new Decimal(ins.cantidad),
          costoUnitario:new Decimal(ins.costoUnitario),
          costoTotal:   new Decimal(ins.costoTotal),
          orden:        ins.orden ?? i,
        })),
      });
    }

    await tx.mueble.update({
      where: { id: muebleId },
      data: { costoActual: new Decimal(costoTotal) },
    });
  });

  registrarLog({
    usuarioId,
    accion: "DESPIECE_RESTAURADO",
    entidad: "Mueble",
    entidadId: muebleId,
    datosNuevos: { versionRestaurada: version.numeroVersion, costoTotal },
  });

  return NextResponse.json({ ok: true, costoTotal });
}
