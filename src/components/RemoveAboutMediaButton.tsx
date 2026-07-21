"use client";

import { useRouter } from "next/navigation";
import { removeAboutMedia } from "@/lib/actions/about-actions";

export default function RemoveAboutMediaButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        if (!confirm("Remove this media item?")) return;
        await removeAboutMedia(id);
        router.refresh();
      }}
      className="text-sm text-red-600 hover:underline"
    >
      Remove
    </button>
  );
}
