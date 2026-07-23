"use client";

// The app's first pagination UI (#42) -- shared by the Storage file list,
// the Members list, and the Activity log, the only unpaginated admin lists
// in the app. Types/constants/the paginate() helper live in @/lib/pagination
// (a plain module, no "use client"), not here -- every consumer, including
// this component itself, imports them from there directly. A Server
// Component (Activity's page.tsx) *must* import them from that plain
// module: importing a value from a "use client" file into server code
// doesn't give you the real value in this Next.js version (see
// lib/pagination.ts's own comment for what that broke).
import { PAGE_SIZE_OPTIONS, type PageSize } from "@/lib/pagination";

export default function Pagination({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  totalItems: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}) {
  if (totalItems === 0) return null;

  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink/60">
      <label className="flex items-center gap-2">
        Show
        <select
          value={String(pageSize)}
          onChange={(e) => {
            const value = e.target.value;
            onPageSizeChange(value === "all" ? "all" : (Number(value) as PageSize));
          }}
          className="rounded border border-ink/20 px-2 py-1 text-sm text-ink"
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {opt === "all" ? "View all" : opt}
            </option>
          ))}
        </select>
        per page
      </label>

      {pageSize !== "all" && totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="rounded border border-ink/20 px-2 py-1 text-ink disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="rounded border border-ink/20 px-2 py-1 text-ink disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
