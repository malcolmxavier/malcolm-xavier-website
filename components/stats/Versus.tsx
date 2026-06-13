// ─────────────────────────────────────────────────────────────────
// Versus — the two-column "most logged vs. highest rated" data story.
//
// The signature entity tile (studios, actors, directors, networks, …):
// a left column ranked by count and a right column ranked by (shrunk)
// rating. Ported from the sketch's versus(). Each side is a labelled
// list; the right side's values carry the ★ suffix.
//
// Accessibility: two <section>s with their <h4> sub-headings as
// accessible names, each containing an ordered list. Plain text values,
// so no aria-hidden gymnastics needed.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

export type VersusRow = [label: string, value: number];

export function Versus({
  leftTitle,
  left,
  rightTitle,
  right,
  /** Suffix on the right column's values (the rating side). */
  rightSuffix = "★",
}: {
  leftTitle: string;
  left: VersusRow[];
  rightTitle: string;
  right: VersusRow[];
  rightSuffix?: string;
}) {
  return (
    <div style={twoColStyle}>
      <Column title={leftTitle} rows={left} suffix="" />
      <Column title={rightTitle} rows={right} suffix={rightSuffix} />
    </div>
  );
}

function Column({
  title,
  rows,
  suffix,
}: {
  title: string;
  rows: VersusRow[];
  suffix: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <h4 style={miniHeadingStyle}>{title}</h4>
      <ol style={listStyle}>
        {rows.map(([label, value]) => (
          <li key={label} style={rowStyle}>
            <span style={labelStyle}>{label}</span>
            <span style={valueStyle}>
              {/* Rating column shows two decimals; count column is an int. */}
              {suffix ? value.toFixed(2) + suffix : value}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const twoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

const miniHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-caption)",
  margin: "0 0 8px",
  fontWeight: 600,
};

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
};

// Labels read in the secondary (non-mono) font so a column of names
// doesn't fatigue; the value column stays mono + tabular for alignment.
const labelStyle: CSSProperties = {
  color: "var(--text-body)",
  fontFamily: "var(--font-secondary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const valueStyle: CSSProperties = {
  color: "var(--text-caption)",
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
};
