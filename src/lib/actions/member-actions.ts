"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, USER_STATUSES } from "@/lib/constants";
import { clip, oneOf } from "@/lib/validation";

const INVITE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

/**
 * POC stand-in for Supabase Auth's inviteUserByEmail + Resend delivery
 * (see design plan Section 1 / SKILL.md). No email provider is wired up
 * yet, so the invite link is returned to the caller to share manually.
 */
export async function inviteMember(formData: FormData): Promise<{ error?: string; inviteLink?: string }> {
  const session = await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = clip(String(formData.get("name") ?? "").trim(), "name");
  const role = oneOf(String(formData.get("role") ?? ""), ROLES, "chorister");

  if (!email || !name) return { error: "Name and email are required." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A member with that email already exists." };

  const token = crypto.randomBytes(24).toString("hex");

  await prisma.$transaction([
    prisma.user.create({
      data: { email, name, role, status: "invited" },
    }),
    prisma.invite.create({
      data: {
        email,
        token,
        role,
        expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
        invitedById: session.user.id,
      },
    }),
  ]);

  revalidatePath("/admin/members");
  return { inviteLink: `/accept-invite/${token}` };
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

  await prisma.user.update({ where: { id: userId }, data: { role: oneOf(role, ROLES, "chorister") } });
  revalidatePath("/admin/members");
  return {};
}

export async function setMemberStatus(userId: string, status: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const blocked = await orphanAdminsError(session, userId);
  if (blocked) return { error: blocked };

  await prisma.user.update({
    where: { id: userId },
    data: { status: oneOf(status, USER_STATUSES, "active") },
  });
  revalidatePath("/admin/members");
  return {};
}
