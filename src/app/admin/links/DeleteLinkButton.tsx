"use client";

import { useRouter } from "next/navigation";
import { deleteLink } from "@/lib/actions/link-actions";

export default function DeleteLinkButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await deleteLink(id);
        router.refresh();
      }}
      className="text-sm text-red-600 hover:underline"
    >
      Delete
    </button>
  );
}
