// ─────────────────────────────────────────────────────────────────
// Donut — categorical share (e.g. TV show types).
//
// A ring of arc segments sized by each category's share of the total,
// with the total in the center and a legend naming each segment.
// Categorical, so segments use the palette. Ported from the sketch's
// donut(). Pure SVG via stroke-dasharray arcs.
//
// role="img" + aria-label on the ring; the legend carries the per-
// segment values for non-visual readers.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import { paletteColor } from "./palette";
import { LegendSwatches } from "./Legend";

export type DonutSlice = [label: string, value: number];

export function Donut({
  slices,
  ariaLabel = "Share by category",
}: {
  slices: DonutSlice[];
  ariaLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x[1], 0) || 1;
  const r = 42;
  const c = 50;
  const circ = 2 * Math.PI * r;
  let angle = 0;

  return (
    <div style={wrapStyle}>
      <svg
        viewBox="0 0 100 100"
        style={ringStyle}
        role="img"
        aria-label={ariaLabel}
      >
        {slices.map(([label, n], i) => {
          const frac = n / total;
          const dash = frac * circ;
          const seg = (
            <circle
              key={label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={paletteColor(i)}
              strokeWidth={15}
              strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
              transform={`rotate(${(angle - 90).toFixed(2)} ${c} ${c})`}
            />
          );
          angle += frac * 360;
          return seg;
        })}
        <text x={50} y={54} textAnchor="middle" style={centerStyle}>
          {total}
        </text>
      </svg>
      <LegendSwatches
        items={slices.map(([label, n], i) => ({
          label: `${label} · ${n}`,
          color: paletteColor(i),
        }))}
      />
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "flex",
  gap: 18,
  alignItems: "center",
  flexWrap: "wrap",
};

const ringStyle: CSSProperties = {
  width: 118,
  height: 118,
  flex: "none",
};

const centerStyle: CSSProperties = {
  fontSize: 13,
  fill: "var(--text-heading)",
  fontFamily: "var(--font-secondary)",
};
