"use client";

/**
 * A Google-Drive-style circular progress ring (#66) -- an SVG stroke that
 * fills clockwise from the top as `fraction` goes 0 to 1. Uses `currentColor`
 * so it inherits whatever text color its parent (e.g. a submit button) is
 * already set to, rather than needing its own color prop.
 */
export default function CircularProgress({ fraction }: { fraction: number }) {
  const size = 16;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const offset = circumference * (1 - clamped);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
