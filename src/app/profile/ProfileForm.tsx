"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  createProfilePhotoUploadTicket,
  saveProfilePhoto,
  removeProfilePhoto,
} from "@/lib/actions/profile-actions";
import { createClient } from "@/lib/supabase/client";
import { uploadFileDirectly } from "@/lib/upload-client";
import { describeUploadFailure } from "@/lib/upload-error";
import { PROFILE_PHOTO_MAX_BYTES, PROFILE_PHOTO_ACCEPT } from "@/lib/media-constants";
import { VOICE_PARTS, VOICE_PART_LABEL_TEXT, type VoicePart } from "@/lib/constants";

export default function ProfileForm({
  name,
  email,
  bio,
  voicePart,
  instrument,
  phone,
  photoUrl,
}: {
  name: string;
  email: string;
  bio: string | null;
  voicePart: string | null;
  instrument: string | null;
  phone: string | null;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [photo, setPhoto] = useState(photoUrl);
  const [photoSaving, setPhotoSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setStatus(`Photo is too large — max ${PROFILE_PHOTO_MAX_BYTES / (1024 * 1024)}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setPhotoSaving(true);
    setStatus(null);
    try {
      const ticket = await createProfilePhotoUploadTicket(file.name, file.size, file.type);
      if ("error" in ticket) {
        setStatus(ticket.error);
        return;
      }
      const uploaded = await uploadFileDirectly(ticket, file);
      if (uploaded.error) {
        setStatus(uploaded.error);
        return;
      }
      const result = await saveProfilePhoto(uploaded.url!);
      if (result.error) {
        setStatus(result.error);
        return;
      }
      setPhoto(uploaded.url!);
      router.refresh();
    } catch (err) {
      setStatus(describeUploadFailure(err));
    } finally {
      setPhotoSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto() {
    setPhotoSaving(true);
    setStatus(null);
    try {
      const result = await removeProfilePhoto();
      if (result.error) {
        setStatus(result.error);
        return;
      }
      setPhoto(null);
      router.refresh();
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setStatus(null);

    const result = await updateProfile(formData);
    if (result.error) {
      setStatus(result.error);
      return;
    }

    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword) {
      if (newPassword.length < 8) {
        setStatus("Profile saved. Password must be at least 8 characters — password not changed.");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setStatus(`Profile saved. Password change failed: ${error.message}`);
        return;
      }
    }

    setStatus("Saved.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img data-testid="profile-photo" src={photo} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div data-testid="profile-photo-placeholder" className="h-16 w-16 rounded-full bg-ink/10" aria-hidden />
        )}
        <div className="flex flex-col gap-1 text-sm">
          <label className="cursor-pointer text-ink hover:underline">
            {photoSaving ? "Uploading…" : "Change photo"}
            <input
              ref={fileInputRef}
              type="file"
              accept={PROFILE_PHOTO_ACCEPT}
              onChange={handlePhotoChange}
              disabled={photoSaving}
              className="hidden"
            />
          </label>
          {photo && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={photoSaving}
              className="text-left text-red-600 hover:underline disabled:opacity-60"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input value={email} disabled className="rounded border border-ink/10 bg-ink/5 px-3 py-2 text-ink/50" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input name="name" defaultValue={name} className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Bio
          <textarea
            name="bio"
            defaultValue={bio ?? ""}
            rows={4}
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Voice
          <select name="voicePart" defaultValue={voicePart ?? ""} className="rounded border border-ink/20 px-3 py-2">
            <option value="">Not set</option>
            {VOICE_PARTS.map((part: VoicePart) => (
              <option key={part} value={part}>
                {VOICE_PART_LABEL_TEXT[part]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Instrument
          <input name="instrument" defaultValue={instrument ?? ""} className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input
            name="phone"
            type="tel"
            defaultValue={phone ?? ""}
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          New password (leave blank to keep current)
          <input name="newPassword" type="password" minLength={8} className="rounded border border-ink/20 px-3 py-2" />
        </label>
        {status && (
          <p data-testid="profile-status" className="text-sm text-ink/60">
            {status}
          </p>
        )}
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90">
          Save
        </button>
      </form>
    </div>
  );
}
