// ─────────────────────────────────────────────────────────────────
// StarRating — half-step star rating display.
//
// Renders 0–5 stars in 0.5-step increments. Used by /films today;
// /tv next when that surface lands. Sub-brand-agnostic by design:
// `--text-action` cascades through `[data-subbrand]`, so the same
// component renders in film orange, TV's accent (when picked), or
// any future cluster's accent without prop changes.
//
// Accessibility:
//   • Outer `<span role="img">` carries the precise rating in
//     aria-label ("Rated 3.5 out of 5 stars"). Screen readers get
//     the value once, not 5 individual icons.
//   • Inner SVGs are aria-hidden — purely decorative.
//
// Visual treatment:
//   • Full slot: solid star in --text-action (sub-brand accent).
//   • Half slot: outlined star with the left half overlaid in solid
//     accent — left-half-filled, right-half-outlined.
//   • Empty slot: outlined star in --text-caption (muted).
//
// Why --text-action and not --primary-default for fills:
// the [data-theme="dark"][data-subbrand] cascade re-binds
// --text-action so dark-mode contrast stays AA per the 2026-04-28
// audit. Bypassing to --primary-default rendered as primary-500 on
// black at 2.7:1 contrast (failed SC 1.4.3). Same lesson as the
// pagination primitive — preserve the action chain.
//
// Compact vs full display:
//   • Default (compact): trailing empty slots are hidden, so 4★
//     reads as "★★★★" not "★★★★☆". Matches Letterboxd's profile
//     listings.
//   • showEmpty: keep all 5 slots visible to emphasize the scale.
//     Use on detail pages or anywhere the visual context benefits
//     from the 5-point reference.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

// Standard 5-point star path. ViewBox 0–24, so any size scales cleanly.
const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01z";

export type StarRatingProps = {
  /** 0 to 5 in 0.5 increments. null/undefined renders nothing. */
  rating: number | null;
  /** Per-star size in px. Default 14 (compact card display). */
  size?: number;
  /** Show all 5 slots regardless of rating. Default false (compact). */
  showEmpty?: boolean;
  /** Override the auto-generated aria-label. */
  ariaLabel?: string;
  /** className for outer wrapper. */
  className?: string;
  /** Inline style on outer wrapper (for spacing inside cards, etc.). */
  style?: CSSProperties;
};

type SlotState = "full" | "half" | "empty";

export function StarRating({
  rating,
  size = 14,
  showEmpty = false,
  ariaLabel,
  className,
  style,
}: StarRatingProps) {
  if (rating === null || rating === undefined) return null;

  // Clamp to [0, 5] in 0.5 steps so a stray decimal (e.g. 3.7 from
  // a parsing error) doesn't render half-on-half-off awkwardness.
  const clamped = Math.min(5, Math.max(0, Math.round(rating * 2) / 2));
  const label = ariaLabel ?? `Rated ${clamped} out of 5 stars`;

  // Each slot independently decides its state. Cleaner than clipping
  // a continuous fill across all 5 (no math about gap-vs-star widths
  // adding up to half-star boundaries).
  const slots: SlotState[] = [1, 2, 3, 4, 5].map((slot) => {
    if (clamped >= slot) return "full";
    if (clamped >= slot - 0.5) return "half";
    return "empty";
  });

  // Compact mode trims trailing empties — but if everything is empty
  // (rating === 0, an edge case), fall back to all 5 so the visual
  // doesn't disappear.
  const lastNonEmpty = slots.findLastIndex((s) => s !== "empty");
  const visible =
    showEmpty || lastNonEmpty === -1 ? slots : slots.slice(0, lastNonEmpty + 1);

  return (
    <span
      role="img"
      aria-label={label}
      className={className}
      style={{
        display: "inline-flex",
        gap: 2,
        verticalAlign: "middle",
        color: "var(--text-action)",
        ...style,
      }}
    >
      {visible.map((state, i) => (
        <StarShape key={i} state={state} size={size} />
      ))}
    </span>
  );
}

// ─── Internals ────────────────────────────────────────────────────

function StarShape({ state, size }: { state: SlotState; size: number }) {
  if (state === "full") {
    return <SolidStar size={size} />;
  }
  if (state === "empty") {
    // Empty stars borrow --text-caption directly (overrides the
    // wrapper's --text-action) so they read as muted ghost outlines.
    return (
      <span style={{ display: "inline-flex", color: "var(--text-caption)" }}>
        <OutlinedStar size={size} />
      </span>
    );
  }
  // Half: outlined background + solid foreground clipped to left half
  // via overflow:hidden. No SVG defs / clipPath ID juggling needed —
  // CSS handles the clip and the IDs stay scoped automatically.
  return (
    <span
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          color: "var(--text-caption)",
          display: "inline-flex",
        }}
      >
        <OutlinedStar size={size} />
      </span>
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size / 2,
          height: size,
          overflow: "hidden",
          display: "inline-flex",
        }}
      >
        <SolidStar size={size} />
      </span>
    </span>
  );
}

function SolidStar({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}

function OutlinedStar({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <path
        d={STAR_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
