"use client";

import { useState, type RefObject } from "react";

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  body: string;
  setBody: (value: string) => void;
};

/**
 * A text+URL link-entry widget (#72) — an alternative to typing #70's
 * `[link text](url)` syntax by hand, for admins who aren't familiar with
 * markdown. Still produces the same `[text](url)` snippet under the hood
 * (LinkifiedText's parser is unchanged), splicing it into the textarea at
 * the current cursor/selection rather than always appending to the end.
 */
export default function LinkInsertField({ textareaRef, body, setBody }: Props) {
  const [open, setOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [url, setUrl] = useState("");

  function handleOpen() {
    const el = textareaRef.current;
    if (el && el.selectionStart !== el.selectionEnd) {
      setLinkText(body.slice(el.selectionStart, el.selectionEnd));
    }
    setOpen(true);
  }

  function handleCancel() {
    setLinkText("");
    setUrl("");
    setOpen(false);
  }

  function handleInsert() {
    const trimmedText = linkText.trim();
    const trimmedUrl = url.trim();
    if (!trimmedText || !trimmedUrl) return;

    const el = textareaRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const snippet = `[${trimmedText}](${trimmedUrl})`;
    setBody(body.slice(0, start) + snippet + body.slice(end));

    setLinkText("");
    setUrl("");
    setOpen(false);

    // Restore focus and place the cursor right after the inserted snippet,
    // once the controlled value has actually re-rendered.
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const cursor = start + snippet.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="self-start text-xs text-ink underline hover:no-underline"
      >
        + Insert link
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-ink/10 bg-ink/5 p-3 text-sm">
      <label className="flex flex-col gap-1">
        Link text
        <input
          value={linkText}
          onChange={(e) => setLinkText(e.target.value)}
          className="rounded border border-ink/20 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        URL
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="rounded border border-ink/20 px-2 py-1"
        />
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleInsert}
          disabled={!linkText.trim() || !url.trim()}
          className="rounded-full bg-ink px-3 py-1 text-xs text-white hover:opacity-90 disabled:opacity-40"
        >
          Insert
        </button>
        <button type="button" onClick={handleCancel} className="text-xs text-ink/50 hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
