import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [songCount, memberCount, tripCount, linkCount] = await Promise.all([
    prisma.song.count(),
    prisma.user.count({ where: { role: "chorister" } }),
    prisma.trip.count(),
    prisma.externalLink.count(),
  ]);

  const cards = [
    { label: "Songs", count: songCount, href: "/admin/songs" },
    { label: "Members", count: memberCount, href: "/admin/members" },
    { label: "Trips", count: tripCount, href: "/admin/logistics" },
    { label: "External links", count: linkCount, href: "/admin/links" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Admin</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded border border-slate-200 p-4 text-center hover:bg-slate-50"
          >
            <p className="text-2xl font-semibold text-slate-900">{c.count}</p>
            <p className="text-sm text-slate-600">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
