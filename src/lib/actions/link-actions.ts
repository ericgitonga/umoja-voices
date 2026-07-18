"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LINK_CATEGORIES } from "@/lib/constants";
import { clip, oneOf } from "@/lib/validation";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") throw new Error("Admin access required.");
}

export async function createLink(formData: FormData) {
  await requireAdmin();
  const title = clip(String(formData.get("title") ?? "").trim(), "title");
  const url = clip(String(formData.get("url") ?? "").trim(), "url");
  const category = oneOf(String(formData.get("category") ?? ""), LINK_CATEGORIES, "other");
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
