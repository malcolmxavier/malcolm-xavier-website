"use client";

// ─────────────────────────────────────────────────────────────────
// RatingByLevelTabs — the TV rating distribution, toggled by review
// level (Seasons / Shows / Episodes).
//
// The one interactive tile on the dashboards. Models the existing
// AllOrWatchingToggle / SegmentedButton pattern: a real <button> group
// with aria-pressed, switching which level's column chart shows. Per-
// level distributions are kept separate on purpose — episode logging
// only began this year, so a combined average misleads (see the tile
// note).
//
// Progressive enhancement: all three panes render in the markup; the
// inactive ones are hidden via `hidden`. With JS the buttons toggle
// which is visible; without JS the default (Seasons) stays shown and the
// lifetime tile already surfaces all three averages, so no data is lost.
// ─────────────────────────────────────────────────────────────────

import { useState, type CSSProperties } from "react";
import { ColumnChart } from "./ColumnChart";
import type { TvStats } from "@/lib/feeds/stats/tv-stats";

type Level = "season" | "show" | "episode";
const ORDER: Level[] = ["season", "show", "episode"];
const LABELS: Record<Level, string> = {
  season: "Seasons",
  show: "Shows",
  episode: "Episodes",
};

export function RatingByLevelTabs({
  data,
}: {
  data: TvStats["ratingByLevel"];
}) {
  const [active, setActive] = useState<Level>("season");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div role="group" aria-label="Review level" style={groupStyle}>
        {ORDER.map((lvl) => {
          const isActive = lvl === active;
          return (
            <button
              key={lvl}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(lvl)}
              style={isActive ? activeBtnStyle : btnStyle}
              className="transition-colors motion-reduce:transition-none"
            >
              {LABELS[lvl]}
            </button>
          );
        })}
      </div>
      {ORDER.map((lvl) => {
        const d = data[lvl];
        return (
          <div key={lvl} hidden={lvl !== active}>
            <ColumnChart
              columns={d.bars}
              ariaLabelFor={(rating, count) =>
                `${LABELS[lvl]}, ${rating} stars: ${count} reviews`
              }
            />
            <p style={noteStyle}>
              {LABELS[lvl]}: avg{" "}
              <strong style={{ color: "var(--text-heading)" }}>
                {d.avg.toFixed(2)}★
              </strong>{" "}
              across {d.n.toLocaleString()} rated reviews.
            </p>
          </div>
        );
      })}
    </div>
  );
}

const groupStyle: CSSProperties = {
  display: "flex",
  gap: 6,
};

// Mono micro-caps pills, matching the cluster-rail register but at a
// secondary weight (this is a control inside a tile, not page nav).
const btnBaseStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "6px 12px",
  borderRadius: "var(--border-radius-sm)",
  cursor: "pointer",
  outlineColor: "var(--border-focus)",
};

const btnStyle: CSSProperties = {
  ...btnBaseStyle,
  background: "transparent",
  color: "var(--text-body)",
  border: "1px solid var(--border-interactive)",
};

const activeBtnStyle: CSSProperties = {
  ...btnBaseStyle,
  background: "var(--primary-700)",
  color: "var(--foundation-white)",
  border: "1px solid var(--primary-700)",
};

const noteStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.5,
  color: "var(--text-caption)",
  margin: "8px 0 0",
};
