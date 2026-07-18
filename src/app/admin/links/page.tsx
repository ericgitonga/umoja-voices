import { prisma } from "@/lib/prisma";
import { LINK_CATEGORIES } from "@/lib/constants";
import { createLink } from "@/lib/actions/link-actions";
import DeleteLinkButton from "./DeleteLinkButton";

export default async function AdminLinksPage() {
  const links = await prisma.externalLink.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">External links</h1>

      <form action={createLink} className="mb-8 flex flex-col gap-3 rounded border border-slate-200 p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Title
          <input name="title" required className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          URL
          <input name="url" type="url" required className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select name="category" defaultValue="social" className="rounded border border-slate-300 px-3 py-2">
            {LINK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-indigo-700 px-4 py-2 text-sm text-white hover:bg-indigo-800">
          Add
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.id} className="flex items-center justify-between rounded border border-slate-200 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{link.title}</p>
              <p className="text-xs text-slate-500">
                {link.category} &middot; {link.url}
              </p>
            </div>
            <DeleteLinkButton id={link.id} />
          </li>
        ))}
        {links.length === 0 && <p className="text-slate-500">No links yet.</p>}
      </ul>
    </div>
  );
}
