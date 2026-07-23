"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addAboutMedia, createAboutMediaUploadTicket, verifyAboutAudioUpload } from "@/lib/actions/about-actions";
import { AUDIO_MAX_BYTES, AUDIO_ACCEPT, VIDEO_MAX_BYTES, VIDEO_ACCEPT } from "@/lib/media-constants";
import { describeUploadFailure } from "@/lib/upload-error";
import { uploadFileDirectly } from "@/lib/upload-client";

type Mode = "paste" | "upload";

// Both direct-upload kinds share the same 20MB cap today; computed rather
// than hardcoded so this stays correct if either constant ever diverges.
const UPLOAD_MAX_BYTES = Math.max(AUDIO_MAX_BYTES, VIDEO_MAX_BYTES);
const MEDIA_ACCEPT = [AUDIO_ACCEPT, VIDEO_ACCEPT].join(",");

/**
 * The About page's flat media-add form (#59) — a trimmed copy of Songs'
 * AddMediaForm without the voice-part field, since the About page has no
 * per-voice grouping to attach media to.
 */
export default function AboutMediaForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("paste");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setUrl("");
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCancel() {
    setMode("paste");
    setUrl("");
    setFile(null);
    setLabel("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || (mode === "paste" ? !url.trim() : !file)) {
      setError(mode === "paste" ? "URL and Label are both required." : "A file and Label are both required.");
      return;
    }
    if (mode === "upload" && file && file.size > UPLOAD_MAX_BYTES) {
      setError(`File is too large — max ${UPLOAD_MAX_BYTES / (1024 * 1024)}MB.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let mediaUrl = url;
      if (mode === "upload" && file) {
        const ticket = await createAboutMediaUploadTicket(file.name, file.size, file.type);
        if ("error" in ticket) {
          setError(ticket.error);
          return;
        }
        const uploaded = await uploadFileDirectly(ticket, file);
        if (uploaded.error) {
          setError(uploaded.error);
          return;
        }
        if (file.type.startsWith("audio/")) {
          const verified = await verifyAboutAudioUpload(uploaded.url!);
          if (verified.error) {
            setError(verified.error);
            return;
          }
        }
        mediaUrl = uploaded.url!;
      }

      const result = await addAboutMedia(label, mediaUrl);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUrl("");
      setFile(null);
      setLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(describeUploadFailure(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4">
      <h3 className="font-semibold text-ink">Add Media</h3>

      <div className="flex gap-4 border-b border-ink/10 text-sm">
        <button
          type="button"
          onClick={() => switchMode("paste")}
          className={
            mode === "paste"
              ? "border-b-2 border-ink px-1 pb-2 font-medium text-ink"
              : "px-1 pb-2 text-ink/50 hover:text-ink"
          }
        >
          Paste URL
        </button>
        <button
          type="button"
          onClick={() => switchMode("upload")}
          className={
            mode === "upload"
              ? "border-b-2 border-ink px-1 pb-2 font-medium text-ink"
              : "px-1 pb-2 text-ink/50 hover:text-ink"
          }
        >
          Upload file
        </button>
      </div>

      {mode === "paste" ? (
        <label className="flex flex-col gap-1 text-sm">
          URL <span className="text-red-600">*</span>
          <input
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube, Spotify, Google Drive, or direct URL"
            className="rounded border border-ink/20 px-3 py-2"
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Audio or video file <span className="text-red-600">*</span>
          <input
            ref={fileInputRef}
            required
            type="file"
            accept={MEDIA_ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded border border-ink/20 px-3 py-2"
          />
          <span className="text-xs text-ink/50">
            MP3/WAV/M4A/OGG audio or MP4/MOV/WEBM video — max {UPLOAD_MAX_BYTES / (1024 * 1024)}MB.
          </span>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Label <span className="text-red-600">*</span>
        <input
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Featured Video, Choir intro recording"
          className="rounded border border-ink/20 px-3 py-2"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add Media"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="self-start rounded-full border border-ink/20 px-4 py-2 text-sm text-ink hover:bg-ink/5 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
