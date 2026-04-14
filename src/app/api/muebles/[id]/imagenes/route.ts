import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const mueble = await prisma.mueble.findUnique({ where: { id } });
  if (!mueble) return NextResponse.json({ error: "Mueble no encontrado" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: "Formato no permitido" }, { status: 400 });
  }

  // Determinar el orden (el próximo disponible)
  const count = await prisma.muebleImagen.count({ where: { muebleId: id } });

  const filename = `${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "muebles", id);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/muebles/${id}/${filename}`;

  const imagen = await prisma.muebleImagen.create({
    data: {
      muebleId: id,
      filename,
      url,
      orden: count,
    },
  });

  return NextResponse.json(imagen, { status: 201 });
}
