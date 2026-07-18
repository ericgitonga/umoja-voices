"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const { data: session } = useSession();
  if (!session) return null;

  const isAdmin = session.user.role === "admin";

  return (
    <nav className="flex items-center gap-4 border-b border-slate-200 px-6 py-3 text-sm">
      <span className="mr-4 font-semibold text-slate-800">Umoja Voices</span>
      <Link href="/songs" className="text-slate-600 hover:text-slate-900">
        Songs
      </Link>
      <Link href="/logistics" className="text-slate-600 hover:text-slate-900">
        Logistics
      </Link>
      <Link href="/links" className="text-slate-600 hover:text-slate-900">
        Links
      </Link>
      <Link href="/profile" className="text-slate-600 hover:text-slate-900">
        Profile
      </Link>
      {isAdmin && (
        <Link href="/admin" className="font-medium text-indigo-700 hover:text-indigo-900">
          Admin
        </Link>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="ml-auto text-slate-500 hover:text-slate-900"
      >
        Sign out
      </button>
    </nav>
  );
}
