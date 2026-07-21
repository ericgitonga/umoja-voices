// Admin-entered About page section bodies are plain text (#59), not
// markdown/HTML — but the copy they replace had real hyperlinks with custom
// link text (WRAK, Instagram), so a minimal `[text](url)` markdown-link
// syntax is supported alongside auto-linkified bare URLs (#70), rather than
// pulling in a full markdown parser the admin form doesn't otherwise need.
const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;

function linkifyLine(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  LINK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`${keyPrefix}-${i++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    const [full, linkText, linkUrl, bareUrl] = match;
    const url = linkUrl ?? bareUrl;
    nodes.push(
      <a
        key={`${keyPrefix}-${i++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        {linkText ?? bareUrl}
      </a>
    );
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) {
    nodes.push(<span key={`${keyPrefix}-${i++}`}>{text.slice(lastIndex)}</span>);
  }
  return nodes;
}

/**
 * Renders plain text as paragraphs (blank-line-separated). Bare URLs are
 * auto-linkified; `[link text](url)` renders with custom link text instead
 * of the raw URL.
 */
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
