import MediaEmbed from "@/components/MediaEmbed";

// Starter copy (#43) — refine with the app owner's own wording as the trip
// firms up. The Instagram reel showing White Ribbon Alliance Kenya's story
// (https://www.instagram.com/reel/DObXiuyiB79/) is linked out to rather than
// embedded: Instagram has no simple public iframe embed without loading its
// own embed.js, which this app's strict nonce-based CSP (script-src
// 'nonce-*' 'strict-dynamic', no external script domains) deliberately
// doesn't allow for. A real YouTube link can go straight into
// FEATURED_YOUTUBE_URL below and will render via the same MediaEmbed used
// for song media, once one exists.
const FEATURED_YOUTUBE_URL: string | null = null;

export default function AboutPage() {
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

        {FEATURED_YOUTUBE_URL && (
          <section>
            <MediaEmbed url={FEATURED_YOUTUBE_URL} kind="youtube" />
          </section>
        )}
      </div>
    </div>
  );
}
