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

type SavedFields = {
  name: string;
  bio: string | null;
  voicePart: string | null;
  instrument: string | null;
  phone: string | null;
};

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
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedFields>({ name, bio, voicePart, instrument, phone });
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

    setSaved({
      name: String(formData.get("name") ?? "").trim() || saved.name,
      bio: String(formData.get("bio") ?? "").trim() || null,
      voicePart: String(formData.get("voicePart") ?? "").trim() || null,
      instrument: String(formData.get("instrument") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
    });
    setStatus("Saved.");
    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setStatus(null);
    setEditing(false);
  }

  const photoBlock = photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="profile-photo" src={photo} alt="" className="h-16 w-16 rounded-full object-cover" />
  ) : (
    <div data-testid="profile-photo-placeholder" className="h-16 w-16 rounded-full bg-ink/10" aria-hidden />
  );

  if (!editing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {photoBlock}
          <div>
            <h2 className="text-lg font-semibold text-ink">{saved.name}</h2>
            <p className="text-sm text-ink/50">{email}</p>
          </div>
        </div>
        {saved.bio && <p className="whitespace-pre-line text-sm text-ink/80">{saved.bio}</p>}
        {(saved.voicePart || saved.instrument || saved.phone) && (
          <dl className="flex flex-col gap-1 text-sm text-ink/70">
            {saved.voicePart && (
              <div>
                <dt className="inline font-medium">Voice: </dt>
                <dd className="inline">{VOICE_PART_LABEL_TEXT[saved.voicePart as VoicePart]}</dd>
              </div>
            )}
            {saved.instrument && (
              <div>
                <dt className="inline font-medium">Instrument: </dt>
                <dd className="inline">{saved.instrument}</dd>
              </div>
            )}
            {saved.phone && (
              <div>
                <dt className="inline font-medium">Phone: </dt>
                <dd className="inline">{saved.phone}</dd>
              </div>
            )}
          </dl>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="self-start rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {photoBlock}
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
          <input name="name" defaultValue={saved.name} className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Bio
          <textarea
            name="bio"
            defaultValue={saved.bio ?? ""}
            rows={4}
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Voice
          <select
            name="voicePart"
            defaultValue={saved.voicePart ?? ""}
            className="rounded border border-ink/20 px-3 py-2"
          >
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
          <input
            name="instrument"
            defaultValue={saved.instrument ?? ""}
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input
            name="phone"
            type="tel"
            defaultValue={saved.phone ?? ""}
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
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90">
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full px-4 py-2 text-ink/60 hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
