"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, X,
  Download, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import type { ResultadoImportacion } from "@/lib/importar-excel";

type Estado = "idle" | "preview" | "importando" | "completado";

interface Contadores {
  proveedores: number;
  catInsumos: number;
  catMuebles: number;
  insumos: number;
  precios: number;
  muebles: number;
  despieMateriales: number;
  despieInsumos: number;
  residuales: number;
}

// ─── Tabla de formato de hoja ────────────────────────────────────────────────

interface ColDef { col: string; req: boolean; nota?: string }

function TablaFormato({ nombre, cols, nota }: { nombre: string; cols: ColDef[]; nota?: string }) {
  return (
    <div className="p-3 bg-secondary/40 rounded-lg border border-border">
      <div className="font-semibold text-foreground text-xs mb-2">
        <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-1.5">{nombre}</span>
      </div>
      <table className="text-xs w-full text-muted-foreground">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1 font-semibold text-foreground">Columna</th>
            <th className="text-left py-1 font-semibold text-foreground">¿Requerida?</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {cols.map(({ col, req, nota: cn }) => (
            <tr key={col}>
              <td className="py-1 font-mono">
                {col}
                {cn ? <span className="text-muted-foreground/60 font-sans ml-1.5">{cn}</span> : null}
              </td>
              <td className="py-1">
                {req ? <span className="text-amber-600 font-medium">Sí</span> : "No"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {nota && <p className="text-xs text-muted-foreground mt-1.5 italic">{nota}</p>}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function PaginaImportar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>("idle");
  const [preview, setPreview] = useState<ResultadoImportacion | null>(null);
  const [contadores, setContadores] = useState<Contadores | null>(null);
  const [erroresFinal, setErroresFinal] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [formatoExpandido, setFormatoExpandido] = useState(false);

  function onArchivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f);
    setPreview(null);
    setEstado("idle");
    setContadores(null);
    setErroresFinal([]);
  }

  function limpiar() {
    setArchivo(null);
    setPreview(null);
    setEstado("idle");
    setContadores(null);
    setErroresFinal([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handlePreview() {
    if (!archivo) return;
    setCargando(true);
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("preview", "true");
    const res = await fetch("/api/importar", { method: "POST", body: fd });
    setCargando(false);
    if (!res.ok) { toast.error("Error al leer el archivo"); return; }
    const data: ResultadoImportacion = await res.json();
    setPreview(data);
    setEstado("preview");
  }

  async function handleImportar() {
    if (!archivo) return;
    setCargando(true);
    setEstado("importando");
    const fd = new FormData();
    fd.append("archivo", archivo);
    const res = await fetch("/api/importar", { method: "POST", body: fd });
    setCargando(false);
    if (!res.ok) { toast.error("Error en la importación"); setEstado("preview"); return; }
    const data = await res.json();
    setContadores(data.contadores);
    setErroresFinal(data.errores ?? []);
    setEstado("completado");
    const total = Object.values(data.contadores as Contadores).reduce(
      (s: number, n: number) => s + n,
      0
    );
    toast.success(`Importación completa: ${total} registros procesados`);
    router.refresh();
  }

  // Totales para el preview
  const totalesPreview = preview
    ? {
        proveedores: preview.proveedores.filter((r) => !r.error).length,
        catInsumos: preview.catInsumos.filter((r) => !r.error).length,
        insumos: preview.insumos.filter((r) => !r.error).length,
        precios: preview.precios.filter((r) => !r.error).length,
        catMuebles: preview.catMuebles.filter((r) => !r.error).length,
        muebles: preview.muebles.filter((r) => !r.error).length,
        despieMat:
          preview.despieMateriales.filter((r) => !r.error).length +
          preview.despiece.filter((r) => !r.error && r.tipo === "material").length,
        despieIns:
          preview.despieInsumos.filter((r) => !r.error).length +
          preview.despiece.filter((r) => !r.error && r.tipo === "insumo").length,
        residuales: preview.residuales.filter((r) => !r.error).length,
        errores: [
          ...preview.proveedores, ...preview.catInsumos, ...preview.insumos,
          ...preview.precios, ...preview.catMuebles, ...preview.muebles,
          ...preview.despieMateriales, ...preview.despieInsumos,
          ...preview.despiece, ...preview.residuales,
        ].filter((r) => r.error).length,
      }
    : null;

  const totalPreviewValidos = totalesPreview
    ? Object.entries(totalesPreview)
        .filter(([k]) => k !== "errores")
        .reduce((s, [, v]) => s + v, 0)
    : 0;

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Descargar plantilla */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          El archivo puede contener una o más hojas según lo que quieras importar.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/importar/plantilla" download>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Descargar plantilla
          </a>
        </Button>
      </div>

      {/* Formato expandible */}
      <Card>
        <CardHeader className="pb-2">
          <button
            type="button"
            className="flex items-center justify-between w-full text-left"
            onClick={() => setFormatoExpandido((v) => !v)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Formato de las hojas
            </CardTitle>
            {formatoExpandido
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          <CardDescription>
            Cada hoja se detecta por su nombre (sin distinción de mayúsculas ni acentos).
            Las columnas también se detectan automáticamente por nombre aproximado.
          </CardDescription>
        </CardHeader>

        {formatoExpandido && (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <TablaFormato
                nombre="Proveedores"
                cols={[
                  { col: "nombre", req: true },
                  { col: "cuit", req: false },
                  { col: "telefono", req: false },
                  { col: "email", req: false },
                  { col: "direccion", req: false },
                  { col: "observaciones", req: false },
                ]}
              />
              <TablaFormato
                nombre="CatInsumos"
                cols={[
                  { col: "nombre", req: true },
                  { col: "descripcion", req: false },
                ]}
                nota="Categorías de insumo"
              />
              <TablaFormato
                nombre="Insumos"
                cols={[
                  { col: "codigo", req: true },
                  { col: "descripcion", req: true },
                  { col: "categoria", req: true },
                  { col: "unidad", req: true, nota: "unidad/placa/metro/kilo/…" },
                  { col: "espesor_mm", req: false, nota: "solo placas" },
                  { col: "alto_m", req: false, nota: "solo placas" },
                  { col: "ancho_m", req: false, nota: "solo placas" },
                  { col: "precio_base", req: false },
                ]}
              />
              <TablaFormato
                nombre="Precios"
                cols={[
                  { col: "codigo_insumo", req: true },
                  { col: "proveedor", req: true },
                  { col: "precio", req: true },
                ]}
              />
              <TablaFormato
                nombre="CatMuebles"
                cols={[
                  { col: "nombre", req: true },
                ]}
                nota="Categorías de mueble"
              />
              <TablaFormato
                nombre="Muebles"
                cols={[
                  { col: "codigo", req: true, nota: "ej: 05-147-000" },
                  { col: "nombre", req: true },
                  { col: "categoria", req: false },
                ]}
              />
              <TablaFormato
                nombre="DespiMat"
                cols={[
                  { col: "codigo_mueble", req: true },
                  { col: "codigo_insumo", req: false },
                  { col: "descripcion", req: true, nota: "nombre de la pieza" },
                  { col: "largo_cm", req: false },
                  { col: "ancho_cm", req: false },
                  { col: "cantidad", req: false, nota: "default: 1" },
                  { col: "precio_unitario", req: false },
                ]}
                nota="Despiece — placas y materiales"
              />
              <TablaFormato
                nombre="DespiInsumos"
                cols={[
                  { col: "codigo_mueble", req: true },
                  { col: "codigo_insumo", req: false },
                  { col: "descripcion", req: true },
                  { col: "cantidad", req: false, nota: "default: 1" },
                  { col: "precio_unitario", req: false },
                ]}
                nota="Despiece — herrajes, gastos, etc."
              />
              <TablaFormato
                nombre="Residuales"
                cols={[
                  { col: "codigo_insumo", req: true },
                  { col: "alto_cm", req: true },
                  { col: "ancho_cm", req: true },
                  { col: "cantidad", req: false, nota: "default: 1" },
                  { col: "nota", req: false },
                ]}
                nota="Retazos disponibles"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Upload */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                archivo
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-secondary/30"
              }`}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={onArchivoChange}
                className="hidden"
              />
              {archivo ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <div className="font-medium text-foreground">{archivo.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(archivo.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); limpiar(); }}
                    className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground/60" />
                  <div className="text-sm text-muted-foreground">
                    Hacé clic o arrastrá un archivo <strong>.xlsx</strong>
                  </div>
                </div>
              )}
            </div>

            {archivo && estado === "idle" && (
              <Button onClick={handlePreview} disabled={cargando} className="w-full">
                {cargando ? "Leyendo archivo…" : "Vista previa"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {estado === "preview" && preview && totalesPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa — registros detectados</CardTitle>
            <CardDescription>Revisá los datos antes de confirmar la importación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { label: "Proveedores", count: totalesPreview.proveedores, color: "blue" },
                { label: "Cat. insumos", count: totalesPreview.catInsumos, color: "blue" },
                { label: "Insumos", count: totalesPreview.insumos, color: "blue" },
                { label: "Precios", count: totalesPreview.precios, color: "blue" },
                { label: "Cat. muebles", count: totalesPreview.catMuebles, color: "blue" },
                { label: "Muebles", count: totalesPreview.muebles, color: "emerald" },
                { label: "Despi. mat.", count: totalesPreview.despieMat, color: "emerald" },
                { label: "Despi. ins.", count: totalesPreview.despieIns, color: "emerald" },
                { label: "Residuales", count: totalesPreview.residuales, color: "emerald" },
                { label: "Con error", count: totalesPreview.errores, color: "red" },
              ].map(({ label, count, color }) => (
                <div key={label} className={`p-2.5 rounded-lg border text-center ${
                  color === "red" && count > 0 ? "bg-red-50 border-red-100" :
                  color === "red" ? "bg-secondary/40 border-border" :
                  color === "emerald" ? "bg-emerald-50 border-emerald-100" :
                  "bg-blue-50 border-blue-100"
                }`}>
                  <div className={`text-xl font-bold tabular-nums ${
                    color === "red" && count > 0 ? "text-red-600" :
                    color === "red" ? "text-muted-foreground" :
                    color === "emerald" ? "text-emerald-700" :
                    "text-blue-700"
                  }`}>{count}</div>
                  <div className={`text-xs mt-0.5 ${
                    color === "red" && count > 0 ? "text-red-500" :
                    color === "red" ? "text-muted-foreground" :
                    color === "emerald" ? "text-emerald-600" :
                    "text-blue-600"
                  }`}>{label}</div>
                </div>
              ))}
            </div>

            {(preview.errores.length > 0 || totalesPreview.errores > 0) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1 max-h-40 overflow-y-auto">
                {[
                  ...preview.errores,
                  ...[
                    ...preview.proveedores, ...preview.catInsumos, ...preview.insumos,
                    ...preview.precios, ...preview.catMuebles, ...preview.muebles,
                    ...preview.despieMateriales, ...preview.despieInsumos,
                    ...preview.despiece, ...preview.residuales,
                  ]
                    .filter((r) => r.error)
                    .map((r) => `Fila ${r.fila}: ${r.error}`),
                ].map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {e}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleImportar} disabled={cargando || totalPreviewValidos === 0}>
                {cargando ? "Importando…" : `Confirmar (${totalPreviewValidos} registros)`}
              </Button>
              <Button variant="outline" onClick={limpiar}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {estado === "completado" && contadores && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-3 flex-1">
                <div className="font-semibold text-foreground">Importación completada</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {(
                    [
                      ["Proveedores", contadores.proveedores],
                      ["Cat. insumos", contadores.catInsumos],
                      ["Cat. muebles", contadores.catMuebles],
                      ["Insumos", contadores.insumos],
                      ["Precios", contadores.precios],
                      ["Muebles", contadores.muebles],
                      ["Despi. materiales", contadores.despieMateriales],
                      ["Despi. insumos", contadores.despieInsumos],
                      ["Residuales", contadores.residuales],
                    ] as [string, number][]
                  )
                    .filter(([, n]) => n > 0)
                    .map(([label, n]) => (
                      <div key={label} className="flex items-center justify-between p-2 bg-secondary/40 rounded">
                        <span className="text-muted-foreground text-xs">{label}</span>
                        <Badge variant="secondary" className="font-mono">{n}</Badge>
                      </div>
                    ))}
                </div>

                {erroresFinal.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-destructive">Filas omitidas por error:</p>
                    {erroresFinal.map((e, i) => (
                      <div key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {e}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  {contadores.muebles > 0 && (
                    <Button size="sm" onClick={() => router.push("/muebles")}>Ver muebles</Button>
                  )}
                  {contadores.insumos > 0 && (
                    <Button size="sm" variant="outline" onClick={() => router.push("/insumos")}>
                      Ver insumos
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={limpiar}>
                    Importar otro archivo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
