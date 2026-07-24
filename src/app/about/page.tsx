import Link from "next/link";
import MediaEmbed from "@/components/MediaEmbed";
import LinkifiedText from "@/components/LinkifiedText";
import Expandable from "@/components/Expandable";
import { getSession } from "@/lib/get-session";
import { getOrderedAboutBlocks } from "@/lib/about-blocks";
import type { MediaKind } from "@/lib/constants";

// Admin-editable content (#59) — never statically cache it.
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const blocks = await getOrderedAboutBlocks();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">About Umoja Voices</h1>
        {isAdmin && (
          <Link href="/admin/about" className="text-sm text-ink underline hover:no-underline">
            Edit About page →
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-6 text-ink/80">
        {blocks.map((block) =>
          block.kind === "section" ? (
            <section key={block.id}>
              {block.title && <h2 className="mb-2 text-xl font-bold text-ink">{block.title}</h2>}
              <Expandable collapsedHeight={120}>
                <LinkifiedText text={block.body} />
              </Expandable>
            </section>
          ) : (
            <section key={block.id}>
              <MediaEmbed url={block.mediaUrl} kind={block.mediaKind as MediaKind} />
            </section>
          )
        )}
      </div>
    </div>
  );
}
