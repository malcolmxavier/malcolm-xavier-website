// ─────────────────────────────────────────────────────────────────
// LineChart — multi-series cumulative line (logging pace by day-of-year).
//
// One polyline per series (a year, or "Films"/"Seasons" on Connected)
// over a Jan–Dec x-axis, with month gridlines. Ported from the sketch's
// lineChart(). Multi-series, so lines use the categorical palette.
//
// Pure SVG, server-rendered (the points are computed upstream). The
// <svg> is role="img" with an aria-label summarizing the chart; a
// visible legend names each series' color.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import { paletteColor } from "./palette";
import { LegendSwatches } from "./Legend";
import { LinePointer } from "./LinePointer";

export type LineSeries = { label: string; points: [number, number][] };

const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_INITIALS = "JFMAMJJASOND".split("");

export function LineChart({
  series,
  ariaLabel,
  /** Per-series colours; defaults to the categorical palette. The
      Connected page passes the film/TV brand hues. */
  colors,
  /** Suffix on the scrubber's per-series value (e.g. "%" for share). */
  valueSuffix,
}: {
  series: LineSeries[];
  ariaLabel: string;
  colors?: string[];
  valueSuffix?: string;
}) {
  const colorAt = (i: number) => colors?.[i] ?? paletteColor(i);
  const W = 560;
  const H = 210;
  const ml = 30;
  const mr = 8;
  const mt = 8;
  const mb = 22;
  const iw = W - ml - mr;
  const ih = H - mt - mb;
  const maxY = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p[1])));
  const x = (d: number) => ml + ((d - 1) / 365) * iw;
  const y = (v: number) => mt + ih - (v / maxY) * ih;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* The SVG carries the visual; a client scrubber over it resolves
          the exact day under the pointer and shows every series'
          cumulative total there — day-level, and touch-friendly. It maps
          back into the SVG's own coordinate space, so it tracks the chart
          at any rendered width. */}
      <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={svgStyle}
        role="img"
        aria-label={ariaLabel}
        shapeRendering="geometricPrecision"
      >
        {/* Month gridlines + axis labels. */}
        {MONTH_STARTS.map((d, i) => {
          const px = x(d);
          return (
            <g key={i}>
              <line
                x1={px}
                y1={mt}
                x2={px}
                y2={mt + ih}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text x={px} y={H - 7} style={axisTextStyle} textAnchor="middle">
                {MONTH_INITIALS[i]}
              </text>
            </g>
          );
        })}
        {/* Y-axis floor + ceiling ticks. */}
        <text x={2} y={y(0)} style={axisTextStyle}>
          0
        </text>
        <text x={2} y={y(maxY) + 7} style={axisTextStyle}>
          {maxY}
        </text>
        {/* One polyline per series. A cumulative line is a staircase of
            up-steps, so round joins + caps soften every corner — the fix
            for the jagged "pixelated" look — without smoothing away the
            cadence (flat = quiet, steep = a binge). Slightly thinner than
            before so overlapping years read as distinct lines. */}
        {series.map((s, i) => (
          <polyline
            key={s.label}
            points={s.points.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={colorAt(i)}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>
        <LinePointer
          series={series.map((s, i) => ({
            label: s.label,
            points: s.points,
            color: colorAt(i),
          }))}
          W={W}
          H={H}
          ml={ml}
          mr={mr}
          mt={mt}
          mb={mb}
          maxY={maxY}
          valueSuffix={valueSuffix}
        />
      </div>
      <LegendSwatches items={series.map((s, i) => ({ label: s.label, color: colorAt(i) }))} />
    </div>
  );
}

const svgStyle: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
};

const axisTextStyle: CSSProperties = {
  fontSize: 9,
  fill: "var(--text-caption)",
  fontFamily: "var(--font-mono)",
};
