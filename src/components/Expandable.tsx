"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Generic "see more" collapse/expand wrapper (#96) -- caps its children to
 * `collapsedHeight` pixels by default, with a bottom fade and a toggle
 * button that only appears if the content actually overflows that height.
 * Deliberately measurement-based (via `scrollHeight`) rather than slicing
 * an array or a line-clamp count, so the exact same component works for
 * both: a list of itinerary cards (Logistics) and free-form admin-entered
 * paragraph text (About page sections) -- neither has a natural "N items"
 * or "N lines" cut point that generalizes to the other.
 */
export default function Expandable({
  children,
  collapsedHeight = 160,
  moreLabel = "See more",
  lessLabel = "See less",
}: {
  children: React.ReactNode;
  collapsedHeight?: number;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setOverflowing(contentRef.current.scrollHeight > collapsedHeight);
    }
  }, [children, collapsedHeight]);

  return (
    <div>
      <div
        ref={contentRef}
        className="relative"
        style={expanded ? undefined : { maxHeight: collapsedHeight, overflow: "hidden" }}
      >
        {children}
        {!expanded && overflowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-cream to-transparent" />
        )}
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm font-medium text-ink hover:underline"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
