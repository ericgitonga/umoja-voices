"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ROLES, USER_STATUSES } from "@/lib/constants";
import { clip, oneOf } from "@/lib/validation";
import { checkRateLimit, rateLimitResetMinutes, getClientIp } from "@/lib/rate-limit";
import { appBaseUrl } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin-only and lower risk than login/forgot-password, so a looser window:
// generous enough for a legitimate bulk-invite session (a new season's
// intake), still capping abuse from one compromised admin session.
const INVITE_WINDOW_MS = 60 * 60_000; // 1 hour
const INVITE_MAX_PER_ADMIN = 20;
const INVITE_MAX_PER_IP = 40; // covers a few admins sharing an office network

// Same reasoning as invite above, same window/caps — a member rarely needs
// more than one fresh reset link at a time.
const RESET_LINK_WINDOW_MS = 60 * 60_000; // 1 hour
const RESET_LINK_MAX_PER_ADMIN = 20;
const RESET_LINK_MAX_PER_IP = 40;

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

/**
 * Creates the Supabase Auth user via the admin API and returns a
 * manually-shareable invite link — generateLink() only creates the user and
 * hands back a token, it never attempts to send email itself, so this
 * doesn't depend on Supabase's SMTP/domain setup at all (issue #34,
 * deferred). Built from `hashed_token` rather than the response's
 * `action_link`, which points at Supabase's own hosted redirect (a
 * different, hash-fragment session style than src/app/auth/confirm/route.ts
 * expects — see SKILL.md's gotchas). app_metadata.role is what
 * src/proxy.ts reads for route gating.
 */
export async function inviteMember(
  formData: FormData
): Promise<{ error?: string; inviteLink?: string }> {
  const session = await requireAdmin();

  const ip = getClientIp(await headers());
  const [adminOk, ipOk] = await Promise.all([
    checkRateLimit(`invite:admin:${session.user.id}`, INVITE_MAX_PER_ADMIN, INVITE_WINDOW_MS),
    checkRateLimit(`invite:ip:${ip}`, INVITE_MAX_PER_IP, INVITE_WINDOW_MS),
  ]);
  if (!adminOk || !ipOk) {
    const [adminMinutes, ipMinutes] = await Promise.all([
      rateLimitResetMinutes(`invite:admin:${session.user.id}`),
      rateLimitResetMinutes(`invite:ip:${ip}`),
    ]);
    const minutes = Math.max(adminMinutes, ipMinutes);
    return {
      error: `Too many invites sent recently. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = clip(String(formData.get("name") ?? "").trim(), "name");
  const role = oneOf(String(formData.get("role") ?? ""), ROLES, "chorister");

  if (!email || !name) return { error: "Name and email are required." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A member with that email already exists." };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { name, role } },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Could not create the invite." };
  }

  await prisma.user.create({
    data: { authUserId: data.user.id, email, name, role, status: "invited" },
  });

  revalidatePath("/admin/members");

  const inviteLink = `${appBaseUrl()}/auth/confirm?token_hash=${data.properties.hashed_token}&type=invite&next=/accept-invite`;
  return { inviteLink };
}

/**
 * The admin-mediated escape hatch for password reset (#18): the anonymous
 * /forgot-password page can never safely show a conditional link (doing so
 * would leak account existence outright — worse than the timing side-channel
 * it's designed to avoid), but an admin who already knows this member exists
 * (they're looking at the member list) can safely generate and share one
 * manually — same `hashed_token`-not-`action_link` construction as
 * inviteMember above, same reasoning (see SKILL.md's gotchas).
 */
export async function generateMemberResetLink(userId: string): Promise<{ error?: string; resetLink?: string }> {
  const session = await requireAdmin();

  const ip = getClientIp(await headers());
  const [adminOk, ipOk] = await Promise.all([
    checkRateLimit(`reset-link:admin:${session.user.id}`, RESET_LINK_MAX_PER_ADMIN, RESET_LINK_WINDOW_MS),
    checkRateLimit(`reset-link:ip:${ip}`, RESET_LINK_MAX_PER_IP, RESET_LINK_WINDOW_MS),
  ]);
  if (!adminOk || !ipOk) {
    const [adminMinutes, ipMinutes] = await Promise.all([
      rateLimitResetMinutes(`reset-link:admin:${session.user.id}`),
      rateLimitResetMinutes(`reset-link:ip:${ip}`),
    ]);
    const minutes = Math.max(adminMinutes, ipMinutes);
    return {
      error: `Too many reset links generated recently. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) return { error: "Member not found." };
  if (member.status !== "active") return { error: "Only active members can be sent a reset link." };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: member.email,
  });

  if (error || !data.properties?.hashed_token) {
    return { error: error?.message ?? "Could not generate a reset link." };
  }

  const resetLink = `${appBaseUrl()}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/reset-password`;
  return { resetLink };
}

/**
 * Refuses to let an admin change their own role, and refuses to leave the
 * choir with zero active admins — otherwise the last admin standing could
 * demote themselves (or another admin) and permanently lock everyone out
 * of /admin, since only an admin can promote someone back.
 */
async function orphanAdminsError(
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

export async function updateMemberRole(userId: string, role: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const blocked = await orphanAdminsError(session, userId);
  if (blocked) return { error: blocked };

  const resolvedRole = oneOf(role, ROLES, "chorister");
  const target = await prisma.user.update({ where: { id: userId }, data: { role: resolvedRole } });

  // Keep the JWT's app_metadata.role in sync — that's what src/proxy.ts
  // gates /admin on. Note: an already-issued access token keeps its old
  // role claim until it naturally refreshes (~1hr) — accepted trade-off
  // at this app's scale.
  if (target.authUserId) {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(target.authUserId, { app_metadata: { role: resolvedRole } });
  }

  revalidatePath("/admin/members");
  return {};
}

export async function setMemberStatus(userId: string, status: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const blocked = await orphanAdminsError(session, userId);
  if (blocked) return { error: blocked };

  const resolvedStatus = oneOf(status, USER_STATUSES, "active");
  const target = await prisma.user.update({ where: { id: userId }, data: { status: resolvedStatus } });

  // Disabling should take effect promptly, not wait out the access-token
  // refresh lag — force their existing session(s) to end now.
  if (resolvedStatus === "disabled" && target.authUserId) {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.signOut(target.authUserId, "global");
  }

  revalidatePath("/admin/members");
  return {};
}

export async function deleteMember(userId: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const blocked = await orphanAdminsError(session, userId);
  if (blocked) return { error: blocked };

  const target = await prisma.user.findUnique({ where: { id: userId } });

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return {
        error: "Can't delete: this member has songs or trips tied to their account. Deactivate instead.",
      };
    }
    throw err;
  }

  if (target?.authUserId) {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.deleteUser(target.authUserId);
  }

  revalidatePath("/admin/members");
  return {};
}
