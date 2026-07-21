import Link from "next/link";
import MediaEmbed from "@/components/MediaEmbed";
import LinkifiedText from "@/components/LinkifiedText";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import type { MediaKind } from "@/lib/constants";

// Admin-editable content (#59) — never statically cache it.
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const [sections, media] = await Promise.all([
    prisma.aboutPageSection.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.aboutPageMedia.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

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
        {sections.map((section) => (
          <section key={section.id}>
            {section.title && <h2 className="mb-2 text-lg font-semibold text-ink">{section.title}</h2>}
            <LinkifiedText text={section.body} />
          </section>
        ))}

        {media.map((item) => (
          <section key={item.id}>
            <MediaEmbed url={item.mediaUrl} kind={item.mediaKind as MediaKind} />
          </section>
        ))}
      </div>
    </div>
  );
}
