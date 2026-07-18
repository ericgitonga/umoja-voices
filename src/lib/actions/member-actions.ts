"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "chorister");

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

export async function updateMemberRole(userId: string, role: string) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/members");
}

export async function setMemberStatus(userId: string, status: string) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/admin/members");
}
