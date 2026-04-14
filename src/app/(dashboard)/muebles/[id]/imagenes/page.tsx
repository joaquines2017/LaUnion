import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PaginaImagenes } from "@/components/muebles/PaginaImagenes";

export default async function MuebleImagenesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mueble = await prisma.mueble.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      imagenes: { orderBy: { orden: "asc" } },
    },
  });

  if (!mueble) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link
          href={`/muebles/${id}`}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{mueble.nombre}</h1>
          <p className="text-sm text-muted-foreground font-mono">{mueble.codigo} · Imágenes</p>
        </div>
      </div>

      <PaginaImagenes muebleId={id} imagenesIniciales={mueble.imagenes} />
    </div>
  );
}
