"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@/lib/get-session";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/songs", label: "Songs" },
  { href: "/logistics", label: "Logistics" },
  { href: "/links", label: "Links" },
];

// Shown instead of the full member nav for anonymous visitors — /about and
// /links are public by design (#43), so logged-out visitors need a way to
// find them rather than seeing no nav at all.
const PUBLIC_LINKS = [
  { href: "/about", label: "About" },
  { href: "/links", label: "Links" },
];

// #129: the logo shown here is the ONE logo on the site (akili-ai.com
// reference) -- layout.tsx used to also render a large standalone
// logo-full.png banner below the nav on every page; that's gone, and this
// shrunk instance carries the full logo+wordmark (including the tagline
// baked into the graphic itself) in its place.
function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className="mr-4 flex shrink-0 items-center">
      <img
        src="/logo-full.png"
        alt="Umoja Voices — One Voice. Many Hearts. One Purpose."
        className="h-8 w-auto shrink-0"
      />
    </Link>
  );
}

// Closes the mobile nav panel whenever the route changes -- adjusting state
// in response to a changing prop during render (React's documented pattern
// for this, see "Adjusting some state when a prop changes"), not inside a
// useEffect, since Nav never unmounts between client-side navigations.
function useMobileMenu(pathname: string | null) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }
  return { menuOpen, toggle: () => setMenuOpen((open) => !open), close: () => setMenuOpen(false) };
}

// #127: below `lg`, the full set of nav items (up to 7 for an admin, plus
// the logo and profile/sign-out) doesn't fit in one row at any phone width
// in either orientation -- nothing constrained the nav row's width, so it
// forced the whole page into horizontal scroll. Above `lg` the row fits
// comfortably and renders exactly as before; below it, only the logo and
// this toggle button show in the sticky bar itself, and everything else
// moves into a stacked panel underneath.
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
      className="shrink-0"
    >
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
    </svg>
  );
}

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        active ? "rounded-full bg-ink/10 px-3 py-1.5 text-ink" : "px-3 py-1.5 text-ink/60 hover:text-ink"
      }
    >
      {label}
    </Link>
  );
}

function PublicNav({ pathname }: { pathname: string | null }) {
  const { menuOpen, toggle, close } = useMobileMenu(pathname);

  return (
    <nav className="sticky top-0 z-50 border-b border-ink/10 bg-cream text-sm">
      <div className="flex items-center gap-2 px-4 py-3">
        <Logo href="/about" />
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:gap-2">
          {PUBLIC_LINKS.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} active={!!pathname?.startsWith(href)} onClick={close} />
          ))}
          <Link href="/login" className="ml-auto text-ink/60 hover:text-ink">
            Sign in
          </Link>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="ml-auto text-ink/60 hover:text-ink lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>
      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-ink/10 px-4 py-3 lg:hidden">
          {PUBLIC_LINKS.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} active={!!pathname?.startsWith(href)} onClick={close} />
          ))}
          <Link href="/login" onClick={close} className="px-3 py-1.5 text-ink/60 hover:text-ink">
            Sign in
          </Link>
        </div>
      )}
    </nav>
  );
}

export default function Nav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { menuOpen, toggle, close } = useMobileMenu(pathname);

  if (!session) return <PublicNav pathname={pathname} />;

  const isAdmin = session.user.role === "admin";

  async function handleSignOut() {
    close();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks = [
    ...LINKS,
    ...(isAdmin
      ? [
          { href: "/admin/members", label: "Members" },
          { href: "/admin/storage", label: "Storage" },
          { href: "/admin/activity", label: "Activity" },
        ]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-ink/10 bg-cream text-sm">
      <div className="flex items-center gap-2 px-4 py-3">
        <Logo href="/songs" />
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:gap-2">
          {navLinks.map(({ href, label }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              active={pathname?.startsWith(href) ?? false}
              onClick={close}
            />
          ))}
          <div className="ml-auto flex items-center gap-4">
            <Link href="/profile" className="text-ink/60 hover:text-ink">
              {session.user.name}
            </Link>
            <button onClick={handleSignOut} className="text-ink/60 hover:text-ink">
              Sign out
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="ml-auto text-ink/60 hover:text-ink lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>
      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-ink/10 px-4 py-3 lg:hidden">
          {navLinks.map(({ href, label }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              active={pathname?.startsWith(href) ?? false}
              onClick={close}
            />
          ))}
          <Link href="/profile" onClick={close} className="px-3 py-1.5 text-ink/60 hover:text-ink">
            {session.user.name}
          </Link>
          <button onClick={handleSignOut} className="px-3 py-1.5 text-left text-ink/60 hover:text-ink">
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
