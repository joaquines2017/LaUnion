import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, LogOut } from "lucide-react";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "superadmin") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar superadmin */}
      <aside className="flex flex-col w-[220px] h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <span className="block text-lg font-bold text-white tracking-tight">LaUnion</span>
          <span className="block text-[11px] text-sidebar-foreground/60 mt-0.5">Panel Superadmin</span>
        </div>
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Gestión
          </p>
          <Link
            href="/superadmin"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Building2 className="h-4 w-4 shrink-0" />
            Empresas
          </Link>
        </nav>
        <div className="px-3 py-3 border-t border-sidebar-border">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-7">{children}</div>
      </main>
    </div>
  );
}
