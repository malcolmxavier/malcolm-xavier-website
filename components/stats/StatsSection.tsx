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

export function StatsSection({
  label,
  children,
}: {
  /** The band name, e.g. "The corpus" — also the section's accessible name. */
  label: string;
  children: ReactNode;
}) {
  // A stable id derived from the label links the <section> to its heading.
  const headingId =
    "band-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <section className="stats-section" aria-labelledby={headingId}>
      <div className="stats-section__head">
        <h2 id={headingId} className="stats-section__label">
          {label}
        </h2>
      </div>
      <StatsGrid>{children}</StatsGrid>
    </section>
  );
}
