"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const LINKS = [
  { href: "/songs", label: "Songs" },
  { href: "/logistics", label: "Logistics" },
  { href: "/links", label: "Links" },
];

export default function Nav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  if (!session) return null;

  const isAdmin = session.user.role === "admin";

  return (
    <nav className="flex items-center gap-2 bg-ink px-6 py-3 text-sm">
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
          href="/admin"
          className={
            pathname?.startsWith("/admin")
              ? "rounded-full bg-white/15 px-3 py-1.5 text-white"
              : "px-3 py-1.5 text-gray-300 hover:text-white"
          }
        >
          Admin
        </Link>
      )}
      <div className="ml-auto flex items-center gap-4">
        <Link href="/profile" className="text-gray-300 hover:text-white">
          {session.user.name}
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-gray-300 hover:text-white">
          Sign out
        </button>
      </div>
    </nav>
  );
}
