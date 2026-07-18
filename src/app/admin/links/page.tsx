import { prisma } from "@/lib/prisma";
import { LINK_CATEGORIES } from "@/lib/constants";
import { createLink } from "@/lib/actions/link-actions";
import DeleteLinkButton from "./DeleteLinkButton";

export default async function AdminLinksPage() {
  const links = await prisma.externalLink.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink">External links</h1>

      <form action={createLink} className="mb-8 flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Title
          <input name="title" required className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          URL
          <input name="url" type="url" required className="rounded border border-ink/20 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select name="category" defaultValue="social" className="rounded border border-ink/20 px-3 py-2">
            {LINK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90">
          Add
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.id} className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="font-medium text-ink">{link.title}</p>
              <p className="text-xs text-ink/50">
                {link.category} &middot; {link.url}
              </p>
            </div>
            <DeleteLinkButton id={link.id} />
          </li>
        ))}
        {links.length === 0 && <p className="text-ink/50">No links yet.</p>}
      </ul>
    </div>
  );
}
