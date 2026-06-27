// ─────────────────────────────────────────────────────────────────
// BandFootnote — the band-level degradation line
// (STATS-FILTERS §6 altitude 2).
//
// Tiles that suppressed (T3 — zero surviving values) or folded under a band
// collapse don't each render an empty stub. They roll up into a single
// instructional footnote that leads with the action and names what it brings
// back ("Widen the filters to see Genres, Directors, and 3 more breakdowns")
// rather than a scatter of empty cards.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

export function BandFootnote({
  /** Human-readable labels of the hidden tiles, in band order. */
  labels,
}: {
  labels: string[];
}) {
  // Nothing hidden → nothing to say (the band rendered in full).
  if (labels.length === 0) return null;

  // Name up to three breakdowns inline; collapse the rest to a count so the
  // line stays scannable on a heavily-filtered page.
  const shown = labels.slice(0, 3);
  const extra = labels.length - shown.length;
  const parts = [...shown];
  if (extra > 0) {
    parts.push(`${extra} more breakdown${extra === 1 ? "" : "s"}`);
  }

  // Comma series with an Oxford "and" before the final element. The line leads
  // with the instruction ("Widen the filters to see …") so the verb-first form
  // works for a lone item or a list with no singular/plural agreement to track.
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;

  // Compose the whole sentence as one string so React doesn't split it into
  // separate text nodes (which would inject invisible <!-- --> comment
  // markers between the words).
  return (
    <p style={footnoteStyle}>{`Widen the filters to see ${list}.`}</p>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

// A quiet full-width line under the band's tiles, in the reading-font
// caption register so it sits below the surviving charts as a footnote.
const footnoteStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--text-caption)",
  margin: 0,
};
