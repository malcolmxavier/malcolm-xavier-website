// ─────────────────────────────────────────────────────────────────
// Dumbbell — paired film vs. TV rating per shared genre (Connected).
//
// Each row is a genre with two dots on a shared [lo, hi] rating scale —
// the film average and the TV average — joined by a bar, so the gap
// reads at a glance. Ported from the sketch's dumbbell().
//
// Cross-brand by nature, so the two dots carry the two BRAND hues
// explicitly: film = orange (--chart-film), TV = blue (--chart-tv). On
// the Connected page (no [data-subbrand] wrapper) those resolve to the
// raw brand ramps via the local style below.
//
// Accessibility: an <ol> whose rows each carry one aria-label
// ("{genre}: film {a}★, TV {b}★"); the track, bar, and dots are
// aria-hidden. A legend names the two dot colors.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import type { GenreDumbbell } from "@/lib/feeds/stats/connected-stats";
import { LegendSwatches } from "./Legend";
import { Tip } from "./Tip";

// The two brand hues, referenced directly (the Connected page has no
// sub-brand wrapper to resolve --primary-* through). Film = orange-600 /
// TV = blue-500 in light; the page's dark overrides lift them.
const FILM_DOT = "var(--orange-600)";
const TV_DOT = "var(--blue-500)";

export function Dumbbell({ rows }: { rows: GenreDumbbell[] }) {
  // Pad the rating range slightly so dots aren't pinned to the edges.
  const vals = rows.flatMap((r) => [r.filmAvg, r.tvAvg]);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const pad = (hi - lo) * 0.18 || 0.2;
  lo -= pad;
  hi += pad;
  const pct = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ol style={listStyle}>
        {rows.map((r) => {
          const pa = pct(r.filmAvg);
          const pb = pct(r.tvAvg);
          const barLeft = Math.min(pa, pb);
          const barWidth = Math.abs(pb - pa);
          // Signed film→TV gap for the hover chip (positive = TV rates higher).
          const gap = r.tvAvg - r.filmAvg;
          const gapSign = gap >= 0 ? "+" : "−";
          return (
            <li
              key={r.label}
              className="stats-tip"
              style={rowStyle}
              aria-label={`${r.label}: film ${r.filmAvg.toFixed(2)} stars, TV ${r.tvAvg.toFixed(2)} stars`}
            >
              <span aria-hidden="true" style={labelStyle}>
                {r.label}
              </span>
              <span aria-hidden="true" style={trackStyle}>
                <span
                  style={{
                    ...barStyle,
                    left: `${barLeft}%`,
                    width: `${barWidth}%`,
                  }}
                />
                <span style={{ ...dotStyle, left: `${pa}%`, background: FILM_DOT }} />
                <span style={{ ...dotStyle, left: `${pb}%`, background: TV_DOT }} />
              </span>
              <span aria-hidden="true" style={valueStyle}>
                {r.filmAvg.toFixed(2)} / {r.tvAvg.toFixed(2)}
              </span>
              <Tip>{`${r.label} — film ${r.filmAvg.toFixed(2)}★ · TV ${r.tvAvg.toFixed(2)}★ · gap ${gapSign}${Math.abs(gap).toFixed(2)}`}</Tip>
            </li>
          );
        })}
      </ol>
      <LegendSwatches
        items={[
          { label: "Film", color: FILM_DOT },
          { label: "TV", color: TV_DOT },
        ]}
      />
    </div>
  );
}

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 7,
};

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(84px, 110px) 1fr 78px",
  gap: 9,
  alignItems: "center",
  fontSize: 12,
};

const labelStyle: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "var(--text-body)",
  fontFamily: "var(--font-mono)",
};

const trackStyle: CSSProperties = {
  position: "relative",
  height: 14,
};

const barStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  height: 3,
  transform: "translateY(-50%)",
  background: "var(--border-interactive)",
  borderRadius: 2,
};

const dotStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  width: 10,
  height: 10,
  borderRadius: "50%",
  transform: "translate(-50%, -50%)",
};

const valueStyle: CSSProperties = {
  textAlign: "right",
  color: "var(--text-caption)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
};
