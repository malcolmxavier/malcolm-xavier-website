"use client";

// ─────────────────────────────────────────────────────────────────
// RatingByLevelTabs — the TV rating distribution, toggled by review
// level (Seasons / Shows / Episodes).
//
// The one interactive tile on the dashboards. Mirrors the television
// LANDING's StatsBand scope toggle exactly (sibling controls in the same
// cluster should look and behave identically): a role="group" + label
// wrapping the shared SegmentedButton primitive, swapping which level's
// column chart is rendered. Per-level distributions are kept separate on
// purpose — episode logging only began this year, so a combined average
// misleads (see the tile note).
//
// One chart, not three hidden panes. The earlier build rendered all three
// panes with `hidden` (tab semantics) alongside aria-pressed buttons
// (toggle semantics) — a mixed pattern (SC 4.1.2). Like StatsBand we now
// render only the active level's chart; without JS the default (Seasons)
// still renders server-side and the lifetime tile already surfaces all
// three averages, so no data is lost.
// ─────────────────────────────────────────────────────────────────

import { useState, type CSSProperties } from "react";
import { ColumnChart } from "./ColumnChart";
import { SegmentedButton } from "@/components/primitives/SegmentedButton";
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
  /** Per-level rating-bucket key → reviews-filter URL (e.g. show-level
   *  rating buckets → ?rating=k&cardKind=show). A plain object (not a
   *  function) because this is a client component — a server-built closure
   *  can't cross the boundary. A level absent from the map isn't clickable
   *  (episode reviews aren't grid cards), and its pane shows a note. */
  ratingHrefs,
}: {
  data: TvStats["ratingByLevel"];
  ratingHrefs?: Partial<Record<Level, Record<string, string>>>;
}) {
  const [active, setActive] = useState<Level>("season");

  // Active level only — render one chart, swapped on toggle (StatsBand
  // pattern), rather than three panes hidden behind `hidden`.
  const d = data[active];
  // A level present in ratingHrefs is clickable (its columns deep-link to
  // that level's reviews); a level absent isn't — episodes aren't show/season
  // grid cards, so there's nothing to filter to.
  const levelHrefs = ratingHrefs?.[active];
  const hrefFor = levelHrefs ? (rating: string) => levelHrefs[rating] : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Scope toggle — role=group + label so AT announces what the
          segmented control governs. Container styling matches the landing's
          StatsBand toggle so the two read as the same control. */}
      <div role="group" aria-label="Review level">
        <div style={toggleRowStyle}>
          {ORDER.map((lvl) => (
            <SegmentedButton
              key={lvl}
              active={lvl === active}
              onClick={() => setActive(lvl)}
            >
              {LABELS[lvl]}
            </SegmentedButton>
          ))}
        </div>
      </div>

      <div>
        <ColumnChart
          columns={d.bars}
          hrefFor={hrefFor}
          ariaLabelFor={(rating, count) =>
            `${LABELS[active]}, ${rating} stars: ${count} reviews`
          }
          tipFor={(rating, count) =>
            `${rating}★ — ${count} ${count === 1 ? "review" : "reviews"}${
              d.n ? ` · ${Math.round((count / d.n) * 100)}% of ${LABELS[active].toLowerCase()}` : ""
            }`
          }
        />
        <p style={noteStyle}>
          {LABELS[active]}: avg{" "}
          <strong style={{ color: "var(--text-heading)" }}>
            {d.avg.toFixed(2)}★
          </strong>{" "}
          across {d.n.toLocaleString()} rated reviews.
          {ratingHrefs && !levelHrefs ? (
            <>
              {" "}
              Episode reviews live inside their show, so they aren’t a
              separate filter in the reviews grid.
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

// Toggle row — mirrors the StatsBand landing container (flex, gap 4,
// padding 4, bordered pill on the default surface) so the dashboard and
// landing controls are visually identical. fit-content keeps the pill
// hugging its three segments instead of spanning the tile.
const toggleRowStyle: CSSProperties = {
  display: "flex",
  gap: 4,
  padding: 4,
  maxWidth: "fit-content",
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--border-radius-sm)",
};

// Reading prose, so it follows the dashboard's mono→slab note treatment
// (the value stays mono via the inline <strong>).
const noteStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--text-caption)",
  margin: "8px 0 0",
};
