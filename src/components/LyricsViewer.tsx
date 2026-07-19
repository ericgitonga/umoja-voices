"use client";

import { useState } from "react";
import { VOICE_TAGS, VOICE_TAG_LABEL, type VoiceTag } from "@/lib/constants";

type Section = {
  id: string;
  sectionType: string;
  sectionLabel: string;
  content: string;
  voiceTags: VoiceTag[];
  sortOrder: number;
};

const FILTERABLE_TAGS = VOICE_TAGS.filter((t) => t !== "SATB");

export default function LyricsViewer({ sections }: { sections: Section[] }) {
  const [activeFilter, setActiveFilter] = useState<VoiceTag | null>(null);

  const visible = activeFilter
    ? sections.filter((s) => s.voiceTags.includes(activeFilter) || s.voiceTags.includes("SATB"))
    : sections;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full bg-ink px-3 py-1 font-medium text-white">
          {activeFilter ? VOICE_TAG_LABEL[activeFilter] : "ALL"}
        </span>
        <div className="flex flex-wrap gap-2">
          {FILTERABLE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveFilter(activeFilter === tag ? null : tag)}
              className={`rounded-full px-3 py-1 ${activeFilter === tag ? "bg-ink text-white" : "bg-ink/5 text-ink/80"}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {visible.map((section) => (
          <div key={section.id}>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-semibold text-ink">{section.sectionLabel}</h3>
              <div className="flex gap-1">
                {section.voiceTags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-medium text-ink/60"
                  >
                    {VOICE_TAG_LABEL[t]}
                  </span>
                ))}
              </div>
            </div>
            <p className="whitespace-pre-line text-ink/80">{section.content}</p>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-ink/50">No lyrics tagged for this voice yet.</p>
        )}
      </div>
    </div>
  );
}
