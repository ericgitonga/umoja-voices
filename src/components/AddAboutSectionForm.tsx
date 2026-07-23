"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createAboutSection } from "@/lib/actions/about-actions";
import LinkInsertField from "@/components/LinkInsertField";

/**
 * Replaces the plain `<form action={createAboutSection}>` (#59) with a
 * client component (#72) — needed so `LinkInsertField` can read/write the
 * body textarea's live cursor position, which a server-rendered form
 * submission has no access to.
 */
export default function AddAboutSectionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleCancel() {
    setTitle("");
    setBody("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createAboutSection(title, body);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4">
      <h3 className="font-semibold text-ink">Add Section</h3>
      <label className="flex flex-col gap-1 text-sm">
        Title (optional)
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-ink/20 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Body <span className="text-red-600">*</span>
        <textarea
          ref={textareaRef}
          required
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="rounded border border-ink/20 px-3 py-2"
        />
        <span className="text-xs text-ink/50">Blank lines start a new paragraph. A pasted URL auto-links.</span>
      </label>
      <LinkInsertField textareaRef={textareaRef} body={body} setBody={setBody} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add Section"}
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
