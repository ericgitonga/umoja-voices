// Shared pagination types/constants/helper (#42) -- deliberately NOT part of
// components/Pagination.tsx ("use client"): importing a plain constant from
// a client-boundary module into a Server Component doesn't give you the
// real value in this Next.js version, it gives you a client-reference proxy
// that breaks on first real use (confirmed live: `PAGE_SIZE_OPTIONS.includes`
// threw "not a function" in admin/activity/page.tsx, a Server Component,
// even though the exact same import worked fine from client components).
// Server Components needing these must import from here, not from the
// component file.

export type PageSize = 10 | 20 | 50 | 100 | "all";

export const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 50, 100, "all"];

export const DEFAULT_PAGE_SIZE: PageSize = 10;

export function paginate<T>(items: T[], page: number, pageSize: PageSize): T[] {
  if (pageSize === "all") return items;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
