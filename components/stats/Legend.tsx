// ─────────────────────────────────────────────────────────────────
// LegendSwatches — a small color-swatch legend shared by the SVG charts.
//
// A horizontal row of "▪ label" entries naming each series' color, so
// the multi-series charts (line, stacked, donut, dumbbell) are readable
// without relying on color alone to distinguish series. aria-hidden on
// the swatch squares; the labels carry the meaning.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import Link from "next/link";

export type LegendItem = {
  label: string;
  color: string;
  /** Render a dashed-line swatch (a reference line) instead of a filled square. */
  dashed?: boolean;
  /** Per-item deep-link: when present, the swatch + label become a link to
   *  this item's facet (the accessible click-through path for the SVG
   *  charts, whose bars/arcs/lines stay visual + hover). */
  href?: string;
  /** Accessible name for the link (defaults to the visible label). */
  ariaLabel?: string;
};

export function LegendSwatches({ items }: { items: LegendItem[] }) {
  return (
    <ul style={listStyle}>
      {items.map((it) => {
        const swatch = it.dashed ? (
          // A short dashed line — distinguishes the reference line from
          // the filled-square series swatches without relying on color.
          <svg
            aria-hidden="true"
            width={16}
            height={11}
            viewBox="0 0 16 11"
            style={{ flex: "none" }}
          >
            <line
              x1={0}
              y1={5.5}
              x2={16}
              y2={5.5}
              stroke={it.color}
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          </svg>
        ) : (
          <span aria-hidden="true" style={{ ...swatchStyle, background: it.color }} />
        );
        return (
          <li key={it.label} style={itemStyle}>
            {it.href ? (
              // Whole swatch+label is the link. color:inherit + the explicit
              // label-span color keep the sub-brand `a !important` cascade
              // from recoloring the text; opacity (not color) carries hover.
              <Link
                href={it.href}
                aria-label={it.ariaLabel ?? it.label}
                style={linkStyle}
                className="hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {swatch}
                <span style={labelStyle}>{it.label}</span>
              </Link>
            ) : (
              <>
                {swatch}
                {it.label}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-body)",
};

const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

// Linked legend item: lay out exactly like a plain item, reset the anchor's
// own color/decoration so the label-span color wins over the sub-brand link
// cascade (the deep-link is invisible chrome until hover/focus).
const linkStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "inherit",
  textDecoration: "none",
  borderRadius: "var(--border-radius-sm)",
};

// Explicit color so the !important `[data-subbrand] a` rule can't recolor
// the legend text (mirrors Bars' labelStyle approach).
const labelStyle: CSSProperties = {
  color: "var(--text-body)",
};

const swatchStyle: CSSProperties = {
  width: 11,
  height: 11,
  borderRadius: 3,
  flex: "none",
  display: "inline-block",
};
