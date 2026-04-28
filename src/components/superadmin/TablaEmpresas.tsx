"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Pencil, PowerOff, Check, X, Upload, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatearFecha } from "@/lib/formato";

export interface EmpresaItem {
  id: string;
  nombre: string;
  logoUrl: string | null;
  dominio: string | null;
  estado: string;
  createdAt: string;
  _count: { usuarios: number };
}

interface Props { empresas: EmpresaItem[] }

export function TablaEmpresas({ empresas: inicial }: Props) {
  const router = useRouter();
  const [empresas, setEmpresas] = useState(inicial);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDominio, setEditDominio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState<string | null>(null);
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const [logoEmpresaId, setLogoEmpresaId] = useState<string | null>(null);

  function iniciarEdicion(e: EmpresaItem) {
    setEditId(e.id);
    setEditNombre(e.nombre);
    setEditDominio(e.dominio ?? "");
  }

  async function guardar(id: string) {
    setGuardando(true);
    const res = await fetch(`/api/superadmin/empresas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre, dominio: editDominio || null }),
    });
    if (res.ok) {
      const actualizada = await res.json();
      setEmpresas((prev) => prev.map((e) => e.id === id ? { ...e, ...actualizada } : e));
      setEditId(null);
      toast.success("Empresa actualizada");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al actualizar");
    }
    setGuardando(false);
  }

  async function desactivar(e: EmpresaItem) {
    if (!confirm(`¿Desactivar "${e.nombre}"? Sus usuarios no podrán ingresar.`)) return;
    const res = await fetch(`/api/superadmin/empresas/${e.id}`, { method: "DELETE" });
    if (res.ok) {
      setEmpresas((prev) => prev.map((x) => x.id === e.id ? { ...x, estado: "inactivo" } : x));
      toast.success("Empresa desactivada");
      router.refresh();
    } else {
      toast.error("Error al desactivar");
    }
  }

  async function subirLogo(empresaId: string, file: File) {
    setSubiendoLogo(empresaId);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/superadmin/empresas/${empresaId}/logo`, { method: "POST", body: fd });
    if (res.ok) {
      const { logoUrl } = await res.json();
      setEmpresas((prev) => prev.map((e) => e.id === empresaId ? { ...e, logoUrl } : e));
      toast.success("Logo actualizado");
    } else {
      toast.error("Error al subir logo");
    }
    setSubiendoLogo(null);
  }

  return (
    <>
      <input
        ref={inputLogoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && logoEmpresaId) subirLogo(logoEmpresaId, file);
          e.target.value = "";
        }}
      />

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="na-table">
          <thead>
            <tr>
              <th className="w-16">Logo</th>
              <th>Empresa</th>
              <th>Dominio</th>
              <th className="text-center w-24">Usuarios</th>
              <th className="text-center w-24">Estado</th>
              <th className="w-32">Creada</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Sin empresas registradas.</td></tr>
            )}
            {empresas.map((e) => {
              const enEdicion = editId === e.id;
              return (
                <tr key={e.id}>
                  {/* Logo */}
                  <td>
                    <button
                      className="relative group w-10 h-10 rounded-lg overflow-hidden border border-border bg-secondary/40 flex items-center justify-center"
                      onClick={() => { setLogoEmpresaId(e.id); inputLogoRef.current?.click(); }}
                      title="Cambiar logo"
                      disabled={subiendoLogo === e.id}
                    >
                      {e.logoUrl
                        ? <img src={e.logoUrl} alt={e.nombre} className="w-full h-full object-contain" /> /* eslint-disable-line @next/next/no-img-element */
                        : <span className="text-lg font-bold text-muted-foreground/40">{e.nombre[0]}</span>
                      }
                      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="h-3.5 w-3.5 text-white" />
                      </span>
                    </button>
                  </td>

                  {/* Nombre */}
                  <td>
                    {enEdicion
                      ? <Input value={editNombre} onChange={(ev) => setEditNombre(ev.target.value)} className="h-7 text-sm" autoFocus />
                      : <span className="font-medium text-sm">{e.nombre}</span>
                    }
                  </td>

                  {/* Dominio */}
                  <td>
                    {enEdicion
                      ? <Input value={editDominio} onChange={(ev) => setEditDominio(ev.target.value)} className="h-7 text-sm" placeholder="empresa.ddns.net" />
                      : e.dominio
                        ? <span className="flex items-center gap-1 text-sm text-muted-foreground"><Globe className="h-3 w-3" />{e.dominio}</span>
                        : <span className="text-muted-foreground/40 text-sm">—</span>
                    }
                  </td>

                  {/* Usuarios */}
                  <td className="text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />{e._count.usuarios}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                      e.estado === "activo"
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-muted-foreground bg-secondary border-border"
                    }`}>
                      {e.estado === "activo" ? "Activa" : "Inactiva"}
                    </span>
                  </td>

                  {/* Fecha */}
                  <td className="text-xs text-muted-foreground">{formatearFecha(new Date(e.createdAt))}</td>

                  {/* Acciones */}
                  <td className="text-right">
                    {enEdicion ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => guardar(e.id)} disabled={guardando}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-secondary"
                          onClick={() => setEditId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => iniciarEdicion(e)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {e.estado === "activo" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => desactivar(e)} title="Desactivar">
                            <PowerOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
