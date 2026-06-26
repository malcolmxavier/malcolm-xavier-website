// ─────────────────────────────────────────────────────────────────
// Heatmap — a rating grid (e.g. budget tier × release era).
//
// Rendered as a real <table>: rows and columns are genuinely tabular
// data, so <th scope> headers give screen readers row/column context for
// free, and the value in each cell is always high-contrast text — the
// color tint only reinforces the pattern, it never carries it alone.
//
// Direction A: the tint is the cluster BRAND hue (currentColor via
// `.stats-brand-fill`), mixed into the card surface in proportion to the
// (shrunk) rating. The mix is CAPPED below full strength so cell text
// (--text-body) clears AA against the tint in both themes — a saturated
// brand block would flip the needed text polarity by theme. Empty cells
// render as an em dash.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import Link from "next/link";
import type { HeatGrid } from "@/lib/feeds/stats/chart-data";
import { Tip } from "./Tip";

export function Heatmap({
  grid,
  caption,
  /** Per-cell deep-link: return a URL for the cell's row×col facets (e.g.
   *  release type × era → ?releaseType=&decade=) or undefined for no link.
   *  Empty cells are never linked. */
  hrefFor,
}: {
  grid: HeatGrid;
  /** Visually-hidden table caption naming what the grid shows. */
  caption: string;
  hrefFor?: (row: string, col: string) => string | undefined;
}) {
  // Normalize the tint against the present min/max so the pattern fills
  // the available range.
  const present = grid.cells.flat().filter((c): c is { v: number; n: number } => c !== null);
  const lo = Math.min(...present.map((c) => c.v));
  const hi = Math.max(...present.map((c) => c.v));
  // The strongest cell goes to nearly pure --stats-heat so it reads as a
  // vivid orange rather than a washed tan (mixing a light orange into the
  // surface at a low cap desaturates it). 0.16 floor keeps the weakest
  // cell a visible tint. The cell text (--text-body) clears AA at full
  // strength in both themes: black on orange-500 ≈ 8.9:1 light, white on
  // orange-700 ≈ 5.8:1 dark (the dark --stats-heat is the -700 step for
  // exactly this reason — see app/components.css).
  const mix = (v: number) => 0.16 + 0.84 * ((v - lo) / (hi - lo || 1));

  return (
    <table className="stats-brand-fill" style={tableStyle}>
      <caption style={srOnly}>{caption}</caption>
      <thead>
        <tr>
          <td style={cornerStyle} />
          {grid.cols.map((col) => (
            <th key={col} scope="col" style={colHeadStyle}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {grid.rows.map((row, ri) => (
          <tr key={row}>
            <th scope="row" style={rowHeadStyle}>
              {row}
            </th>
            {grid.cols.map((col, ci) => {
              const cell = grid.cells[ri][ci];
              if (!cell) {
                return (
                  // No aria-label: it would REPLACE the cell's accessible
                  // name and strip the row/column header context. The em-dash
                  // plus the table's scope=row/col headers already convey
                  // "this intersection is empty" (SC 1.3.1).
                  <td key={col} style={emptyCellStyle}>
                    —
                  </td>
                );
              }
              const m = mix(cell.v);
              const href = hrefFor?.(row, col);
              const inner = (
                <>
                  <span style={cellValueStyle}>{cell.v.toFixed(2)}</span>
                  {/* Thin samples flagged so a low-n cell isn't over-read. */}
                  <span style={cellNStyle}>
                    n{cell.n}
                    {cell.n < 5 ? " *" : ""}
                  </span>
                </>
              );
              return (
                <td
                  key={col}
                  className="stats-tip"
                  style={{
                    ...cellStyle,
                    padding: href ? 0 : cellStyle.padding,
                    // --stats-heat (a brighter brand step than the bars)
                    // rather than currentColor: the cell's own text color
                    // is --text-body, so currentColor here would be the
                    // text, not the brand. See app/components.css.
                    background: `color-mix(in srgb, var(--stats-heat) ${(m * 100).toFixed(0)}%, var(--surface-default))`,
                  }}
                >
                  {href ? (
                    // color:inherit keeps the cell text at --text-body (which
                    // is AA over the capped tint in both themes) rather than
                    // the sub-brand link color; opacity carries hover. The
                    // link fills the cell so the whole tinted block is the
                    // tap target (≥ the cell's own padding).
                    <Link
                      href={href}
                      aria-label={`${row} × ${col} — ${cell.v.toFixed(2)} star average`}
                      style={cellLinkStyle}
                      className="hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                  {/* The cell shows its number; the chip names both axes so
                      the value reads in full context on hover. */}
                  <Tip>{`${row} × ${col} — ${cell.v.toFixed(2)}★ avg (n ${cell.n}${cell.n < 5 ? ", thin" : ""})`}</Tip>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const tableStyle: CSSProperties = {
  borderCollapse: "separate",
  borderSpacing: 4,
  width: "100%",
  tableLayout: "fixed",
};

const cornerStyle: CSSProperties = { width: "22%" };

const colHeadStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-caption)",
  fontWeight: 600,
  textAlign: "center",
  padding: 2,
};

const rowHeadStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-caption)",
  textAlign: "left",
  fontWeight: 400,
  paddingRight: 6,
};

const cellStyle: CSSProperties = {
  borderRadius: "var(--border-radius-sm)",
  textAlign: "center",
  padding: "8px 4px",
  color: "var(--text-body)",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.2,
};

// Linked cell: fill the whole <td> (which drops its own padding to 0 when
// linked) so the tinted block is the tap target; restore the cell padding
// here. color:inherit so the value stays --text-body (AA over the tint).
const cellLinkStyle: CSSProperties = {
  display: "block",
  padding: "8px 4px",
  color: "inherit",
  textDecoration: "none",
  borderRadius: "var(--border-radius-sm)",
};

const cellValueStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  // Explicit color so that, when the cell is a link, the value stays
  // --text-body (AA over the capped tint) rather than inheriting the
  // sub-brand `a !important` link color. Mirrors the n-count span + Bars.
  color: "var(--text-body)",
};

// The sample-size line is de-emphasised by SIZE (9px vs the 13px value),
// not by a muted colour: a low-contrast grey can't clear AA over the
// saturated tint, so it stays at the high-contrast --text-body.
const cellNStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  color: "var(--text-body)",
};

const emptyCellStyle: CSSProperties = {
  ...cellStyle,
  background: "var(--surface-muted)",
  color: "var(--text-caption)",
};

// Visually-hidden but available to assistive tech (the caption).
const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
