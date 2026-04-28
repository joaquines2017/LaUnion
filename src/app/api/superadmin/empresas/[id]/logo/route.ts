import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: "Formato no permitido" }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "public", "uploads", "empresas", id);
  await mkdir(dir, { recursive: true });

  // Eliminar logo anterior si existe
  const empresa = await prisma.empresa.findUnique({ where: { id }, select: { logoUrl: true } });
  if (empresa?.logoUrl) {
    const oldPath = path.join(process.cwd(), "public", empresa.logoUrl);
    await unlink(oldPath).catch(() => null);
  }

  const filename = `logo${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const logoUrl = `/uploads/empresas/${id}/${filename}`;
  await prisma.empresa.update({ where: { id }, data: { logoUrl } });

  return NextResponse.json({ logoUrl });
}
