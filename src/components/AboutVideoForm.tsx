"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAboutVideo, removeAboutVideo } from "@/lib/actions/about-actions";
import { VIDEO_MAX_BYTES, VIDEO_ACCEPT } from "@/lib/media-constants";

export default function AboutVideoForm({ hasVideo }: { hasVideo: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("A video file is required.");
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      setError(`File is too large — max ${VIDEO_MAX_BYTES / (1024 * 1024)}MB.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await updateAboutVideo(file);
      if (result.error) {
        setError(result.error);
        return;
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the featured video?")) return;
    try {
      await removeAboutVideo();
      router.refresh();
    } catch {
      alert("Something went wrong removing the video — please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4">
      <h3 className="font-semibold text-ink">{hasVideo ? "Replace Featured Video" : "Add Featured Video"}</h3>

      <label className="flex flex-col gap-1 text-sm">
        Video file <span className="text-red-600">*</span>
        <input
          ref={fileInputRef}
          required
          type="file"
          accept={VIDEO_ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded border border-ink/20 px-3 py-2"
        />
        <span className="text-xs text-ink/50">MP4, MOV, or WEBM — max {VIDEO_MAX_BYTES / (1024 * 1024)}MB.</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Uploading…" : hasVideo ? "Replace Video" : "Add Video"}
        </button>
        {hasVideo && (
          <button type="button" onClick={handleRemove} className="text-xs text-red-600 hover:underline">
            Remove
          </button>
        )}
      </div>
    </form>
  );
}
