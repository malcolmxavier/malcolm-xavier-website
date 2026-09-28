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
  /** Per-slice deep-link, surfaced on the legend (the ring stays visual). */
  hrefFor,
}: {
  slices: DonutSlice[];
  ariaLabel?: string;
  hrefFor?: (label: string) => string | undefined;
}) {
  const total = slices.reduce((s, x) => s + x[1], 0) || 1;
  const r = 42;
  const c = 50;
  const circ = 2 * Math.PI * r;

  // Where each slice starts on the ring: slice i begins where every slice
  // before it ended, so its offset is the running sum of the ones ahead of
  // it.
  //
  // This used to be a `let angle = 0` counter incremented inside the JSX
  // map below. That worked, but a variable reassigned while rendering is
  // exactly what react-hooks flags — the accumulator's value depends on the
  // order React happens to evaluate children in, which is not a guarantee
  // the component should rest on. Deriving each offset independently means
  // a slice's position is a function of the data and nothing else. The
  // prefix sum re-walks the earlier slices per slice, which would matter
  // if a donut ever had hundreds of them; it has a handful.
  const startAngle = (i: number) =>
    slices.slice(0, i).reduce((sum, [, n]) => sum + (n / total) * 360, 0);

  return (
    <div style={wrapStyle}>
      <svg
        viewBox="0 0 100 100"
        style={ringStyle}
        role="img"
        // The center <text> total is a child of this role="img" SVG, so it's
        // opaque to assistive tech and the legend only carries per-slice
        // counts — fold the total into the accessible name (SC 4.1.2).
        aria-label={`${ariaLabel}, ${total} total`}
      >
        {slices.map(([label, n], i) => {
          const dash = (n / total) * circ;
          return (
            <circle
              key={label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={paletteColor(i)}
              strokeWidth={15}
              strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
              // -90 puts the first slice at twelve o'clock rather than at
              // three, which is where an SVG rotation of 0 would start it.
              transform={`rotate(${(startAngle(i) - 90).toFixed(2)} ${c} ${c})`}
            />
          );
        })}
        <text x={50} y={54} textAnchor="middle" style={centerStyle}>
          {total}
        </text>
      </svg>
      <LegendSwatches
        items={slices.map(([label, n], i) => ({
          label: `${label} · ${n}`,
          color: paletteColor(i),
          href: hrefFor?.(label),
          // The visible label carries the count too; the link's name is just
          // the category so the destination reads cleanly to assistive tech.
          ariaLabel: label,
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
