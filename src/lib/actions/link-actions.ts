"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") throw new Error("Admin access required.");
}

export async function createLink(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  if (!title || !url) return;

  const count = await prisma.externalLink.count();
  await prisma.externalLink.create({ data: { title, url, category, sortOrder: count } });
  revalidatePath("/admin/links");
  revalidatePath("/links");
}

export async function deleteLink(id: string) {
  await requireAdmin();
  await prisma.externalLink.delete({ where: { id } });
  revalidatePath("/admin/links");
  revalidatePath("/links");
}
