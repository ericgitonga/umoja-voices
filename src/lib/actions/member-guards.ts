import { getSession, type Session } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";

/**
 * Factored out of member-actions.ts (#139) so this admin/RBAC guard logic
 * can be unit-tested with a mocked prisma/getSession — a plain module can be
 * imported in isolation, whereas member-actions.ts's "use server" directive
 * would turn every export into a directly client-invocable Server Action.
 */

export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

/**
 * Refuses to let an admin change their own role, and refuses to leave the
 * choir with zero active admins — otherwise the last admin standing could
 * demote themselves (or another admin) and permanently lock everyone out
 * of /admin, since only an admin can promote someone back.
 */
export async function orphanAdminsError(
  session: { user: { id: string } },
  targetUserId: string
): Promise<string | null> {
  if (targetUserId === session.user.id) {
    return "You can't change your own role or status here — ask another admin.";
  }
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (target?.role === "admin" && target.status === "active") {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: "admin", status: "active", id: { not: targetUserId } },
    });
    if (otherActiveAdmins === 0) {
      return "Can't remove the last active admin.";
    }
  }
  return null;
}
