"use client";

import { useRouter } from "next/navigation";
import { moveAboutMedia } from "@/lib/actions/about-actions";

/** Up/Down reordering (#72) for a media row — the section-row equivalent lives in AboutSectionEditor. */
export default function MoveAboutMediaButtons({ id }: { id: string }) {
  const router = useRouter();

  async function handleMove(direction: "up" | "down") {
    await moveAboutMedia(id, direction);
    router.refresh();
  }

  return (
    <span className="flex gap-1">
      <button
        onClick={() => handleMove("up")}
        aria-label="Move up"
        className="rounded border border-ink/20 px-2 py-0.5 text-sm text-ink hover:bg-ink/5"
      >
        ↑
      </button>
      <button
        onClick={() => handleMove("down")}
        aria-label="Move down"
        className="rounded border border-ink/20 px-2 py-0.5 text-sm text-ink hover:bg-ink/5"
      >
        ↓
      </button>
    </span>
  );
}
