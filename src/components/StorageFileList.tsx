"use client";

import { useState } from "react";
import Pagination from "@/components/Pagination";
import { paginate, DEFAULT_PAGE_SIZE, type PageSize } from "@/lib/pagination";

export type StorageFile = {
  url: string;
  bytes: number;
  kind: "Audio" | "Video" | "Sheet Music" | "Profile Photo";
  name: string;
  songTitle: string;
  part?: string;
};

type SortColumn = "name" | "size" | "type";
type SortDirection = "asc" | "desc";

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function StorageFileList({ files }: { files: StorageFile[] }) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  function handleSort(column: SortColumn) {
    setPage(1);
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const sorted = [...files].sort((a, b) => {
    const cmp =
      sortColumn === "name"
        ? a.name.localeCompare(b.name)
        : sortColumn === "size"
          ? a.bytes - b.bytes
          : a.kind.localeCompare(b.kind);
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const pageItems = paginate(sorted, page, pageSize);

  const columns: { key: SortColumn; label: string }[] = [
    { key: "name", label: "File name" },
    { key: "type", label: "Type" },
    { key: "size", label: "Size" },
  ];

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-4 text-xs text-ink/50">
        <span>Sort by:</span>
        {columns.map((col) => (
          <button
            key={col.key}
            type="button"
            onClick={() => handleSort(col.key)}
            className={sortColumn === col.key ? "font-medium text-ink underline" : "hover:text-ink"}
          >
            {col.label}
            {sortColumn === col.key && (sortDirection === "asc" ? " ▲" : " ▼")}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {pageItems.map((f) => (
          <li
            key={f.url}
            className="flex items-center justify-between rounded border border-ink/10 bg-white px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{f.name}</p>
              <p className="truncate text-xs text-ink/50">
                {f.songTitle}
                {f.part ? ` — ${f.part}` : ""}
              </p>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-3 text-xs text-ink/60">
              <span className="rounded bg-ink/10 px-1.5 py-0.5 text-ink/70">{f.kind}</span>
              <span>{formatMB(f.bytes)}</span>
            </div>
          </li>
        ))}
        {sorted.length === 0 && <p className="text-sm text-ink/50">No uploaded files yet.</p>}
      </ul>
      <Pagination
        totalItems={sorted.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
