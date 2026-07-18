"use client";

import { useRouter } from "next/navigation";
import { deleteSong } from "@/lib/actions/song-actions";

export default function DeleteSongButton({ songId, redirectTo }: { songId: string; redirectTo?: string }) {
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Delete this song? This cannot be undone.")) return;
    await deleteSong(songId);
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <button onClick={handleClick} className="text-red-600 hover:underline">
      Delete
    </button>
  );
}
