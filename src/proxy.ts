import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session;
  const pathname = request.nextUrl.pathname;

  const isLoginPage   = pathname === "/login";
  const isApiAuth     = pathname.startsWith("/api/auth");
  const isHealth      = pathname === "/api/health";
  const isSuperadmin  = pathname.startsWith("/superadmin");

  // RFO-003: el health check debe responder sin sesión (monitoreo, deploy)
  if (isApiAuth || isHealth) return NextResponse.next();

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && isLoginPage) {
    const role = (session.user as { role?: string }).role;
    return NextResponse.redirect(new URL(role === "superadmin" ? "/superadmin" : "/", request.url));
  }

  if (isLoggedIn) {
    const role = (session.user as { role?: string }).role;
    // Superadmin solo puede acceder a /superadmin y /api/superadmin
    if (role === "superadmin" && !isSuperadmin && !pathname.startsWith("/api/superadmin")) {
      return NextResponse.redirect(new URL("/superadmin", request.url));
    }
    // Usuarios de empresa NO pueden acceder a /superadmin
    if (role !== "superadmin" && isSuperadmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf)$).*)",
  ],
};
