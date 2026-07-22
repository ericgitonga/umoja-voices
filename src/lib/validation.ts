/**
 * Shared server-side input guards for Server Actions. Every "enum-like"
 * field in prisma/schema.prisma is a plain String (SQLite has no native
 * enum — see that file's header comment), so nothing stops a crafted
 * request from sending an arbitrary value if an action doesn't check it
 * itself; the admin-only <select> in the UI is a convenience, not the
 * enforcement boundary. Mirrors the spirit of the Career Transition
 * project's _clip() input-length guard.
 */

const MAX_LENGTHS = {
  title: 200,
  label: 200,
  description: 1000,
  content: 8000,
  url: 2000,
  notes: 1000,
  name: 200,
  bio: 2000,
  phone: 30,
  instrument: 100,
} as const;

export function clip(value: string, kind: keyof typeof MAX_LENGTHS): string {
  return value.slice(0, MAX_LENGTHS[kind]);
}

/** Returns `value` if it's in `allowed`, otherwise `fallback`. */
export function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Like `oneOf`, but for an optional enum-like field with no natural
 *  fallback value — returns null instead of forcing one of `allowed`. */
export function oneOfOrNull<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Filters an array down to only values present in `allowed`. */
export function subsetOf<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const set = new Set<string>(allowed);
  return values.filter((v): v is T => set.has(v));
}
