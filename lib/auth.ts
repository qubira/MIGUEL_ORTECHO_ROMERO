import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auditLog";
import { getClientIp, getUserAgent } from "@/lib/requestMeta";
import { registerFailedLogin, clearLoginFailures, minutesRemaining } from "@/lib/loginLockout";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username.toLowerCase().trim() },
        });
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          const minutes = minutesRemaining(user.lockedUntil);
          throw new Error(
            `Cuenta bloqueada temporalmente por varios intentos fallidos. Intenta de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`
          );
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          const lockedUntil = await registerFailedLogin(user);
          if (lockedUntil) {
            const minutes = minutesRemaining(lockedUntil);
            throw new Error(
              `Demasiados intentos fallidos. Tu cuenta quedó bloqueada temporalmente por ${minutes} minutos.`
            );
          }
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await clearLoginFailures(user.id);
        }

        await logAudit({
          action: "LOGIN",
          actorId: user.id,
          detail: `Inicio de sesión como ${user.username}`,
          ip: getClientIp(req?.headers),
          userAgent: getUserAgent(req?.headers),
        });

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
