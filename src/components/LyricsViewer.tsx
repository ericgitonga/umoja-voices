"use client";

import { useState } from "react";
import { VOICE_TAGS, type VoiceTag } from "@/lib/constants";

type Section = {
  id: string;
  sectionType: string;
  sectionLabel: string;
  content: string;
  voiceTags: VoiceTag[];
  sortOrder: number;
};

export default function LyricsViewer({ sections }: { sections: Section[] }) {
  const [activeFilter, setActiveFilter] = useState<VoiceTag | null>(null);

  const visible = activeFilter
    ? sections.filter((s) => s.voiceTags.includes(activeFilter) || s.voiceTags.includes("SATB"))
    : sections;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <button
          onClick={() => setActiveFilter(null)}
          className={`rounded-full px-3 py-1 ${!activeFilter ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Full lyrics
        </button>
        {VOICE_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={`rounded-full px-3 py-1 ${activeFilter === tag ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {visible.map((section) => (
          <div key={section.id}>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-semibold text-slate-800">{section.sectionLabel}</h3>
              <div className="flex gap-1">
                {section.voiceTags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <p className="whitespace-pre-line text-slate-700">{section.content}</p>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-slate-500">No lyrics tagged for this voice yet.</p>
        )}
      </div>
    </div>
  );
}
