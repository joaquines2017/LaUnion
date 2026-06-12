import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { estaBloqueado, registrarIntentoFallido, limpiarIntentos } from "@/lib/rate-limit";

// RNFS-006: la política de 8 caracteres + complejidad se exige al crear o
// cambiar contraseñas (ver src/lib/password.ts). Aquí se mantiene un mínimo
// más bajo para no bloquear el login de cuentas existentes creadas antes de
// esta política; la seguridad del login se refuerza con bcrypt + rate
// limiting (RNFS-002), no con la validación de formato del input.
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// RNFS-002: código de error distinguible para que el formulario de login
// muestre un mensaje específico cuando se supera el límite de intentos.
class TooManyAttemptsError extends CredentialsSignin {
  code = "too-many-attempts";
}

function obtenerIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const ip = obtenerIp(request);
        if (estaBloqueado(ip)) throw new TooManyAttemptsError();

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          registrarIntentoFallido(ip);
          return null;
        }

        const { email, password } = parsed.data;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
        });

        if (!usuario || usuario.estado !== "activo") {
          registrarIntentoFallido(ip);
          return null;
        }

        const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
        if (!passwordOk) {
          registrarIntentoFallido(ip);
          return null;
        }

        limpiarIntentos(ip);

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombreUsuario,
          role: usuario.rol,
          empresaId: usuario.empresaId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.empresaId = (user as { empresaId?: string | null }).empresaId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { empresaId?: string | null }).empresaId = token.empresaId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutos de inactividad
  },
  trustHost: true,
});
