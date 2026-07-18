"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateProfile(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!name) return { error: "Name is required." };

  const data: { name: string; passwordHash?: string } = { name };
  if (newPassword) {
    if (newPassword.length < 8) return { error: "Password must be at least 8 characters." };
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  await prisma.user.update({ where: { id: session.user.id }, data });
  return { ok: true };
}
