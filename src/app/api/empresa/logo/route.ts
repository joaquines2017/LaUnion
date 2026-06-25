import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/empresa";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function getUploadsDir(): string {
  return process.env.UPLOADS_BASE_PATH ?? path.join(process.cwd(), "public", "uploads");
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase() || ".png";
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: "Formato no permitido" }, { status: 400 });
  }

  // Cache-busting via timestamp en el nombre para que el navegador recargue
  const filename = `logo-${Date.now()}${ext}`;
  const uploadsDir = getUploadsDir();
  const dir = path.join(uploadsDir, "empresa");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const logoUrl = `/api/uploads/empresa/${filename}`;

  await prisma.empresa.update({
    where: { id: ctx.empresaId },
    data: { logoUrl },
  });

  return NextResponse.json({ logoUrl }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireEmpresa();
  if (ctx instanceof NextResponse) return ctx;

  await prisma.empresa.update({
    where: { id: ctx.empresaId },
    data: { logoUrl: null },
  });

  return NextResponse.json({ ok: true });
}
