// ─────────────────────────────────────────────────────────────────
// LegendSwatches — a small color-swatch legend shared by the SVG charts.
//
// A horizontal row of "▪ label" entries naming each series' color, so
// the multi-series charts (line, stacked, donut, dumbbell) are readable
// without relying on color alone to distinguish series. aria-hidden on
// the swatch squares; the labels carry the meaning.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

export type LegendItem = {
  label: string;
  color: string;
  /** Render a dashed-line swatch (a reference line) instead of a filled square. */
  dashed?: boolean;
};

export function LegendSwatches({ items }: { items: LegendItem[] }) {
  return (
    <ul style={listStyle}>
      {items.map((it) => (
        <li key={it.label} style={itemStyle}>
          {it.dashed ? (
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
            <span
              aria-hidden="true"
              style={{ ...swatchStyle, background: it.color }}
            />
          )}
          {it.label}
        </li>
      ))}
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

const swatchStyle: CSSProperties = {
  width: 11,
  height: 11,
  borderRadius: 3,
  flex: "none",
  display: "inline-block",
};
