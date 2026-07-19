import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// This page reads live, admin-editable data — never statically cache it.
export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function LogisticsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === "admin";

  const trip = await prisma.trip.findFirst({
    where: { status: "upcoming" },
    orderBy: { startDate: "asc" },
    include: {
      deadlines: { orderBy: { dueDate: "asc" } },
      itineraryItems: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }] },
      practiceSessions: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!trip) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">Logistics</h1>
          {isAdmin && (
            <Link
              href="/admin/logistics"
              className="rounded border border-ink/20 px-3 py-1.5 text-sm text-ink hover:bg-ink/5"
            >
              Edit
            </Link>
          )}
        </div>
        <p className="mt-4 text-ink/50">No upcoming trip has been set up yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{trip.title}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {trip.destination} &middot; {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/logistics"
            className="rounded border border-ink/20 px-3 py-1.5 text-sm text-ink hover:bg-ink/5"
          >
            Edit
          </Link>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Key dates &amp; deadlines</h2>
        <ul className="flex flex-col gap-2">
          {trip.deadlines.map((d) => (
            <li key={d.id} className="rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{d.label}</span>
                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs uppercase text-ink/60">
                  {d.category}
                </span>
              </div>
              <p className="text-sm text-ink/60">{fmtDate(d.dueDate)}</p>
              {d.notes && <p className="mt-1 text-sm text-ink/50">{d.notes}</p>}
            </li>
          ))}
          {trip.deadlines.length === 0 && <p className="text-ink/50">No deadlines set.</p>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Itinerary</h2>
        <ul className="flex flex-col gap-2">
          {trip.itineraryItems.map((item) => (
            <li key={item.id} className="rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{item.title}</span>
                <span className="text-xs text-ink/50">
                  {fmtDate(item.date)}
                  {item.time ? ` · ${item.time}` : ""}
                </span>
              </div>
              {item.location && <p className="text-sm text-ink/60">{item.location}</p>}
              {item.notes && <p className="mt-1 text-sm text-ink/50">{item.notes}</p>}
            </li>
          ))}
          {trip.itineraryItems.length === 0 && <p className="text-ink/50">No itinerary yet.</p>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Practice schedule</h2>
        <ul className="flex flex-col gap-2">
          {trip.practiceSessions.map((s) => (
            <li key={s.id} className="rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">
                  {fmtDate(s.date)} · {s.time}
                </span>
              </div>
              <p className="text-sm text-ink/60">{s.location}</p>
              {s.notes && <p className="mt-1 text-sm text-ink/50">{s.notes}</p>}
            </li>
          ))}
          {trip.practiceSessions.length === 0 && (
            <p className="text-ink/50">No practice sessions scheduled.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
