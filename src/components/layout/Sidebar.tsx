"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  Sofa,
  BarChart3,
  Upload,
  Settings,
  LogOut,
  ChevronDown,
  Tag,
  Ruler,
  Layers,
  DollarSign,
  Scissors,
  ListOrdered,
  Users,
  ClipboardList,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavChild {
  href: string;
  label: string;
  icon?: React.ElementType;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { href: "/",            label: "Dashboard",   icon: LayoutDashboard },
  { href: "/insumos",     label: "Insumos",     icon: Package },
  { href: "/proveedores", label: "Proveedores", icon: Truck },
  { href: "/muebles",     label: "Muebles",     icon: Sofa },
  { href: "/residuales",   label: "Residuales",    icon: Scissors },
  { href: "/lista-corte", label: "Lista de Corte", icon: ListOrdered },
  {
    href: "/reportes",
    label: "Reportes",
    icon: BarChart3,
    children: [
      { href: "/reportes/costos",      label: "Lista de costos" },
      { href: "/reportes/proveedores", label: "Comparativo" },
    ],
  },
  { href: "/precios",   label: "Precios",   icon: DollarSign },
  { href: "/importar",  label: "Importar",  icon: Upload },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: Settings,
    children: [
      { href: "/configuracion",                    label: "General",              icon: Settings },
      { href: "/configuracion/categorias-mueble",  label: "Categ. muebles",       icon: Tag },
      { href: "/configuracion/categorias-insumo",  label: "Categ. insumos",       icon: Layers },
      { href: "/configuracion/unidades-medida",    label: "Unidades de medida",   icon: Ruler },
      { href: "/configuracion/usuarios",            label: "Usuarios",             icon: Users },
      { href: "/configuracion/auditoria",          label: "Auditoría",            icon: ClipboardList },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Mapa de qué secciones están expandidas (inicialmente las activas)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of navItems) {
      if (item.children && pathname.startsWith(item.href)) {
        init[item.href] = true;
      }
    }
    return init;
  });

  function toggle(href: string) {
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <aside className="flex flex-col w-[240px] h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <span className="block text-lg font-bold text-white tracking-tight">
          LaUnion
        </span>
        <span className="block text-[11px] text-sidebar-foreground/60 mt-0.5">
          Sistema de Costeo
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Menú
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, children }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            const isExpanded = expanded[href] ?? false;

            if (children) {
              return (
                <li key={href}>
                  <button
                    onClick={() => toggle(href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        isExpanded ? "rotate-180" : ""
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <ul className="mt-0.5 ml-3 pl-4 border-l border-sidebar-border space-y-0.5">
                      {children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors duration-100",
                                pathname === child.href
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              )}
                            >
                              {ChildIcon && <ChildIcon className="h-3.5 w-3.5 shrink-0" />}
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Cerrar sesión */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-100"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
