// ─────────────────────────────────────────────────────────────────
// StackedBars — a stacked column chart.
//
// Each category (x-axis column) is a stack of segment counts. Drives the
// release-type-by-year, budget-tier-by-year, the temporal weekday/month
// stacks (segments = years), and the Connected conglomerate/weekday/month
// stacks (segments = Film vs TV). Ported from the sketch's stackedBars()
// — minus the volume-normalized "typical year" reference line, which was
// a sketch analysis aid, not a reader-facing element.
//
// Multi-series, so segments use the categorical palette. Pure SVG,
// role="img" with an aria-label; a legend names each segment.
//
// When `averageLine` is set (the temporal weekday/month tiles, whose
// segments are years), a dashed "typical year" reference line is drawn
// over the stacks — volume-normalized so thin ramp-up years don't drag
// it down. Ported from the sketch's stackedBars() average-line block.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import type { StackedMatrix } from "@/lib/feeds/stats/chart-data";
import { paletteColor } from "./palette";
import { LegendSwatches } from "./Legend";
import { Tip } from "./Tip";

/** Computed typical-year line: a point per category, the raw expected
    value per category (for the hover chips), and the caption basis. */
type AverageLine = { points: [number, number][]; values: number[]; caption: string };

/**
 * The volume-normalized "typical year" expectation per category. Full
 * PAST years (≥ 50% of the busiest past year) set the baseline; the
 * current year folds in only for already-elapsed columns, so in-progress
 * months don't read as a dip. Returns null if there's nothing to average.
 */
function typicalYearLine(
  cats: string[],
  segments: string[],
  matrix: number[][],
  kind: "weekday" | "month",
  yOf: (v: number) => number,
  xOf: (ci: number) => number,
): AverageLine | null {
  const years = segments.map(Number);
  if (years.some((y) => !Number.isFinite(y))) return null;
  const curYear = new Date().getUTCFullYear();
  const curMonth = new Date().getUTCMonth();
  // A column counts as "elapsed" if its period has already happened this
  // year: every weekday has; only months before the current one have.
  const elapsed = cats.map((_c, ci) => (kind === "weekday" ? true : ci < curMonth));

  const yearTotals = years.map((_y, yi) =>
    cats.reduce((s, _c, ci) => s + matrix[ci][yi], 0),
  );
  const pastIdx = years.map((y, i) => (y < curYear ? i : -1)).filter((i) => i >= 0);
  const refTotal = Math.max(1, ...pastIdx.map((i) => yearTotals[i]));
  let fullIdx = pastIdx.filter((i) => yearTotals[i] >= 0.5 * refTotal);
  if (!fullIdx.length) fullIdx = pastIdx.length ? pastIdx : years.map((_y, i) => i);
  const typicalTotal =
    fullIdx.reduce((s, i) => s + yearTotals[i], 0) / fullIdx.length;
  const curIdx = years.findIndex((y) => y === curYear);

  // Each category's expected share, averaged across the eligible years
  // and scaled back up to a typical full-year volume. `values` keeps the
  // raw expected count per category so the hover chips can name it.
  const values: number[] = [];
  const points = cats.map((_c, ci): [number, number] => {
    const elig = [...fullIdx];
    if (curIdx >= 0 && elapsed[ci]) elig.push(curIdx);
    const shares = elig.map((yi) =>
      yearTotals[yi] ? matrix[ci][yi] / yearTotals[yi] : 0,
    );
    const avg = (shares.reduce((a, b) => a + b, 0) / (shares.length || 1)) * typicalTotal;
    values[ci] = avg;
    return [xOf(ci), yOf(avg)];
  });

  const fullYears = fullIdx.map((i) => years[i]).join(", ");
  const curNote =
    curIdx >= 0 ? ` plus ${curYear}${kind === "month" ? " (completed months)" : " so far"}` : "";
  return {
    points,
    values,
    caption: `Dashed line = a typical year, averaging full years (${fullYears})${curNote}; thin ramp-up years stay in the bars only.`,
  };
}

export function StackedBars({
  data,
  ariaLabel,
  /** Draw the typical-year reference line (temporal tiles only). */
  averageLine,
  /** Per-segment colours; defaults to the categorical palette. The
      Connected page passes the film/TV brand hues so its Film-vs-TV
      series match the dumbbell rather than reading as arbitrary categories. */
  colors,
}: {
  data: StackedMatrix;
  ariaLabel: string;
  averageLine?: "weekday" | "month";
  colors?: string[];
}) {
  const colorAt = (i: number) => colors?.[i] ?? paletteColor(i);
  const { cats, segments, matrix } = data;
  const W = 560;
  const H = 200;
  const ml = 26;
  const mr = 8;
  const mt = 10;
  const mb = 22;
  const iw = W - ml - mr;
  const ih = H - mt - mb;
  // Tallest stack sets the scale; each column's segments stack from 0.
  const totals = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const maxTotal = Math.max(1, ...totals);
  const gap = iw / cats.length;
  const barWidth = gap * 0.66;
  const y = (v: number) => mt + ih - (v / maxTotal) * ih;
  const colCenter = (ci: number) => ml + ci * gap + gap / 2;

  const avg = averageLine
    ? typicalYearLine(cats, segments, matrix, averageLine, y, colCenter)
    : null;
  const linePoints = avg
    ? avg.points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")
    : "";
  // The reference line is named in the legend + caption, so the chart's
  // accessible name mentions it too (it's not a separate series).
  const fullAriaLabel = avg
    ? `${ariaLabel}, with a dashed line marking a typical year`
    : ariaLabel;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* HTML hotspot layer over the SVG: one per column, giving each
          category a hover chip that breaks out every segment's value and
          the column total — the per-segment numbers the stack can't show.
          Positioned in the SVG's coordinate space (% of the 560×200
          viewBox). */}
      <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={svgStyle}
        role="img"
        aria-label={fullAriaLabel}
      >
        {cats.map((cat, ci) => {
          const xLeft = ml + ci * gap + (gap - barWidth) / 2;
          let acc = 0;
          return (
            <g key={cat}>
              {segments.map((seg, si) => {
                const v = matrix[ci][si];
                if (!v) return null;
                const h = (v / maxTotal) * ih;
                const rectY = y(acc + v);
                acc += v;
                return (
                  <rect
                    key={seg}
                    x={xLeft}
                    y={rectY}
                    width={barWidth}
                    height={h}
                    fill={colorAt(si)}
                  />
                );
              })}
              <text
                x={xLeft + barWidth / 2}
                y={H - 7}
                style={axisTextStyle}
                textAnchor="middle"
              >
                {cat}
              </text>
            </g>
          );
        })}
        {/* Typical-year reference line over the stacks. A surface-colored
            casing under the dashed accent line keeps it legible over any
            bar color; the dots get the same casing. */}
        {avg ? (
          <g>
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--surface-default)"
              strokeWidth={4.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--chart-accent)"
              strokeWidth={2.4}
              strokeDasharray="5 3"
              strokeLinecap="round"
            />
            {avg.points.map((p, i) => (
              <circle
                key={i}
                cx={p[0]}
                cy={p[1]}
                r={3}
                fill="var(--chart-accent)"
                stroke="var(--surface-default)"
                strokeWidth={1.2}
              />
            ))}
          </g>
        ) : null}
      </svg>
        <div aria-hidden="true" style={overlayStyle}>
          {cats.map((cat, ci) => {
            const total = totals[ci];
            if (!total) return null;
            const xLeft = ml + ci * gap + (gap - barWidth) / 2;
            // Each non-empty segment, largest data first by stack order.
            const parts = segments
              .map((seg, si) => (matrix[ci][si] ? `${seg}: ${matrix[ci][si]}` : null))
              .filter(Boolean)
              .join(" · ");
            // When the typical-year line is shown, name its value for this
            // column too, so the chip carries the same comparison the line
            // draws (the average request).
            const typical =
              avg && avg.values[ci] != null ? ` · typical ${avg.values[ci].toFixed(1)}` : "";
            return (
              <div
                key={cat}
                className="stats-tip"
                style={{
                  ...hotspotStyle,
                  left: `${(xLeft / W) * 100}%`,
                  width: `${(barWidth / W) * 100}%`,
                  top: `${(mt / H) * 100}%`,
                  height: `${(ih / H) * 100}%`,
                }}
              >
                <Tip>{`${cat} — ${parts} · total ${total}${typical}`}</Tip>
              </div>
            );
          })}
        </div>
      </div>
      <LegendSwatches
        items={[
          ...segments.map((s, i) => ({ label: s, color: colorAt(i) })),
          ...(avg
            ? [{ label: "Typical year", color: "var(--chart-accent)", dashed: true }]
            : []),
        ]}
      />
      {avg ? <p style={captionStyle}>{avg.caption}</p> : null}
    </div>
  );
}

// The hotspot layer matches the SVG box; itself inert, only its child
// hotspots take the pointer.
const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

const hotspotStyle: CSSProperties = {
  position: "absolute",
  pointerEvents: "auto",
};

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

const captionStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--text-caption)",
  margin: 0,
};
