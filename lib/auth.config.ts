import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

// Lightweight auth config — no Prisma import, safe for Edge Runtime (middleware).
// Full auth (with PrismaAdapter + Credentials provider) lives in lib/auth.ts.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
