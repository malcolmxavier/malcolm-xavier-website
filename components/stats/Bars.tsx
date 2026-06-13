// ─────────────────────────────────────────────────────────────────
// Bars — a horizontal bar chart (single series).
//
// The dashboard's most common chart: a ranked list of labels with a
// proportional bar and a value. Ported from the sketch's bars(). Each
// bar's width is its share of the largest value, so the top bar is
// always full and the rest scale against it.
//
// Direction A: the fill is the cluster BRAND hue, delivered through
// currentColor from the `.stats-brand-fill` class the wrapper carries
// (theme- and sub-brand-aware — see app/components.css). Pass an explicit
// `fill` to override (e.g. a categorical token on the Connected page).
//
// Accessibility: the list is an <ol> of <li>s, each carrying a single
// aria-label ("{label}: {value}") so a screen reader announces one clean
// fact per row; the visual track/fill/label are aria-hidden.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import Link from "next/link";
import { Tip } from "./Tip";

export type BarRow = [label: string, value: number];

export function Bars({
  rows,
  /** Suffix appended to the displayed value (e.g. "★"). */
  valueSuffix = "",
  /** Override the fill color (defaults to the brand currentColor). */
  fill = "currentColor",
  /** How to render the numeric value (defaults to as-is). */
  formatValue,
  /** Hover-chip text per row; defaults to "{label}: {value}{suffix}". */
  tipFor,
  /** Per-row deep-link: return a URL for the row's SUBJECT (an entity →
   *  filtered reviews; a title → its detail page) or undefined for no
   *  link. When present, the whole row becomes a link. */
  hrefFor,
}: {
  rows: BarRow[];
  valueSuffix?: string;
  fill?: string;
  formatValue?: (v: number) => string;
  tipFor?: (label: string, value: number) => string;
  hrefFor?: (label: string) => string | undefined;
}) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  const fmt = formatValue ?? ((v: number) => String(v));
  return (
    <ol className="stats-brand-fill" style={listStyle}>
      {rows.map(([label, value]) => {
        const pct = (value / max) * 100;
        const aria = `${label}: ${fmt(value)}${valueSuffix}`;
        // The chip can add context the inline value can't (e.g. share of
        // corpus); it also shows the full label when the row is ellipsed.
        const tip = tipFor ? tipFor(label, value) : aria;
        const href = hrefFor?.(label);
        const inner = (
          <>
            <span aria-hidden="true" style={labelStyle}>
              {label}
            </span>
            <span aria-hidden="true" style={trackStyle}>
              <span
                style={{
                  ...fillStyle,
                  width: `max(${pct.toFixed(1)}%, 2px)`,
                  background: fill,
                }}
              />
            </span>
            <span aria-hidden="true" style={valueStyle}>
              {fmt(value)}
              {valueSuffix}
            </span>
          </>
        );
        return (
          <li
            key={label}
            className="stats-tip"
            style={href ? undefined : rowStyle}
            aria-label={href ? undefined : aria}
          >
            {href ? (
              // color:inherit so the child spans' own colors win over the
              // sub-brand link cascade; opacity (not color) carries hover
              // so the !important hover rule can't defeat it.
              <Link
                href={href}
                aria-label={aria}
                style={rowLinkStyle}
                className="hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
            <Tip>{tip}</Tip>
          </li>
        );
      })}
    </ol>
  );
}

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

// label | track | value — the label column is fixed so the bars align.
const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(72px, 96px) 1fr 40px",
  gap: 9,
  alignItems: "center",
  fontSize: 12,
};

// Same grid as rowStyle, but for the linked variant: reset the anchor's
// own color/decoration so the child spans render exactly as the
// non-linked row does (the deep-link is invisible chrome until hover).
const rowLinkStyle: CSSProperties = {
  ...rowStyle,
  color: "inherit",
  textDecoration: "none",
};

// Label in the readable secondary font; the value column stays mono.
const labelStyle: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "var(--text-body)",
  fontFamily: "var(--font-secondary)",
};

const trackStyle: CSSProperties = {
  background: "var(--chart-grid)",
  borderRadius: "var(--border-radius-sm)",
  height: 14,
  overflow: "hidden",
};

const fillStyle: CSSProperties = {
  display: "block",
  height: "100%",
  borderRadius: "var(--border-radius-sm)",
};

const valueStyle: CSSProperties = {
  textAlign: "right",
  color: "var(--text-caption)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
};
