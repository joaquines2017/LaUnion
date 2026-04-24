import { prisma } from "@/lib/prisma";

const MEDIDAS_RE = /^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)$/;

export interface MuebleRef {
  id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
}

export interface FilaCorte {
  id: string;
  anchoCm: number;
  altoCm: number;
  espesormm: number | null;
  cantidad: number;   // total de piezas sumando todos los muebles
  pieza: string;
  insumo: string | null;
  muebles: MuebleRef[];
}

export type SortField = "anchoCm" | "altoCm" | "cantidad" | "pieza";
export type SortDir   = "asc" | "desc";
export interface SortKey { field: SortField; dir: SortDir }

export function parseSortKeys(param: string | null): SortKey[] {
  if (!param) return [{ field: "anchoCm", dir: "desc" }, { field: "altoCm", dir: "desc" }];
  return param.split(",").map((s) => {
    const [field, dir] = s.split(":");
    return { field: field as SortField, dir: (dir ?? "desc") as SortDir };
  });
}

export function sortFilas(filas: FilaCorte[], keys: SortKey[]): FilaCorte[] {
  return [...filas].sort((a, b) => {
    for (const { field, dir } of keys) {
      const va = a[field];
      const vb = b[field];
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va ?? "").localeCompare(String(vb ?? ""), "es");
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

export async function getListaCorte(filters?: {
  muebleId?: string;
  insumoId?: string;
}): Promise<FilaCorte[]> {
  const materiales = await prisma.despieceMaterial.findMany({
    where: {
      medidas: { not: null },
      mueble: { estado: "activo" },
      ...(filters?.muebleId ? { muebleId: filters.muebleId } : {}),
      ...(filters?.insumoId ? { insumoId: filters.insumoId } : {}),
    },
    select: {
      id: true,
      productoNombre: true,
      medidas: true,
      cantidad: true,
      insumo: { select: { descripcion: true, espesormm: true } },
      mueble: { select: { id: true, codigo: true, nombre: true } },
    },
    orderBy: [{ mueble: { codigo: "asc" } }, { orden: "asc" }],
  });

  const grupos = new Map<string, {
    id: string;
    anchoCm: number;
    altoCm: number;
    espesormm: number | null;
    pieza: string;
    insumo: string | null;
    cantidadTotal: number;
    muebles: MuebleRef[];
  }>();

  for (const m of materiales) {
    const raw = (m.medidas ?? "").trim().replace(/,/g, ".");
    const match = raw.match(MEDIDAS_RE);
    if (!match) continue;

    const anchoCm  = parseFloat(match[1]);
    const altoCm   = parseFloat(match[2]);
    const cantidad = Number(m.cantidad);
    const insumo   = m.insumo?.descripcion ?? null;
    const pieza    = m.productoNombre;
    const key      = `${anchoCm}|${altoCm}|${pieza}|${insumo ?? ""}`;

    if (!grupos.has(key)) {
      grupos.set(key, {
        id: m.id,
        anchoCm,
        altoCm,
        espesormm: m.insumo?.espesormm ?? null,
        pieza,
        insumo,
        cantidadTotal: 0,
        muebles: [],
      });
    }
    const g = grupos.get(key)!;
    g.cantidadTotal += cantidad;
    g.muebles.push({ id: m.mueble.id, codigo: m.mueble.codigo, nombre: m.mueble.nombre, cantidad });
  }

  return Array.from(grupos.values()).map((g) => ({
    id: g.id,
    anchoCm: g.anchoCm,
    altoCm: g.altoCm,
    espesormm: g.espesormm,
    cantidad: g.cantidadTotal,
    pieza: g.pieza,
    insumo: g.insumo,
    muebles: g.muebles,
  }));
}
