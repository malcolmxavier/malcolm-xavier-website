// ─────────────────────────────────────────────────────────────────
// GroupedStackedBars — a grouped-AND-stacked column chart.
//
// Each x-axis slot (a month) holds two bars side by side — one per group
// (Film, Television) — and each bar is itself stacked by segment (year).
// So a single chart carries three dimensions: month (position across),
// medium, and year.
//
// Colour encodes the two dimensions separately so they never compete:
//   • HUE = medium — film bars are an orange ramp, television bars a
//     blue ramp (the page's film/TV brand hues, same as the dumbbell).
//   • SHADE = year — within a bar, earlier years are lighter (mixed
//     toward the surface) and recent years are fuller.
// That keeps orange/blue meaning ONLY "film vs television" — they don't
// also stand in for a particular year, which is what made an earlier
// categorical-per-year palette read as confusing here.
//
// Medium is also carried by POSITION (film always left) and the hover
// chip's text, so it never relies on colour alone (WCAG 1.4.1).
//
// Pure SVG, role="img" with an aria-label; an HTML hotspot layer gives
// each bar a hover/tap chip breaking out its per-year counts and total.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import type { GroupedStackedMatrix } from "@/lib/feeds/stats/chart-data";
import { LegendSwatches } from "./Legend";
import { Tip } from "./Tip";

export function GroupedStackedBars({
  data,
  ariaLabel,
  /** Per-group medium hues for the strip under each bar; defaults to the
      connected page's film/TV brand hues so the strip matches the rest
      of the cross-brand page. */
  groupColors = ["var(--film-hue)", "var(--tv-hue)"],
}: {
  data: GroupedStackedMatrix;
  ariaLabel: string;
  groupColors?: string[];
}) {
  const { cats, groups, segments, matrix } = data;
  const W = 560;
  const H = 200;
  const ml = 26;
  const mr = 8;
  const mt = 10;
  const mb = 22; // room for the month label
  const iw = W - ml - mr;
  const ih = H - mt - mb;

  // The tallest single bar (one month × one medium stack) sets the shared
  // scale, so film and television bars are directly comparable in height.
  let maxTotal = 1;
  for (const month of matrix)
    for (const stack of month)
      maxTotal = Math.max(maxTotal, stack.reduce((a, b) => a + b, 0));

  const groupGap = iw / cats.length; // one month slot
  const usable = groupGap * 0.8; // the two bars share 80% of the slot
  const innerGap = groupGap * 0.06; // breathing room between the pair
  const barWidth = (usable - innerGap) / groups.length;

  const y = (v: number) => mt + ih - (v / maxTotal) * ih;
  const slotLeft = (ci: number) => ml + ci * groupGap + (groupGap - usable) / 2;
  const barLeft = (ci: number, gi: number) => slotLeft(ci) + gi * (barWidth + innerGap);
  const stackTotal = (ci: number, gi: number) =>
    matrix[ci][gi].reduce((a, b) => a + b, 0);

  // Segment fill: the medium's hue (gi) at a year-driven shade (si).
  // Earlier years mix further toward the surface (lighter); the most
  // recent year is the full brand hue, matching the legend swatch.
  const n = segments.length;
  const segFill = (gi: number, si: number) => {
    const hue = groups.length > 1 ? groupColors[gi] : groupColors[0];
    const base = hue ?? "var(--text-body)";
    const pct = n <= 1 ? 100 : Math.round(45 + (55 * si) / (n - 1));
    return `color-mix(in oklab, ${base} ${pct}%, var(--surface-default))`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={svgStyle}
          role="img"
          aria-label={ariaLabel}
        >
          {cats.map((cat, ci) => (
            <g key={cat}>
              {groups.map((_g, gi) => {
                const xLeft = barLeft(ci, gi);
                let acc = 0;
                return (
                  <g key={gi}>
                    {segments.map((seg, si) => {
                      const v = matrix[ci][gi][si];
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
                          fill={segFill(gi, si)}
                        />
                      );
                    })}
                  </g>
                );
              })}
              {/* Month label, centred under the pair. */}
              <text
                x={ml + ci * groupGap + groupGap / 2}
                y={H - 7}
                style={axisTextStyle}
                textAnchor="middle"
              >
                {cat}
              </text>
            </g>
          ))}
        </svg>
        {/* Hotspot layer: one chip per bar, breaking out the per-year
            counts and the bar total — the numbers the stack can't show. */}
        <div aria-hidden="true" style={overlayStyle}>
          {cats.map((cat, ci) =>
            groups.map((g, gi) => {
              const total = stackTotal(ci, gi);
              if (!total) return null;
              const xLeft = barLeft(ci, gi);
              const parts = segments
                .map((seg, si) =>
                  matrix[ci][gi][si] ? `${seg}: ${matrix[ci][gi][si]}` : null,
                )
                .filter(Boolean)
                .join(" · ");
              return (
                <div
                  key={`${cat}-${g}`}
                  className="stats-tip"
                  style={{
                    ...hotspotStyle,
                    left: `${(xLeft / W) * 100}%`,
                    width: `${(barWidth / W) * 100}%`,
                    top: `${(mt / H) * 100}%`,
                    height: `${(ih / H) * 100}%`,
                  }}
                >
                  <Tip>{`${cat} · ${g} — ${parts} · total ${total}`}</Tip>
                </div>
              );
            }),
          )}
        </div>
      </div>
      {/* Legend names the medium hues (the full, most-recent shade);
          the year is the shade ramp within each bar, named in the caption
          and broken out exactly in the hover chips. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <LegendSwatches
          items={groups.map((g, i) => ({
            label: g,
            color: groupColors[i] ?? "var(--text-body)",
          }))}
        />
        {n > 1 ? (
          <p style={captionStyle}>
            {`Shade marks the year—lighter ${segments[0]} to fuller ${segments[n - 1]}. Hover any bar for its per-year counts.`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

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
