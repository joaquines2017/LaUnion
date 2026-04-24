"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, Check, X, KeyRound, ShieldCheck, Shield, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Rol = "administrador" | "operador" | "lectura";
type Estado = "activo" | "inactivo";

export interface UsuarioItem {
  id: string;
  nombreUsuario: string;
  email: string;
  rol: Rol;
  estado: Estado;
  createdAt: string;
}

const ROL_LABELS: Record<Rol, string> = {
  administrador: "Administrador",
  operador: "Operador",
  lectura: "Solo lectura",
};

const ROL_ICONS: Record<Rol, React.ElementType> = {
  administrador: ShieldCheck,
  operador: Shield,
  lectura: Eye,
};

const ROL_COLORS: Record<Rol, string> = {
  administrador: "text-violet-700 bg-violet-50 border-violet-200",
  operador: "text-blue-700 bg-blue-50 border-blue-200",
  lectura: "text-muted-foreground bg-secondary border-border",
};

interface Props {
  usuarios: UsuarioItem[];
  sesionId: string;
}

interface FormData {
  nombreUsuario: string;
  email: string;
  password: string;
  rol: Rol;
}

const FORM_VACIO: FormData = { nombreUsuario: "", email: "", password: "", rol: "operador" };

export function GestionUsuarios({ usuarios: usuariosIniciales, sesionId }: Props) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>(usuariosIniciales);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FormData & { estado: Estado }>>({});
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombreUsuario.trim() || !form.email.trim() || !form.password.trim()) return;
    setGuardandoNuevo(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const nuevo = await res.json();
      setUsuarios((prev) => [...prev, nuevo]);
      setForm(FORM_VACIO);
      toast.success("Usuario creado");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al crear usuario");
    }
    setGuardandoNuevo(false);
  }

  function iniciarEdicion(u: UsuarioItem) {
    setEditId(u.id);
    setEditForm({ nombreUsuario: u.nombreUsuario, email: u.email, rol: u.rol, estado: u.estado, password: "" });
    setMostrarPassword(false);
  }

  async function guardarEdicion(id: string) {
    setGuardandoEdit(true);
    const body: Record<string, unknown> = { ...editForm };
    if (!body.password) delete body.password;
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const actualizado = await res.json();
      setUsuarios((prev) => prev.map((u) => (u.id === id ? actualizado : u)));
      setEditId(null);
      toast.success("Usuario actualizado");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al actualizar");
    }
    setGuardandoEdit(false);
  }

  async function eliminar(u: UsuarioItem) {
    setEliminandoId(u.id);
    const res = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
      toast.success("Usuario eliminado");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al eliminar");
    }
    setEliminandoId(null);
  }

  return (
    <div className="space-y-6">
      {/* Formulario alta */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h3 className="na-card-title mb-4">Nuevo usuario</h3>
        <form onSubmit={crear} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Nombre de usuario *"
            value={form.nombreUsuario}
            onChange={(e) => setForm((f) => ({ ...f, nombreUsuario: e.target.value }))}
            required
          />
          <Input
            type="email"
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            type="password"
            placeholder="Contraseña (mín. 6 caracteres) *"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <div className="flex gap-2">
            <select
              value={form.rol}
              onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as Rol }))}
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="operador">Operador</option>
              <option value="administrador">Administrador</option>
              <option value="lectura">Solo lectura</option>
            </select>
            <Button type="submit" disabled={guardandoNuevo} className="shrink-0">
              <Plus className="h-3.5 w-3.5 mr-1" />
              {guardandoNuevo ? "…" : "Crear"}
            </Button>
          </div>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">
            {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}
          </span>
        </div>
        <table className="na-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th className="text-center">Rol</th>
              <th className="text-center">Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const enEdicion = editId === u.id;
              const RolIcon = ROL_ICONS[u.rol];
              const esSesionActual = u.id === sesionId;

              return (
                <tr key={u.id}>
                  {/* Nombre */}
                  <td>
                    {enEdicion ? (
                      <Input
                        value={editForm.nombreUsuario ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, nombreUsuario: e.target.value }))}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{u.nombreUsuario}</span>
                        {esSesionActual && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            Tú
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Email */}
                  <td>
                    {enEdicion ? (
                      <Input
                        type="email"
                        value={editForm.email ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        className="h-7 text-sm"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">{u.email}</span>
                    )}
                  </td>

                  {/* Rol */}
                  <td className="text-center">
                    {enEdicion ? (
                      <select
                        value={editForm.rol ?? u.rol}
                        onChange={(e) => setEditForm((f) => ({ ...f, rol: e.target.value as Rol }))}
                        className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="administrador">Administrador</option>
                        <option value="operador">Operador</option>
                        <option value="lectura">Solo lectura</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${ROL_COLORS[u.rol]}`}>
                        <RolIcon className="h-3 w-3" />
                        {ROL_LABELS[u.rol]}
                      </span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="text-center">
                    {enEdicion ? (
                      <select
                        value={editForm.estado ?? u.estado}
                        onChange={(e) => setEditForm((f) => ({ ...f, estado: e.target.value as Estado }))}
                        className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                        u.estado === "activo"
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-muted-foreground bg-secondary border-border"
                      }`}>
                        {u.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="text-right">
                    {enEdicion ? (
                      <div className="flex flex-col gap-1.5 items-end">
                        {/* Reset password inline */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setMostrarPassword((v) => !v)}
                          >
                            <KeyRound className="h-3 w-3" />
                            {mostrarPassword ? "Ocultar contraseña" : "Cambiar contraseña"}
                          </button>
                        </div>
                        {mostrarPassword && (
                          <Input
                            type="password"
                            placeholder="Nueva contraseña (dejar vacío = sin cambios)"
                            value={editForm.password ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                            className="h-7 text-sm w-52"
                          />
                        )}
                        <div className="flex gap-1">
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => guardarEdicion(u.id)}
                            disabled={guardandoEdit}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:bg-secondary"
                            onClick={() => setEditId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => iniciarEdicion(u)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          disabled={esSesionActual || eliminandoId === u.id}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                          onClick={() => eliminar(u)}
                          title={esSesionActual ? "No podés eliminar tu propio usuario" : "Eliminar"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
