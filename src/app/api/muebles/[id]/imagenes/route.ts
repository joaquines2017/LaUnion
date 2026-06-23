import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Directorio persistente: variable de entorno o fallback al public/uploads
// del WorkingDirectory del proceso (en standalone: .next/standalone/public/uploads/).
function getUploadsDir(): string {
  return process.env.UPLOADS_BASE_PATH ?? path.join(process.cwd(), "public", "uploads");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;
  const { empresaId } = ctx;

  const { id } = await params;

  const mueble = await prisma.mueble.findFirst({ where: { id, empresaId } });
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

  const count = await prisma.muebleImagen.count({ where: { muebleId: id } });
  const filename = `${Date.now()}${ext}`;

  const uploadsDir = getUploadsDir();
  const dir = path.join(uploadsDir, "muebles", id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  // URL servida vía route handler /api/uploads/... (persiste entre deploys)
  const url = `/api/uploads/muebles/${id}/${filename}`;

  const imagen = await prisma.muebleImagen.create({
    data: { muebleId: id, filename, url, orden: count },
  });

  return NextResponse.json(imagen, { status: 201 });
}
