"use client";

import { useRouter } from "next/navigation";
import { deleteDeadline, deleteItineraryItem, deletePracticeSession } from "@/lib/actions/logistics-actions";

const HANDLERS = {
  deadline: deleteDeadline,
  itinerary: deleteItineraryItem,
  practice: deletePracticeSession,
} as const;

export default function DeleteButton({ kind, id }: { kind: keyof typeof HANDLERS; id: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await HANDLERS[kind](id);
        router.refresh();
      }}
      className="text-red-600 hover:underline"
    >
      Delete
    </button>
  );
}
