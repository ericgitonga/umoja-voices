"use client";

import { useRouter, usePathname } from "next/navigation";
import Pagination from "@/components/Pagination";
import type { PageSize } from "@/lib/pagination";

/**
 * Activity's list is DB-fetched per page (unlike Storage/Members, which
 * paginate an already-fetched-in-full array client-side) -- see
 * page.tsx's own comment for why. This thin wrapper adapts the shared
 * Pagination UI to drive that via the URL (?page=&pageSize=) instead of
 * local state, so Prev/Next and the page-size selector actually change
 * what the server fetches next.
 */
export default function ActivityPaginationControls({
  totalItems,
  page,
  pageSize,
}: {
  totalItems: number;
  page: number;
  pageSize: PageSize;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(nextPage: number, nextPageSize: PageSize) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(nextPageSize) });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Pagination
      totalItems={totalItems}
      page={page}
      pageSize={pageSize}
      onPageChange={(p) => navigate(p, pageSize)}
      onPageSizeChange={(size) => navigate(1, size)}
    />
  );
}
