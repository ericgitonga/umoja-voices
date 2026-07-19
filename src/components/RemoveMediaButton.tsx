"use client";

import { useRouter } from "next/navigation";
import { removeSongMedia } from "@/lib/actions/song-actions";

export default function RemoveMediaButton({ songId, mediaId }: { songId: string; mediaId: string }) {
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Remove this media item?")) return;
    await removeSongMedia(songId, mediaId);
    router.refresh();
  }

  return (
    <button onClick={handleClick} className="text-xs text-red-600 hover:underline">
      Remove
    </button>
  );
}
