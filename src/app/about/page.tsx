import MediaEmbed from "@/components/MediaEmbed";
import AboutVideoForm from "@/components/AboutVideoForm";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";

// Live admin-uploaded video — never statically cache it.
export const dynamic = "force-dynamic";

// Starter copy (#43). The Instagram reel showing White Ribbon Alliance
// Kenya's story (https://www.instagram.com/reel/DObXiuyiB79/) was originally
// linked out to rather than embedded: Instagram has no simple public iframe
// embed without loading its own embed.js, which this app's strict
// nonce-based CSP (script-src 'nonce-*' 'strict-dynamic', no external script
// domains) deliberately doesn't allow for. As of #55, the app owner uploads
// the video directly instead (below the Instagram link-out, which stays as
// a reference to the original post) rather than pursuing the embed further.

export default async function AboutPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";
  const video = await prisma.aboutPageVideo.findUnique({ where: { id: "about" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink">About Umoja Voices</h1>

      <div className="flex flex-col gap-6 text-ink/80">
        <p>
          Umoja Voices is a choir bringing people together through song — rehearsing, performing,
          and touring as one voice.
        </p>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">2026 Tour: Portugal &amp; Germany</h2>
          <p>
            This year the choir travels to Portugal and Germany for a series of joint concerts
            with local host choirs in each country — singing alongside our hosts, not just for
            them.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Singing in aid of White Ribbon Alliance Kenya</h2>
          <p>
            Proceeds from ticket sales across the tour go to{" "}
            <a
              href="https://whiteribbonalliancekenya.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline hover:no-underline"
            >
              White Ribbon Alliance Kenya
            </a>
            , a homegrown, women-led movement transforming health, dignity, and well-being for
            women, girls, and newborns across Kenya. Their work spans reproductive, maternal, and
            newborn health justice; economic power, education, and livelihoods; transformative
            women&apos;s leadership; and community organizing — all built on their own principle:
            &ldquo;Listening to women is Radical. Acting on their demands is Revolutionary.&rdquo;
          </p>
          <p className="mt-3">
            <a
              href="https://www.instagram.com/reel/DObXiuyiB79/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline hover:no-underline"
            >
              Watch their story ↗
            </a>
          </p>
        </section>

        {video && (
          <section>
            <MediaEmbed url={video.videoUrl} kind="video" />
          </section>
        )}

        {isAdmin && (
          <section>
            <AboutVideoForm hasVideo={Boolean(video)} />
          </section>
        )}
      </div>
    </div>
  );
}
