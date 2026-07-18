import { prisma } from "@/lib/prisma";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function LogisticsPage() {
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
        <h1 className="text-2xl font-semibold text-slate-900">Logistics</h1>
        <p className="mt-4 text-slate-500">No upcoming trip has been set up yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">{trip.title}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {trip.destination} &middot; {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}
      </p>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Key dates &amp; deadlines</h2>
        <ul className="flex flex-col gap-2">
          {trip.deadlines.map((d) => (
            <li key={d.id} className="rounded border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{d.label}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase text-slate-600">
                  {d.category}
                </span>
              </div>
              <p className="text-sm text-slate-600">{fmtDate(d.dueDate)}</p>
              {d.notes && <p className="mt-1 text-sm text-slate-500">{d.notes}</p>}
            </li>
          ))}
          {trip.deadlines.length === 0 && <p className="text-slate-500">No deadlines set.</p>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Itinerary</h2>
        <ul className="flex flex-col gap-2">
          {trip.itineraryItems.map((item) => (
            <li key={item.id} className="rounded border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{item.title}</span>
                <span className="text-xs text-slate-500">
                  {fmtDate(item.date)}
                  {item.time ? ` · ${item.time}` : ""}
                </span>
              </div>
              {item.location && <p className="text-sm text-slate-600">{item.location}</p>}
              {item.notes && <p className="mt-1 text-sm text-slate-500">{item.notes}</p>}
            </li>
          ))}
          {trip.itineraryItems.length === 0 && <p className="text-slate-500">No itinerary yet.</p>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Practice schedule</h2>
        <ul className="flex flex-col gap-2">
          {trip.practiceSessions.map((s) => (
            <li key={s.id} className="rounded border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">
                  {fmtDate(s.date)} · {s.time}
                </span>
              </div>
              <p className="text-sm text-slate-600">{s.location}</p>
              {s.notes && <p className="mt-1 text-sm text-slate-500">{s.notes}</p>}
            </li>
          ))}
          {trip.practiceSessions.length === 0 && (
            <p className="text-slate-500">No practice sessions scheduled.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
