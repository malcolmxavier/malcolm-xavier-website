// ─────────────────────────────────────────────────────────────────
// Diverging — genre rating vs. the corpus baseline.
//
// A center-anchored bar chart: each genre's bar extends right (rated
// above your average) or left (below), proportional to the gap. Ported
// from the sketch's divergingGenreTile rendering.
//
// Above/below the baseline is a semantic pair, so it overrides the
// brand-hue rule: positive bars use --chart-positive (green), negative
// bars use --chart-accent (the orange-red), both theme-aware tokens.
//
// Accessibility: an <ol> where each <li> carries one aria-label
// ("{genre}, logged {count}: {+/-}{delta}★ vs. baseline"); the track,
// fill, and zero-line are aria-hidden.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import Link from "next/link";
import type { DivergingGenre } from "@/lib/feeds/stats/distributions";
import { Tip } from "./Tip";

export function Diverging({
  rows,
  /** The corpus average the deltas are measured against — lets the chip
      show each genre's absolute average, not just its gap. */
  baseline,
  /** Per-row deep-link for the genre; undefined = no link. */
  hrefFor,
}: {
  rows: DivergingGenre;
  baseline?: number;
  hrefFor?: (genre: string) => string | undefined;
}) {
  // Scale every bar against the largest absolute delta so the widest bar
  // fills half the track (the center is the baseline).
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)), 0.01);
  return (
    <ol style={listStyle}>
      {rows.map((r) => {
        const positive = r.delta >= 0;
        const halfWidth = (Math.abs(r.delta) / maxAbs) * 50;
        const sign = positive ? "+" : "−";
        const readout = `${r.genre}: ${sign}${Math.abs(r.delta).toFixed(
          2,
        )}★ vs. baseline (logged ${r.count})`;
        // When the baseline is known, the chip resolves the gap into the
        // genre's actual average (baseline + delta) — more legible than a
        // bare ±delta.
        const tip =
          baseline != null
            ? `${r.genre} — ${(baseline + r.delta).toFixed(2)}★ avg vs. ${baseline.toFixed(
                2,
              )}★ baseline · logged ${r.count}`
            : readout;
        const href = hrefFor?.(r.genre);
        const inner = (
          <>
            <span aria-hidden="true" style={labelStyle}>
              {r.genre}
              <span style={countStyle}>{r.count}</span>
            </span>
            <span aria-hidden="true" style={trackStyle}>
              <span
                style={{
                  ...fillStyle,
                  left: positive ? "50%" : `${50 - halfWidth}%`,
                  width: `${halfWidth}%`,
                  background: positive
                    ? "var(--chart-positive)"
                    : "var(--chart-accent)",
                }}
              />
            </span>
            <span
              aria-hidden="true"
              style={{
                ...valueStyle,
                color: positive
                  ? "var(--chart-positive)"
                  : "var(--chart-accent)",
              }}
            >
              {sign}
              {Math.abs(r.delta).toFixed(2)}★
            </span>
          </>
        );
        return (
          <li
            key={r.genre}
            className="stats-tip"
            style={href ? undefined : rowStyle}
            aria-label={href ? undefined : readout}
          >
            {href ? (
              <Link
                href={href}
                aria-label={readout}
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

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(84px, 110px) 1fr 52px",
  gap: 9,
  alignItems: "center",
  fontSize: 12,
};

const rowLinkStyle: CSSProperties = {
  ...rowStyle,
  color: "inherit",
  textDecoration: "none",
};

const labelStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "baseline",
  whiteSpace: "nowrap",
  overflow: "hidden",
  color: "var(--text-body)",
  fontFamily: "var(--font-secondary)",
};

const countStyle: CSSProperties = {
  fontSize: 10,
  color: "var(--text-caption)",
};

const trackStyle: CSSProperties = {
  position: "relative",
  height: 14,
  background: "var(--chart-grid)",
  borderRadius: "var(--border-radius-sm)",
};

const fillStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  borderRadius: "var(--border-radius-sm)",
};

const valueStyle: CSSProperties = {
  textAlign: "right",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
};
