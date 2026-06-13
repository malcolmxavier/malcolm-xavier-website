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

export type TileSpan = 4 | 6 | 8 | 12;

export function Tile({
  title,
  children,
  span = 4,
  /** Optional caption rendered under the body in the muted note style. */
  note,
}: {
  title: string;
  children: ReactNode;
  span?: TileSpan;
  note?: ReactNode;
}) {
  // A stable id derived from the title links the <section> to its
  // heading for the aria-labelledby association.
  const headingId =
    "tile-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <section
      className="stats-tile"
      data-span={span}
      aria-labelledby={headingId}
      style={tileStyle}
    >
      <h3 id={headingId} className="stats-tile__title" style={titleStyle}>
        {title}
      </h3>
      {children}
      {note ? <p style={noteStyle}>{note}</p> : null}
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
