// ─────────────────────────────────────────────────────────────────
// StatsSection — one named band of the dashboard.
//
// The readability pass groups the ~23 tiles into a handful of bands
// (The corpus, Taste, People, Where it comes from, How it reached you,
// When you watch) so the page reads as a sequence of sections rather
// than one undifferentiated grid. Each band is a small mono heading over
// a hairline rule, then its own StatsGrid of tiles.
//
// Rendered as a <section> whose heading is its accessible name, so the
// dashboard exposes a clean set of labelled regions to assistive tech.
// The tiles inside keep their own 4/6/8/12 spans — the grid resolves
// per-band, so the row pairings still work.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { StatsGrid } from "./StatsGrid";
import { BandFootnote } from "./BandFootnote";
import type { BandDecision } from "@/lib/feeds/stats/collapse";

export function StatsSection({
  label,
  children,
  /**
   * This band's collapse decision under the active filter (STATS-FILTERS §6
   * altitude 2). Omitted on unfiltered surfaces → renders in full with no
   * footnote. When tiles suppress or the band folds, the hidden tiles roll
   * up into a single footnote rather than leaving empty stubs. The surviving
   * tiles (and a band-readout's anchor counter) still render via `children` —
   * they self-suppress through their own `decision` prop.
   */
  band,
  /** Resolve a hidden tile's id to its human label for the footnote. */
  tileLabel,
}: {
  /** The band name, e.g. "The corpus" — also the section's accessible name. */
  label: string;
  children: ReactNode;
  band?: BandDecision;
  tileLabel?: (id: string) => string;
}) {
  // A stable id derived from the label links the <section> to its heading. The
  // "band-" prefix keeps it from colliding with Tile's "tile-" ids; uniqueness
  // within a page then relies on band labels being distinct per dashboard
  // (they are, by construction).
  const headingId =
    "band-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Hidden tiles (T3 or folded) roll up into one footnote, in band order.
  const hiddenLabels = (band?.hiddenTileIds ?? []).map((id) =>
    tileLabel ? tileLabel(id) : id,
  );

  return (
    <section className="stats-section" aria-labelledby={headingId}>
      <div className="stats-section__head">
        <h2 id={headingId} className="stats-section__label">
          {label}
        </h2>
      </div>
      <StatsGrid>{children}</StatsGrid>
      <BandFootnote labels={hiddenLabels} />
    </section>
  );
}
