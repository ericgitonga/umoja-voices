"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@/lib/get-session";

const LINKS = [
  { href: "/songs", label: "Songs" },
  { href: "/logistics", label: "Logistics" },
  { href: "/links", label: "Links" },
  { href: "/about", label: "About" },
];

// Shown instead of the full member nav for anonymous visitors — /about and
// /links are public by design (#43), so logged-out visitors need a way to
// find them rather than seeing no nav at all.
const PUBLIC_LINKS = [
  { href: "/about", label: "About" },
  { href: "/links", label: "Links" },
];

function PublicNav({ pathname }: { pathname: string | null }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center gap-2 bg-ink px-6 py-3 text-sm">
      <Link href="/about" className="mr-4 flex items-center gap-2 font-semibold text-white">
        <span aria-hidden>&#9834;</span> Umoja Voices
      </Link>
      {PUBLIC_LINKS.map(({ href, label }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "rounded-full bg-white/15 px-3 py-1.5 text-white"
                : "px-3 py-1.5 text-gray-300 hover:text-white"
            }
          >
            {label}
          </Link>
        );
      })}
      <Link href="/login" className="ml-auto text-gray-300 hover:text-white">
        Sign in
      </Link>
    </nav>
  );
}

export default function Nav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const router = useRouter();
  if (!session) return <PublicNav pathname={pathname} />;

  const isAdmin = session.user.role === "admin";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 flex items-center gap-2 bg-ink px-6 py-3 text-sm">
      <Link href="/songs" className="mr-4 flex items-center gap-2 font-semibold text-white">
        <span aria-hidden>&#9834;</span> Umoja Voices
      </Link>
      {LINKS.map(({ href, label }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "rounded-full bg-white/15 px-3 py-1.5 text-white"
                : "px-3 py-1.5 text-gray-300 hover:text-white"
            }
          >
            {label}
          </Link>
        );
      })}
      {isAdmin && (
        <Link
          href="/admin/members"
          className={
            pathname?.startsWith("/admin/members")
              ? "rounded-full bg-white/15 px-3 py-1.5 text-white"
              : "px-3 py-1.5 text-gray-300 hover:text-white"
          }
        >
          Members
        </Link>
      )}
      {isAdmin && (
        <Link
          href="/admin/storage"
          className={
            pathname?.startsWith("/admin/storage")
              ? "rounded-full bg-white/15 px-3 py-1.5 text-white"
              : "px-3 py-1.5 text-gray-300 hover:text-white"
          }
        >
          Storage
        </Link>
      )}
      {isAdmin && (
        <Link
          href="/admin/activity"
          className={
            pathname?.startsWith("/admin/activity")
              ? "rounded-full bg-white/15 px-3 py-1.5 text-white"
              : "px-3 py-1.5 text-gray-300 hover:text-white"
          }
        >
          Activity
        </Link>
      )}
      <div className="ml-auto flex items-center gap-4">
        <Link href="/profile" className="text-gray-300 hover:text-white">
          {session.user.name}
        </Link>
        <button onClick={handleSignOut} className="text-gray-300 hover:text-white">
          Sign out
        </button>
      </div>
    </nav>
  );
}
