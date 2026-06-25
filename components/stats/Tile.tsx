// ─────────────────────────────────────────────────────────────────
// Tile — one dashboard card.
//
// A titled card holding one chart or stat block. Replaces the stats
// sketch's `tile()` HTML-string helper; the sketch's drag/resize
// affordances were a sketch-only convenience and are dropped (production
// layout is the component tree, not a saved arrangement).
//
// `span` maps to the responsive column width via the data-span attribute
// the `.stats-tile` CSS reads (4 = a third, 8 = two-thirds, 12 = full).
// Each tile is a <section> with its title as the accessible name, so the
// dashboard reads as a flat list of labelled regions to assistive tech.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from "react";
import type { TileDecision } from "@/lib/feeds/stats/collapse";

export type TileSpan = 4 | 6 | 8 | 12;

export function Tile({
  title,
  children,
  span = 4,
  /** Optional caption rendered under the body in the muted note style. */
  note,
  /**
   * This tile's collapse decision under the active filter (STATS-FILTERS §6).
   * Omitted on surfaces without filtering → the tile renders in full (T0).
   * - suppressed (T3 / folded under a band collapse) → renders nothing; it
   *   rolls up into the band footnote instead of leaving an empty stub.
   * - T2 (skeletal) → renders `readout` in place of the chart.
   * - T1 (thinned) → renders the chart, same as T0. The near-floor state
   *   carries NO caption: "few surviving categories" isn't "few entries"
   *   (3.5★ can sit on hundreds of films), so it makes no thinness claim.
   * - T0 (full) → renders the chart normally.
   */
  decision,
  /** The readout to show when the tile collapses to T2 (its headline figure). */
  readout,
  /** Title to use when the tile renders in solo-column mode (`soloColumn`).
   *  A versus tile titled "Actors — logged vs. rated" no longer shows the
   *  "rated" side once solo, so it drops the contrast suffix to just "Actors".
   *  Falls back to `title` when omitted. */
  soloTitle,
  /** Center the tile within its grid row instead of left-aligning. Only bites
   *  on desktop where the tile is narrower than the full grid (e.g. a span-8
   *  tile alone on its row); the grid CSS offsets it to sit centered. */
  centered = false,
}: {
  title: string;
  children: ReactNode;
  span?: TileSpan;
  note?: ReactNode;
  decision?: TileDecision;
  readout?: ReactNode;
  soloTitle?: string;
  centered?: boolean;
}) {
  // Suppressed tiles (zero surviving values, or charts folded under a band
  // collapse) leave no stub — the band footnote names them instead.
  if (decision?.suppressed || decision?.rung === "T3") return null;

  const rung = decision?.rung ?? "T0";
  // Below the floor / self-referenced → swap the chart for its readout.
  const body = rung === "T2" && readout != null ? readout : children;
  // Solo-column tiles drop the "— logged vs. rated" contrast suffix, since only
  // the logged side renders.
  const heading = decision?.soloColumn && soloTitle != null ? soloTitle : title;

  // A stable id derived from the title links the <section> to its
  // heading for the aria-labelledby association.
  const headingId =
    "tile-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <section
      className="stats-tile"
      data-span={span}
      data-rung={rung}
      data-center={centered ? "" : undefined}
      aria-labelledby={headingId}
      style={tileStyle}
    >
      <h3 id={headingId} className="stats-tile__title" style={titleStyle}>
        {heading}
      </h3>
      {body}
      {note ? <p style={noteStyle}>{note}</p> : null}
      {/* T1 (near-floor) renders the chart with no caption: fewer surviving
          categories doesn't mean fewer entries, so there's no honest thinness
          claim to make. Only T2 (chart dropped for a readout) carries a note,
          owned by TileReadout. */}
    </section>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const tileStyle: CSSProperties = {
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--border-radius-md)",
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

// Mono micro-caps heading in the Kicker register. Colour comes from the
// `.stats-tile__title` class (brand-coloured inside a sub-brand for
// scanability; see app/components.css), not from this inline style, so
// the cascade can theme it.
const titleStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.11em",
  margin: 0,
  fontWeight: 600,
};

// The explanatory caption reads as prose, so it moves out of mono into
// the sub-brand's reading font (Roboto Slab via --font-secondary) with a
// capped measure — the single biggest fix for the "wall of mono" the
// stacked tiles created.
// The note spans the full tile width (no measure cap) — capping it forced
// extra wrapped lines and stretched tile height for no reason.
const noteStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--text-caption)",
  margin: 0,
};
