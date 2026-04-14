"use client";

import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  exportParams: string;
}

export function BotonesExportacion({ exportParams }: Props) {
  const base = exportParams ? `?${exportParams}` : "";

  function descargar(url: string) {
    window.open(url, "_blank");
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => descargar(`/api/reportes/costos/excel${base}`)}
        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => descargar(`/api/reportes/costos/pdf${base}`)}
        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
      >
        <FileText className="h-3.5 w-3.5 mr-1.5" />
        PDF
      </Button>
    </div>
  );
}
