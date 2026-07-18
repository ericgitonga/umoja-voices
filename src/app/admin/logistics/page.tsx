import { prisma } from "@/lib/prisma";
import { DEADLINE_CATEGORIES } from "@/lib/constants";
import {
  createTrip,
  addDeadline,
  addItineraryItem,
  addPracticeSession,
} from "@/lib/actions/logistics-actions";
import DeleteButton from "./DeleteButton";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminLogisticsPage() {
  const trip = await prisma.trip.findFirst({
    where: { status: "upcoming" },
    orderBy: { startDate: "asc" },
    include: {
      deadlines: { orderBy: { dueDate: "asc" } },
      itineraryItems: { orderBy: [{ date: "asc" }] },
      practiceSessions: { orderBy: [{ date: "asc" }] },
    },
  });

  if (!trip) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-ink">Logistics</h1>
        <form action={createTrip} className="flex flex-col gap-4 rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
          <label className="flex flex-col gap-1 text-sm">
            Trip title
            <input name="title" required className="rounded border border-ink/20 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Destination
            <input name="destination" required className="rounded border border-ink/20 px-3 py-2" />
          </label>
          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Start date
              <input name="startDate" type="date" required className="rounded border border-ink/20 px-3 py-2" />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              End date
              <input name="endDate" type="date" required className="rounded border border-ink/20 px-3 py-2" />
            </label>
          </div>
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-white hover:opacity-90">
            Create trip
          </button>
        </form>
      </div>
    );
  }

  const boundAddDeadline = addDeadline.bind(null, trip.id);
  const boundAddItinerary = addItineraryItem.bind(null, trip.id);
  const boundAddPractice = addPracticeSession.bind(null, trip.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-ink">{trip.title}</h1>
      <p className="mb-8 text-sm text-ink/60">
        {trip.destination} &middot; {fmt(trip.startDate)} – {fmt(trip.endDate)}
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-ink">Key dates &amp; deadlines</h2>
        <form action={boundAddDeadline} className="mb-4 flex flex-col gap-2 rounded-lg border border-ink/10 bg-white p-3 shadow-sm sm:flex-row sm:items-end">
          <input name="label" placeholder="Label" required className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm" />
          <select name="category" defaultValue="visa" className="rounded border border-ink/20 px-2 py-1 text-sm">
            {DEADLINE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input name="dueDate" type="date" required className="rounded border border-ink/20 px-2 py-1 text-sm" />
          <input name="notes" placeholder="Notes (optional)" className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm" />
          <button type="submit" className="rounded-full bg-ink px-3 py-1 text-sm text-white hover:opacity-90">Add</button>
        </form>
        <ul className="flex flex-col gap-2">
          {trip.deadlines.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm shadow-sm">
              <span>{d.label} — {fmt(d.dueDate)} ({d.category}){d.notes ? ` · ${d.notes}` : ""}</span>
              <DeleteButton kind="deadline" id={d.id} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-ink">Itinerary</h2>
        <form action={boundAddItinerary} className="mb-4 flex flex-col gap-2 rounded-lg border border-ink/10 bg-white p-3 shadow-sm sm:flex-row sm:items-end">
          <input name="title" placeholder="Title" required className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm" />
          <input name="date" type="date" required className="rounded border border-ink/20 px-2 py-1 text-sm" />
          <input name="time" placeholder="Time" className="w-24 rounded border border-ink/20 px-2 py-1 text-sm" />
          <input name="location" placeholder="Location" className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm" />
          <input name="notes" placeholder="Notes" className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm" />
          <button type="submit" className="rounded-full bg-ink px-3 py-1 text-sm text-white hover:opacity-90">Add</button>
        </form>
        <ul className="flex flex-col gap-2">
          {trip.itineraryItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm shadow-sm">
              <span>
                {fmt(item.date)}{item.time ? ` · ${item.time}` : ""} — {item.title}
                {item.location ? ` @ ${item.location}` : ""}
              </span>
              <DeleteButton kind="itinerary" id={item.id} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Practice schedule</h2>
        <form action={boundAddPractice} className="mb-4 flex flex-col gap-2 rounded-lg border border-ink/10 bg-white p-3 shadow-sm sm:flex-row sm:items-end">
          <input name="date" type="date" required className="rounded border border-ink/20 px-2 py-1 text-sm" />
          <input name="time" placeholder="Time" required className="w-24 rounded border border-ink/20 px-2 py-1 text-sm" />
          <input name="location" placeholder="Location" required className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm" />
          <input name="notes" placeholder="Notes" className="flex-1 rounded border border-ink/20 px-2 py-1 text-sm" />
          <button type="submit" className="rounded-full bg-ink px-3 py-1 text-sm text-white hover:opacity-90">Add</button>
        </form>
        <ul className="flex flex-col gap-2">
          {trip.practiceSessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm shadow-sm">
              <span>{fmt(s.date)} · {s.time} — {s.location}{s.notes ? ` · ${s.notes}` : ""}</span>
              <DeleteButton kind="practice" id={s.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
