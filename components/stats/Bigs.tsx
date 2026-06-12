// ─────────────────────────────────────────────────────────────────
// Bigs — a row of headline stat figures.
//
// The "lifetime" / "world cinema lean" / "theatrical" style tiles: a few
// big numbers each with a small label underneath. Ported from the
// sketch's bigs() helper. Plain text, so no special a11y handling beyond
// readable markup — each figure is a <div> with its number and label.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

export type BigItem = { n: string | number; label: string };

export function Bigs({
  items,
  /** Center the figure block horizontally + center each figure's text. */
  center = true,
}: {
  items: BigItem[];
  center?: boolean;
}) {
  return (
    <div style={{ ...rowStyle, justifyContent: center ? "center" : "flex-start" }}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            ...cellStyle,
            alignItems: center ? "center" : "flex-start",
            textAlign: center ? "center" : "left",
          }}
        >
          <span style={numberStyle}>{it.n}</span>
          <span style={labelStyle}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 28,
  rowGap: 16,
};

const cellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const numberStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 600,
  color: "var(--text-heading)",
  fontVariantNumeric: "tabular-nums",
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.04em",
  color: "var(--text-caption)",
};
