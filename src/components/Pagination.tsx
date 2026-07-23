"use client";

// The app's first pagination UI (#42) -- shared by the Storage file list and
// the Members list, the only two unpaginated admin lists in the app. Page
// size is a plain number or the "all" sentinel; the parent owns page/
// pageSize state and does its own slicing via `paginate()` below, since
// each list's items already live in a client component after being fetched
// server-side (sorting, in Storage's case) -- there's no need for
// server-side/URL-based pagination here.

export type PageSize = 10 | 20 | 50 | 100 | "all";

export const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 50, 100, "all"];

export const DEFAULT_PAGE_SIZE: PageSize = 10;

export function paginate<T>(items: T[], page: number, pageSize: PageSize): T[] {
  if (pageSize === "all") return items;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

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
