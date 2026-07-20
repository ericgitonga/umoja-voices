"use client";

import { useRouter } from "next/navigation";
import { deleteSong } from "@/lib/actions/song-actions";

export default function DeleteSongButton({ songId, redirectTo }: { songId: string; redirectTo?: string }) {
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Delete this song? This cannot be undone.")) return;
    try {
      await deleteSong(songId);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch {
      alert("Something went wrong deleting this song — please try again.");
    }
  }

  return (
    <button onClick={handleClick} className="text-red-600 hover:underline">
      Delete
    </button>
  );
}
