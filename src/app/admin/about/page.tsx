import { getOrderedAboutBlocks } from "@/lib/about-blocks";
import AboutSectionEditor from "@/components/AboutSectionEditor";
import AddAboutSectionForm from "@/components/AddAboutSectionForm";
import AboutMediaForm from "@/components/AboutMediaForm";
import RemoveAboutMediaButton from "@/components/RemoveAboutMediaButton";
import MoveAboutMediaButtons from "@/components/MoveAboutMediaButtons";

// This page reads live, admin-editable data — never statically cache it.
export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  const blocks = await getOrderedAboutBlocks();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink">About page</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-ink">Content</h2>
        <p className="mb-3 text-sm text-ink/60">
          Sections and media share one order — use ↑/↓ to interleave a video or recording between
          paragraphs, or reorder text.
        </p>
        <div className="flex flex-col gap-3">
          {blocks.map((block) =>
            block.kind === "section" ? (
              <AboutSectionEditor key={block.id} section={block} />
            ) : (
              <div
                key={block.id}
                data-testid={`about-media-${block.id}`}
                className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="font-medium text-ink">{block.label}</p>
                  <p className="text-xs text-ink/50">{block.mediaKind}</p>
                </div>
                <div className="flex items-center gap-3">
                  <RemoveAboutMediaButton id={block.id} />
                  <MoveAboutMediaButtons id={block.id} />
                </div>
              </div>
            )
          )}
          {blocks.length === 0 && <p className="text-ink/50">No content yet.</p>}
        </div>

        <AddAboutSectionForm />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Add Media</h2>
        <AboutMediaForm />
      </section>
    </div>
  );
}
