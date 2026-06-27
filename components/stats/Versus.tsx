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

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

export type VersusRow = [label: string, value: number];

// Default copy when a solo tile gives no bespoke note. The collapse engine
// flags `solo` when the highest-rated column dropped below its ranking floor;
// the panel says so in place of a stunted, half-empty second column.
const DEFAULT_WITHHELD_NOTE =
  "Widen the filters to rank this column by rating—needs 3+ distinct entries.";

export function Versus({
  leftTitle,
  left,
  rightTitle,
  right,
  /** Suffix on the right column's values (the rating side). */
  rightSuffix = "★",
  /** Per-row deep-link for the row's entity (both columns share the
   *  vocabulary); return undefined for rows that shouldn't link. */
  hrefFor,
  /** When true (collapse engine's `soloColumn`), the right/highest-rated column
   *  fell below its ranking floor: render the surviving left column plus a
   *  withheld-explanation panel instead of a lopsided two-list chart. */
  solo = false,
  /** Optional bespoke copy for the withheld panel (per-tile gate wording). */
  withheldNote,
}: {
  leftTitle: string;
  left: VersusRow[];
  rightTitle: string;
  right: VersusRow[];
  rightSuffix?: string;
  hrefFor?: (label: string) => string | undefined;
  solo?: boolean;
  withheldNote?: ReactNode;
}) {
  return (
    <div style={twoColStyle}>
      <Column title={leftTitle} rows={left} suffix="" hrefFor={hrefFor} />
      {solo ? (
        <WithheldColumn title={rightTitle} note={withheldNote ?? DEFAULT_WITHHELD_NOTE} />
      ) : (
        <Column title={rightTitle} rows={right} suffix={rightSuffix} hrefFor={hrefFor} />
      )}
    </div>
  );
}

/** The right column when its ranking is withheld: keeps the column heading so
 *  the tile still reads as a comparison-in-waiting, with a muted note under it
 *  explaining why the ranking isn't shown rather than leaving a stunted list. */
function WithheldColumn({ title, note }: { title: string; note: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <h4 style={miniHeadingStyle}>{title}</h4>
      <p style={withheldNoteStyle}>{note}</p>
    </div>
  );
}

function Column({
  title,
  rows,
  suffix,
  hrefFor,
}: {
  title: string;
  rows: VersusRow[];
  suffix: string;
  hrefFor?: (label: string) => string | undefined;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <h4 style={miniHeadingStyle}>{title}</h4>
      <ol style={listStyle}>
        {rows.map(([label, value]) => {
          // Rating column shows two decimals; count column is an int.
          const valueText = suffix ? value.toFixed(2) + suffix : String(value);
          const href = hrefFor?.(label);
          const content = (
            <>
              <span style={labelStyle}>{label}</span>
              <span style={valueStyle}>{valueText}</span>
            </>
          );
          return (
            <li key={label} style={href ? undefined : rowStyle}>
              {href ? (
                <Link
                  href={href}
                  style={rowLinkStyle}
                  className="hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const twoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--scale-500)", // 20px
};

const miniHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-caption)",
  margin: "0 0 var(--scale-200)", // 8px
  // Weight inherits (matching the canonical Kicker mono-caption register);
  // an inline 600 here re-split the heading weighting the tile-title fix unified.
};

// The withheld-ranking note reads as prose, so it takes the secondary reading
// font (not mono) at the body-caption color — visibly a sentence, not a row.
const withheldNoteStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--text-caption)",
  margin: 0,
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

// Linked-row variant: same flex row, anchor color/decoration reset so
// the child spans render identically to the non-linked row.
const rowLinkStyle: CSSProperties = {
  ...rowStyle,
  color: "inherit",
  textDecoration: "none",
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
