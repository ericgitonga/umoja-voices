import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type Session = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

/**
 * Replaces getServerSession(authOptions) — getClaims() verifies the JWT
 * locally (no network hop, given asymmetric signing keys) rather than
 * getUser()'s always-network-call semantics, then joins to the Prisma
 * profile row for id/name/role.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const profile = await prisma.user.findUnique({ where: { authUserId: claims.sub } });
  if (!profile) return null;

  return {
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    },
  };
}

/**
 * Page/layout-level backstop for PROTECTED_PREFIXES (#144) — proxy.ts's
 * middleware is meant to be the primary gate for these routes, but its
 * matcher deliberately exempts requests carrying a next-router-prefetch or
 * purpose:prefetch header (needed so Next's own Link prefetching doesn't
 * regenerate a CSP nonce per prefetch) — both are ordinary, client-settable
 * headers, so that exemption also silently skipped the auth check itself.
 * Every protected layout now calls this directly, independent of whether
 * middleware ran, the same way every Server Action already independently
 * calls requireAdmin() rather than trusting middleware alone.
 */
export async function requireSessionOrRedirect(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Admin-route counterpart of requireSessionOrRedirect() — see #144. */
export async function requireAdminOrRedirect(): Promise<Session> {
  const session = await requireSessionOrRedirect();
  if (session.user.role !== "admin") redirect("/songs");
  return session;
}
