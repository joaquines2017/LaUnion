import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Directorio persistente de uploads: variable de entorno o fallback al public/uploads
// relativo al WorkingDirectory del proceso (standalone: .next/standalone/).
function getUploadsDir(): string {
  return process.env.UPLOADS_BASE_PATH ?? path.join(process.cwd(), "public", "uploads");
}

const MIME: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".gif":  "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const uploadsDir = getUploadsDir();
  const resolved = path.resolve(uploadsDir, ...segments);

  // Prevenir path traversal
  if (!resolved.startsWith(path.resolve(uploadsDir))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Buscar el archivo: primero en UPLOADS_BASE_PATH, luego en public/uploads legacy
  const candidatos = [resolved];
  if (process.env.UPLOADS_BASE_PATH) {
    // También buscar en el public/uploads del standalone (legado)
    const legacy = path.resolve(
      path.join(process.cwd(), "public", "uploads"),
      ...segments
    );
    candidatos.push(legacy);
  }

  const filePath = candidatos.find(p => existsSync(p));
  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
