import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResetMinutes, getClientIp } from "@/lib/rate-limit";

const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_PER_EMAIL = 5; // per email+IP combo
const LOGIN_MAX_PER_IP = 30; // across all emails from one IP — slows down credential spraying

// Mirrors the Career Transition project's "app refuses to start if
// SECRET_KEY is absent" control — without this, NextAuth falls back to an
// insecure derived secret rather than failing loudly.
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Generate one with: " +
      "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\" " +
      "and add it to .env (see .env.example)."
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();
        const ip = getClientIp(req.headers ?? {});
        const ipKey = `login:ip:${ip}`;
        const emailKey = `login:email:${email}:${ip}`;

        // Order matters: always tick both counters (don't short-circuit on
        // the first failure) so a caller can't keep one window artificially
        // fresh by tripping the other first.
        const ipOk = checkRateLimit(ipKey, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS);
        const emailOk = checkRateLimit(emailKey, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS);
        if (!ipOk || !emailOk) {
          const minutes = Math.max(rateLimitResetMinutes(ipKey), rateLimitResetMinutes(emailKey));
          throw new Error(
            `Too many sign-in attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`
          );
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.passwordHash || user.status !== "active") return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = (user as { id: string }).id;
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword;
      }
      // Re-read from the DB after the change-password flow clears the flag,
      // so the JWT doesn't keep forcing the redirect for the rest of the session.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (fresh) token.mustChangePassword = fresh.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
};
