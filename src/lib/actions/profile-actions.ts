"use server";

import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { clip, oneOfOrNull } from "@/lib/validation";
import { VOICE_PARTS } from "@/lib/constants";
import type { UploadTicket } from "@/lib/media-constants";
import {
  createProfilePhotoUploadTicket as mintProfilePhotoUploadTicket,
  deleteProfilePhotoFile,
  isOwnProfilePhotoUrl,
} from "@/lib/profile-photo-storage";

/** Password changes go through the browser Supabase client directly
 *  (supabase.auth.updateUser({password})) — see ProfileForm.tsx. This
 *  action handles every other profile field, which stays in our own
 *  Prisma profile table. */
export async function updateProfile(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };

  const name = clip(String(formData.get("name") ?? "").trim(), "name");
  if (!name) return { error: "Name is required." };

  const bio = clip(String(formData.get("bio") ?? "").trim(), "bio") || null;
  const instrument = clip(String(formData.get("instrument") ?? "").trim(), "instrument") || null;
  const phone = clip(String(formData.get("phone") ?? "").trim(), "phone") || null;
  const voicePart = oneOfOrNull(String(formData.get("voicePart") ?? "").trim(), VOICE_PARTS);

  await prisma.user.update({ where: { id: session.user.id }, data: { name, bio, instrument, phone, voicePart } });
  return { ok: true };
}

/** Mints a signed upload ticket for a profile photo (#73) — mirrors
 *  sheet-music-actions.ts's createSheetMusicUploadTicket, but any signed-in
 *  user may upload their own photo (no requireAdmin()). */
export async function createProfilePhotoUploadTicket(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<UploadTicket | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };
  return mintProfilePhotoUploadTicket(fileName, fileSize, mimeType);
}

/** Saves the uploaded photo's Storage URL for the caller's own profile,
 *  deleting the previous photo file first if it was one of ours. Takes no
 *  userId param -- always targets session.user.id, so there's no
 *  client-suppliable id to validate against. */
export async function saveProfilePhoto(photoUrl: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };

  const existing = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (existing.photoUrl && isOwnProfilePhotoUrl(existing.photoUrl) && existing.photoUrl !== photoUrl) {
    await deleteProfilePhotoFile(existing.photoUrl);
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { photoUrl } });
  return {};
}

/** Clears the caller's own profile photo (no upload replacing it). */
export async function removeProfilePhoto(): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };

  const existing = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (existing.photoUrl && isOwnProfilePhotoUrl(existing.photoUrl)) {
    await deleteProfilePhotoFile(existing.photoUrl);
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { photoUrl: null } });
  return {};
}
