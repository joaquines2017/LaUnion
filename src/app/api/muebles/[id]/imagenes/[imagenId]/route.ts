import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imagenId: string }> }
) {
  const { imagenId } = await params;

  const imagen = await prisma.muebleImagen.findUnique({ where: { id: imagenId } });
  if (!imagen) {
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
