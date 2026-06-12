// ─────────────────────────────────────────────────────────────────
// ColumnChart — a vertical bar (column) chart.
//
// Used for the rating distributions, where the 0.5–5★ buckets read best
// rising from a shared baseline (matching the live /films + /television
// SummaryPanel histograms). Ported from the sketch's vbars().
//
// Direction A: brand-hue fill via currentColor (the `.stats-brand-fill`
// wrapper). Each column is an <li> with one aria-label; the bars and the
// x-axis labels are aria-hidden so a screen reader hears one fact per
// column, not three.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import { Tip, tipTrigger } from "./Tip";

export type Column = [label: string, value: number];

export function ColumnChart({
  columns,
  /** Builds each column's screen-reader label; defaults to "{label}: {value}". */
  ariaLabelFor,
  /** Builds each column's hover-chip text; defaults to the aria label. */
  tipFor,
  /** Min chart height in px (mobile floor; flex-grows on tall tiles). */
  minHeight = 160,
}: {
  columns: Column[];
  ariaLabelFor?: (label: string, value: number) => string;
  tipFor?: (label: string, value: number) => string;
  minHeight?: number;
}) {
  const max = Math.max(...columns.map((c) => c[1]), 1);
  const label = ariaLabelFor ?? ((l: string, v: number) => `${l}: ${v}`);
  const tip = tipFor ?? label;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <ol
        className="stats-brand-fill"
        style={{ ...colsStyle, minHeight }}
      >
        {columns.map(([l, value]) => {
          const pct = (value / max) * 100;
          return (
            // The whole column is the hover/focus target (full-height, so
            // hovering anywhere over it works, not just the bar); the
            // count is otherwise invisible here, so the column opts into
            // focusability — keyboard users can reveal it too. aria-label
            // carries the same fact to assistive tech.
            <li
              key={l}
              {...tipTrigger(true)}
              style={colStyle}
              aria-label={label(l, value)}
            >
              <span
                aria-hidden="true"
                style={{
                  ...barStyle,
                  height: value > 0 ? `max(${pct.toFixed(1)}%, 2px)` : 0,
                }}
              />
              <Tip>{tip(l, value)}</Tip>
            </li>
          );
        })}
      </ol>
      {/* X-axis labels on a parallel row so column heights aren't pushed
          by label leading; aria-hidden (each column's aria-label already
          names its bucket). */}
      <div aria-hidden="true" style={axisStyle}>
        {columns.map(([l]) => (
          <span key={l} style={{ flex: 1, textAlign: "center" }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

const colsStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  alignItems: "stretch",
  gap: 4,
  borderBottom: "1px solid var(--border-default)",
};

const colStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "flex-end",
};

const barStyle: CSSProperties = {
  width: "100%",
  background: "currentColor",
  borderTopLeftRadius: "var(--border-radius-sm)",
  borderTopRightRadius: "var(--border-radius-sm)",
};

const axisStyle: CSSProperties = {
  display: "flex",
  gap: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--text-caption)",
  letterSpacing: "0.04em",
};
