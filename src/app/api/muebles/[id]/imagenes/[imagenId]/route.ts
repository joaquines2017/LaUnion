import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imagenId: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { imagenId } = await params;

  const imagen = await prisma.muebleImagen.findUnique({
    where: { id: imagenId },
    include: { mueble: { select: { empresaId: true } } },
  });
  if (!imagen || imagen.mueble.empresaId !== empresaId) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  // Eliminar archivo del disco
  const filePath = path.join(process.cwd(), "public", imagen.url);
  try {
    await unlink(filePath);
  } catch {
    // Si el archivo no existe en disco, continuamos igual
  }

  await prisma.muebleImagen.delete({ where: { id: imagenId } });

  return new NextResponse(null, { status: 204 });
}
