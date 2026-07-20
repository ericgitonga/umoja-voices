"use client";

import { useRouter } from "next/navigation";
import { removeSheetMusic } from "@/lib/actions/sheet-music-actions";

export default function RemoveSheetMusicButton({ songId, sheetMusicId }: { songId: string; sheetMusicId: string }) {
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Remove this sheet music file?")) return;
    try {
      await removeSheetMusic(songId, sheetMusicId);
      router.refresh();
    } catch {
      alert("Something went wrong removing this file — please try again.");
    }
  }

  return (
    <button onClick={handleClick} className="text-xs text-red-600 hover:underline">
      Remove
    </button>
  );
}
