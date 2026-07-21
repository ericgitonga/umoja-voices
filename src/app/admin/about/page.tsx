import { prisma } from "@/lib/prisma";
import { createAboutSection } from "@/lib/actions/about-actions";
import AboutSectionEditor from "@/components/AboutSectionEditor";
import AboutMediaForm from "@/components/AboutMediaForm";
import RemoveAboutMediaButton from "@/components/RemoveAboutMediaButton";

// This page reads live, admin-editable data — never statically cache it.
export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  const [sections, media] = await Promise.all([
    prisma.aboutPageSection.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.aboutPageMedia.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink">About page</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-ink">Text sections</h2>
        <div className="flex flex-col gap-3">
          {sections.map((section) => (
            <AboutSectionEditor key={section.id} section={section} />
          ))}
          {sections.length === 0 && <p className="text-ink/50">No sections yet.</p>}
        </div>

        <form
          action={createAboutSection}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4"
        >
          <h3 className="font-semibold text-ink">Add Section</h3>
          <label className="flex flex-col gap-1 text-sm">
            Title (optional)
            <input name="title" className="rounded border border-ink/20 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Body <span className="text-red-600">*</span>
            <textarea name="body" required rows={4} className="rounded border border-ink/20 px-3 py-2" />
            <span className="text-xs text-ink/50">
              Plain text — blank lines start a new paragraph. Links: paste a URL as-is, or write{" "}
              <code>[link text](url)</code> for custom link text.
            </span>
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-ink px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Add Section
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Media</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {media.map((item) => (
            <li
              key={item.id}
              data-testid={`about-media-${item.id}`}
              className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-medium text-ink">{item.label}</p>
                <p className="text-xs text-ink/50">{item.mediaKind}</p>
              </div>
              <RemoveAboutMediaButton id={item.id} />
            </li>
          ))}
          {media.length === 0 && <p className="text-ink/50">No media yet.</p>}
        </ul>

        <AboutMediaForm />
      </section>
    </div>
  );
}
