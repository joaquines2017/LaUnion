"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";
import type { ResultadoImportacion } from "@/lib/importar-excel";

type Estado = "idle" | "preview" | "importando" | "completado";

interface ResultadoFinal {
  muebles: { creados: number; saltados: number };
  despiece: { creados: number };
  errores: string[];
}

export function PaginaImportar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>("idle");
  const [preview, setPreview] = useState<ResultadoImportacion | null>(null);
  const [resultado, setResultado] = useState<ResultadoFinal | null>(null);
  const [cargando, setCargando] = useState(false);

  function onArchivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f);
    setPreview(null);
    setEstado("idle");
    setResultado(null);
  }

  function limpiar() {
    setArchivo(null);
    setPreview(null);
    setEstado("idle");
    setResultado(null);
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

    if (!res.ok) {
      toast.error("Error al leer el archivo");
      return;
    }

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

    if (!res.ok) {
      toast.error("Error en la importación");
      setEstado("preview");
      return;
    }

    const data: ResultadoFinal = await res.json();
    setResultado(data);
    setEstado("completado");
    toast.success(
      `Importación completa: ${data.muebles.creados} muebles, ${data.despiece.creados} ítems de despiece`
    );
    router.refresh();
  }

  const mueblesValidos = preview?.muebles.filter((m) => !m.error).length ?? 0;
  const mueblesConError = preview?.muebles.filter((m) => m.error).length ?? 0;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Formato esperado del archivo
          </CardTitle>
          <CardDescription>
            El archivo .xlsx debe tener al menos una hoja con columnas de muebles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-secondary/40 rounded-lg border border-border">
              <div className="font-semibold text-foreground mb-2">
                Hoja 1 — Muebles (obligatoria)
              </div>
              <table className="text-xs w-full text-muted-foreground">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 font-semibold text-foreground">Columna</th>
                    <th className="text-left py-1 font-semibold text-foreground">Requerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    ["Código", "Sí"],
                    ["Nombre", "Sí"],
                    ["Categoría", "No"],
                  ].map(([col, req]) => (
                    <tr key={col}>
                      <td className="py-1 font-mono">{col}</td>
                      <td className="py-1">{req}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-secondary/40 rounded-lg border border-border">
              <div className="font-semibold text-foreground mb-2">
                Hoja 2 — Despiece (opcional)
              </div>
              <table className="text-xs w-full text-muted-foreground">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 font-semibold text-foreground">Columna</th>
                    <th className="text-left py-1 font-semibold text-foreground">Requerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    ["Código Mueble", "Sí"],
                    ["Descripción", "Sí"],
                    ["Tipo", "No"],
                    ["Código Insumo", "No"],
                    ["Medidas", "No"],
                    ["Cantidad", "No"],
                    ["Precio", "No"],
                  ].map(([col, req]) => (
                    <tr key={col}>
                      <td className="py-1 font-mono">{col}</td>
                      <td className="py-1">{req}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Los nombres de columna se detectan automáticamente (sin distinción de mayúsculas ni acentos).
            Si un mueble con el mismo código ya existe, se actualizará su nombre y categoría.
          </p>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Zona de drop / selector */}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      limpiar();
                    }}
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
      {estado === "preview" && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa</CardTitle>
            <CardDescription>
              Revisá los datos antes de confirmar la importación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                <div className="text-2xl font-bold text-emerald-700 tabular-nums">
                  {mueblesValidos}
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  muebles listos para importar
                </div>
              </div>
              <div className={`p-3 rounded-lg text-center border ${mueblesConError > 0 ? "bg-red-50 border-red-100" : "bg-secondary/40 border-border"}`}>
                <div className={`text-2xl font-bold tabular-nums ${mueblesConError > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {mueblesConError}
                </div>
                <div className={`text-xs mt-0.5 ${mueblesConError > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                  filas con error (se omitirán)
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-700 tabular-nums">
                  {preview.despiece.length}
                </div>
                <div className="text-xs text-blue-600 mt-0.5">
                  ítems de despiece
                </div>
              </div>
            </div>

            {/* Errores del parser */}
            {preview.errores.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                {preview.errores.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {e}
                  </div>
                ))}
              </div>
            )}

            {/* Tabla preview muebles */}
            {preview.muebles.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-secondary/80">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Fila</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Código</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Nombre</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Categoría</th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {preview.muebles.slice(0, 50).map((m) => (
                      <tr key={m.fila} className={m.error ? "bg-red-50/60" : ""}>
                        <td className="px-3 py-1.5 text-muted-foreground">{m.fila}</td>
                        <td className="px-3 py-1.5 font-mono">{m.codigo || "—"}</td>
                        <td className="px-3 py-1.5">{m.nombre || "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{m.categoria || "—"}</td>
                        <td className="px-3 py-1.5 text-center">
                          {m.error ? (
                            <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
                              {m.error}
                            </Badge>
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                    {preview.muebles.length > 50 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-center text-muted-foreground">
                          … y {preview.muebles.length - 50} filas más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleImportar}
                disabled={cargando || mueblesValidos === 0}
              >
                {cargando
                  ? "Importando…"
                  : `Confirmar importación (${mueblesValidos} muebles)`}
              </Button>
              <Button variant="outline" onClick={limpiar}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado final */}
      {estado === "completado" && resultado && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div className="font-semibold text-foreground">
                  Importación completada
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    Muebles creados/actualizados:{" "}
                    <span className="font-semibold text-foreground">
                      {resultado.muebles.creados}
                    </span>
                  </div>
                  {resultado.despiece.creados > 0 && (
                    <div>
                      Ítems de despiece importados:{" "}
                      <span className="font-semibold text-foreground">
                        {resultado.despiece.creados}
                      </span>
                    </div>
                  )}
                  {resultado.muebles.saltados > 0 && (
                    <div className="text-orange-600">
                      Omitidos por error: {resultado.muebles.saltados}
                    </div>
                  )}
                </div>
                {resultado.errores.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {resultado.errores.map((e, i) => (
                      <div key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {e}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button
                    size="sm"
                    onClick={() => router.push("/muebles")}
                  >
                    Ver muebles
                  </Button>
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
