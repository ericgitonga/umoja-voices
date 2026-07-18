import { prisma } from "@/lib/prisma";
import { LINK_CATEGORIES, type LinkCategory } from "@/lib/constants";

const CATEGORY_TEXT: Record<LinkCategory, string> = {
  social: "Social Media",
  news: "News",
  media: "Media / Press",
  other: "Other",
};

export default async function LinksPage() {
  const links = await prisma.externalLink.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Links</h1>
      {LINK_CATEGORIES.map((category) => {
        const items = links.filter((l) => l.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-800">{CATEGORY_TEXT[category]}</h2>
            <ul className="flex flex-col gap-2">
              {items.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-700 hover:underline"
                  >
                    {link.title} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {links.length === 0 && <p className="text-slate-500">No links yet.</p>}
    </div>
  );
}
