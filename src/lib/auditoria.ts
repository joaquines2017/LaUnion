import { prisma } from "@/lib/prisma";

export async function registrarLog(opts: {
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  datosAnteriores?: unknown;
  datosNuevos?: unknown;
}) {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioId: opts.usuarioId,
        accion: opts.accion,
        entidad: opts.entidad,
        entidadId: opts.entidadId,
        datosAnteriores: opts.datosAnteriores ? (opts.datosAnteriores as object) : undefined,
        datosNuevos: opts.datosNuevos ? (opts.datosNuevos as object) : undefined,
      },
    });
  } catch {
    // El log nunca debe romper el flujo principal
  }
}
