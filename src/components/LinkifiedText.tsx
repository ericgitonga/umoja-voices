// Admin-entered About page section bodies are plain text (#59), not
// markdown/HTML — but the copy they replace had real hyperlinks (WRAK,
// Instagram), so bare URLs are auto-converted to clickable links rather than
// requiring a markdown parser the admin form doesn't otherwise need.
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function linkifyLine(text: string, keyPrefix: string) {
  return text.split(URL_PATTERN).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={`${keyPrefix}-${i}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        {part}
      </a>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

/** Renders plain text as paragraphs (blank-line-separated), with bare URLs linkified. */
export default function LinkifiedText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i}>{linkifyLine(p, String(i))}</p>
      ))}
    </>
  );
}
