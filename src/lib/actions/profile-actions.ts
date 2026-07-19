"use server";

import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { clip } from "@/lib/validation";

/** Password changes go through the browser Supabase client directly
 *  (supabase.auth.updateUser({password})) — see ProfileForm.tsx. This
 *  action only handles the display-name field, which stays in our own
 *  Prisma profile table. */
export async function updateProfile(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };

  const name = clip(String(formData.get("name") ?? "").trim(), "name");
  if (!name) return { error: "Name is required." };

  await prisma.user.update({ where: { id: session.user.id }, data: { name } });
  return { ok: true };
}
