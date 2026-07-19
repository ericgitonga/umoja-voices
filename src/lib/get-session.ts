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
