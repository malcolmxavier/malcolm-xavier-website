// ─────────────────────────────────────────────────────────────────
// LinePointer — a day-level scrubber for the cumulative pace LineChart.
//
// The pace chart is day-of-year data, so a per-month hover undersells it.
// This client overlay tracks the pointer across the plot, resolves the
// exact day under the cursor, and shows a vertical guide + a tooltip with
// every series' cumulative total at that day. Because it's pointer-driven
// it also answers touch: drag along the line on mobile to read it (the
// layer only claims horizontal gestures, so vertical page scroll still
// works).
//
// Sits over the server-rendered <svg> and maps back into the SVG's own
// coordinate space, so it stays aligned at any rendered width.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

export type PointerSeries = { label: string; points: [number, number][]; color: string };

const MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_ABBR = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/** Day-of-year (1–365, non-leap) → "Mon D". */
function dayToDate(doy: number): string {
  let d = Math.max(1, Math.min(365, Math.round(doy)));
  let m = 0;
  while (m < 11 && d > MONTH_LEN[m]) {
    d -= MONTH_LEN[m];
    m += 1;
  }
  return `${MONTH_ABBR[m]} ${d}`;
}

/** A cumulative series' value as of a day (monotonic → last point ≤ day). */
function valueAt(points: [number, number][], day: number): number {
  let v = 0;
  for (const [d, val] of points) {
    if (d <= day) v = val;
    else break;
  }
  return v;
}

export function LinePointer({
  series,
  W,
  H,
  ml,
  mr,
  mt,
  mb,
  maxY,
  valueSuffix = "",
}: {
  series: PointerSeries[];
  W: number;
  H: number;
  ml: number;
  mr: number;
  mt: number;
  mb: number;
  maxY: number;
  valueSuffix?: string;
}) {
  const iw = W - ml - mr;
  const ih = H - mt - mb;
  const ref = useRef<HTMLDivElement>(null);
  const [day, setDay] = useState<number | null>(null);

  // SVG-space mappers (must match LineChart's own x()/y()).
  const x = (d: number) => ml + ((d - 1) / 365) * iw;
  const y = (v: number) => mt + ih - (v / maxY) * ih;

  const track = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Pointer x → SVG viewBox x → day-of-year, clamped to the plot.
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const d = Math.round(((vx - ml) / iw) * 365 + 1);
    setDay(Math.max(1, Math.min(365, d)));
  };

  const guideLeft = day != null ? (x(day) / W) * 100 : 0;
  // Keep the tooltip off the chart's edges so it doesn't clip.
  const tipLeft = Math.max(15, Math.min(85, guideLeft));

  // A series only has a value where its line is actually drawn — up to its
  // last data point (its last logged day). Past that, valueAt would flat-
  // extend the last total, so the current year (whose line stops at today)
  // would bleed its year-to-date count across every future day. Report
  // only the series in range; hide the readout entirely if none are.
  const inRange =
    day == null
      ? []
      : series.filter((s) => s.points.length > 0 && day <= s.points[s.points.length - 1][0]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      onPointerMove={track}
      onPointerDown={track}
      onPointerLeave={() => setDay(null)}
      style={layerStyle}
    >
      {day != null && inRange.length > 0 ? (
        <>
          <div
            style={{
              ...guideStyle,
              left: `${guideLeft}%`,
              top: `${(mt / H) * 100}%`,
              height: `${(ih / H) * 100}%`,
            }}
          />
          {inRange.map((s) => (
            <div
              key={s.label}
              style={{
                ...dotStyle,
                left: `${guideLeft}%`,
                top: `${(y(valueAt(s.points, day)) / H) * 100}%`,
                background: s.color,
              }}
            />
          ))}
          <div style={{ ...tipStyle, left: `${tipLeft}%`, top: `${(mt / H) * 100}%` }}>
            <div style={tipHeadStyle}>{dayToDate(day)}</div>
            {inRange.map((s) => (
              <div key={s.label} style={tipRowStyle}>
                <span style={{ ...swatchStyle, background: s.color }} />
                <span style={tipLabelStyle}>{s.label}</span>
                <span style={tipValStyle}>
                  {Math.round(valueAt(s.points, day))}
                  {valueSuffix}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// The layer covers the whole SVG box. `touch-action: pan-y` lets a
// vertical swipe still scroll the page while horizontal drags scrub.
const layerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  cursor: "crosshair",
  touchAction: "pan-y",
};

const guideStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  background: "var(--border-interactive)",
  transform: "translateX(-50%)",
  pointerEvents: "none",
};

const dotStyle: CSSProperties = {
  position: "absolute",
  width: 8,
  height: 8,
  borderRadius: "50%",
  transform: "translate(-50%, -50%)",
  border: "1.5px solid var(--surface-default)",
  pointerEvents: "none",
};

const tipStyle: CSSProperties = {
  position: "absolute",
  transform: "translateX(-50%)",
  zIndex: 20,
  minWidth: "max-content",
  padding: "7px 9px",
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--border-radius-sm)",
  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.18)",
  pointerEvents: "none",
};

const tipHeadStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-body)",
  marginBottom: 5,
  letterSpacing: "0.03em",
};

const tipRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 7,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.5,
};

const swatchStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 2,
};

const tipLabelStyle: CSSProperties = {
  color: "var(--text-caption)",
};

const tipValStyle: CSSProperties = {
  color: "var(--text-body)",
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
};
