"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAboutSection, deleteAboutSection } from "@/lib/actions/about-actions";

type Section = { id: string; title: string | null; body: string };

/** One existing About-page section row — plain display, or an inline edit form when toggled. */
export default function AboutSectionEditor({ section }: { section: Section }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title ?? "");
  const [body, setBody] = useState(section.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateAboutSection(section.id, title, body);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setTitle(section.title ?? "");
    setBody(section.body);
    setError(null);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this section?")) return;
    await deleteAboutSection(section.id);
    router.refresh();
  }

  if (!editing) {
    return (
      <div data-testid={`about-section-${section.id}`} className="rounded-lg border border-ink/10 bg-white p-4">
        {section.title && <h3 className="font-semibold text-ink">{section.title}</h3>}
        <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{section.body}</p>
        <div className="mt-3 flex gap-3">
          <button onClick={() => setEditing(true)} className="text-sm text-ink underline hover:no-underline">
            Edit
          </button>
          <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`about-section-${section.id}`}
      className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4"
    >
      <label className="flex flex-col gap-1 text-sm">
        Title (optional)
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-ink/20 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Body <span className="text-red-600">*</span>
        <textarea
          required
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="rounded border border-ink/20 px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="self-start rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={handleCancel} className="text-sm text-ink/50 hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
