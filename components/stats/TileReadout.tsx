// ─────────────────────────────────────────────────────────────────
// TileReadout — the T2 "skeletal" rung of the collapse ladder
// (STATS-FILTERS §6).
//
// When a tile's chart falls below its archetype floor (too few surviving
// values to read) or its primary axis is self-referenced by the active
// filter, the chart would be noise. Instead of rendering a one-bar chart we
// collapse the tile to a readout: the headline figure the selection still
// supports, plus a caption nudging the reader to widen the filters to bring
// the chart back (an action, not a thinness claim — a readout can still sit on
// plenty of entries). The copy is intentionally generic — Malcolm refines
// per-tile prose in his own voice later (matches the placeholder convention).
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from "react";

export function TileReadout({
  /** The headline figure the narrowed selection still supports (typically
   *  the surviving corpus count). A number is locale-formatted. */
  n,
  /** Optional unit shown after the figure in the muted register (e.g. "films"). */
  noun,
  /** Optional caption override; defaults to the generic widen-filters nudge. */
  caption,
}: {
  n: number | string;
  noun?: string;
  caption?: ReactNode;
}) {
  return (
    <div style={wrapStyle}>
      <span style={figureStyle}>
        {typeof n === "number" ? n.toLocaleString() : n}
        {noun ? <span style={nounStyle}> {noun}</span> : null}
      </span>
      <p style={captionStyle}>{caption ?? "Widen the filters to see this visualization."}</p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const wrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

// The figure echoes the Bigs headline register so a readout reads as a
// deliberate stat block, not a broken chart.
const figureStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 600,
  color: "var(--text-heading)",
  fontVariantNumeric: "tabular-nums",
};

const nounStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 400,
  color: "var(--text-caption)",
};

// The caption matches the Tile note register (reading font, caption colour).
const captionStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--text-caption)",
  margin: 0,
};
