// ─────────────────────────────────────────────────────────────────
// SummaryPanel — lifetime stats sidebar for /television.
//
// Mirrors /films's SummaryPanel structure but with the TV-specific
// scope toggle baked in. Three modes — "Seasons" (default),
// "Shows", "Episodes" — each swap the rating-distribution chart
// to that level's pre-computed buckets and update the lead-stats
// numbers.
//
// Why a toggle rather than three separate panels: each level
// represents a different reviewing posture and the same person
// might want to scan their show-level taste profile separately
// from their season-level. Pre-computing the three distributions
// at snapshot-write time keeps the toggle client-side without
// shipping the full reviews array. The default lands on Seasons
// — most cards on /television are Season cards (216 vs 11 Show vs
// 445 Episode), so the chart starts on the level the listing
// emphasizes.
//
// Layout (top to bottom):
//   1. Mode toggle row — Seasons / Shows / Episodes
//   2. Lead stats line — `{n} reviews · {n} this year · Avg {x}★`
//   3. Rating-distribution column chart (vertical bars)
//   4. Tail stats line — top genres + most-logged decade
// ─────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { Stack } from "@/components/layout/Stack";
import { Kicker } from "@/components/typography/Kicker";
import type { TvSummary } from "@/lib/feeds/serializd-utils";

const RATING_KEYS = [
  "0.5",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "4.5",
  "5",
] as const;

type Mode = "season" | "show" | "episode";

type Props = {
  summary: TvSummary;
  /**
   * Per-level counts of reviews logged with a watchedDate in the
   * current calendar year. Derived at request time in page.tsx
   * so the numbers track `new Date()` and stay correct across the
   * year boundary (snapshot-frozen counts would silently mismatch
   * the displayed `currentYear` between Jan 1 and the next refresh).
   *
   * The panel reads `currentYearByLevel[mode]` so the in-year
   * count stays scoped to the active toggle — Show mode displays
   * Show-level reviews this year (typically 0-5), Season mode
   * displays Season-level reviews this year (typically 50-100),
   * Episode mode displays Episode-level reviews this year
   * (typically 100-300).
   */
  currentYearByLevel: { show: number; season: number; episode: number };
};

export function SummaryPanel({ summary, currentYearByLevel }: Props) {
  // Default = Season. Highest count + the level that drives most
  // listing cards. Toggle is purely visual, no URL state.
  const [mode, setMode] = useState<Mode>("season");

  const dist = summary.ratingDistributionByLevel[mode] ?? {};
  const ratingValues = Object.values(dist);
  const totalRatings = ratingValues.reduce((a, b) => a + b, 0);
  const maxBucket = Math.max(...ratingValues, 1);
  const avgRating = computeAverageRating(dist);
  const totalForMode = totalReviewsForMode(summary, mode);
  const inYearForMode = currentYearByLevel[mode];
  const topGenres = topN(summary.genreDistribution, 3);
  const topDecade = topN(summary.decadeDistribution, 1)[0];
  const watchedYear = new Date().getUTCFullYear();

  return (
    <aside aria-label="Lifetime stats" className="lg:h-full">
      <Stack gap="400" className="lg:h-full">
        {/* ─── Mode toggle row ──────────────────────────────────── */}
        <div role="group" aria-label="Rating distribution scope">
          <Kicker>Scope</Kicker>
          <div
            style={{
              display: "flex",
              gap: 4,
              marginTop: 8,
              padding: 4,
              background: "var(--surface-default)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--border-radius-sm)",
            }}
          >
            <ModeButton
              active={mode === "season"}
              onClick={() => setMode("season")}
            >
              Seasons
            </ModeButton>
            <ModeButton
              active={mode === "show"}
              onClick={() => setMode("show")}
            >
              Shows
            </ModeButton>
            <ModeButton
              active={mode === "episode"}
              onClick={() => setMode("episode")}
            >
              Episodes
            </ModeButton>
          </div>
        </div>

        {/* ─── Scope kicker ───────────────────────────────────── */}
        {/* Names what the chart's counting — same posture as
            /films's "Lifetime · all N films" kicker. Updates to
            track the toggle so the user always sees what mode is
            active even without looking back at the toggle. */}
        <Kicker>
          Lifetime · all {summary.totalShows.toLocaleString()} shows
        </Kicker>

        {/* ─── Lead stats line ──────────────────────────────────── */}
        {/* Single noun ("review") because the toggle above already
            disambiguates the level. Drops "show review" / "season
            review" / "episode review" repetition and pulls the
            line back to one row at the panel's typical width.
            ariaLabel on the parent paragraph spells out the level
            once for AT users who miss the toggle's pressed state. */}
        <p
          style={leadStatsStyle}
          aria-label={`Lifetime ${modeReviewLabel(mode, totalForMode)}: ${totalForMode.toLocaleString()} total, ${inYearForMode.toLocaleString()} in ${watchedYear}${totalRatings > 0 ? `, average ${avgRating.toFixed(2)} stars` : ""}`}
        >
          <strong style={emphasizedNumberStyle}>
            {totalForMode.toLocaleString()}
          </strong>{" "}
          {totalForMode === 1 ? "review" : "reviews"}
          {" · "}
          <strong style={emphasizedNumberStyle}>
            {inYearForMode.toLocaleString()}
          </strong>{" "}
          in {watchedYear}
          {totalRatings > 0 ? (
            <>
              {" · Avg "}
              <strong style={emphasizedNumberStyle}>
                {avgRating.toFixed(2)}
              </strong>
              ★
            </>
          ) : null}
        </p>

        {/* ─── Rating distribution (column chart) ───────────────── */}
        <div className="flex flex-col lg:flex-1" style={{ gap: 8 }}>
          <Kicker>Rating distribution</Kicker>
          <ol
            role="list"
            // star-rating-fill on the parent so each bar's
            // currentColor inherits the sitewide green pair (light
            // green-800 / dark green-400). Same treatment as /films.
            className="star-rating-fill lg:flex-1"
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              alignItems: "stretch",
              gap: 4,
              borderBottom: "1px solid var(--border-default)",
              minHeight: 140,
            }}
          >
            {RATING_KEYS.map((key) => {
              const count = dist[key] ?? 0;
              const pctOfMax = (count / maxBucket) * 100;
              const pctOfTotal =
                totalRatings > 0 ? (count / totalRatings) * 100 : 0;
              return (
                <DistributionColumn
                  key={key}
                  count={count}
                  pctOfMax={pctOfMax}
                  ariaLabel={ariaLabelFor(key, count, pctOfTotal, mode)}
                />
              );
            })}
          </ol>
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              gap: 4,
              marginTop: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-caption)",
              letterSpacing: "0.04em",
            }}
          >
            {RATING_KEYS.map((key) => (
              <span key={key} style={{ flex: 1, textAlign: "center" }}>
                {key}
              </span>
            ))}
          </div>
        </div>

        {/* ─── Tail stats — one row each so each fact stands on
            its own at micro-caption size. */}
        {topGenres.length > 0 ? (
          <p style={tailStatsStyle}>Top genres: {formatList(topGenres)}</p>
        ) : null}
        {topDecade ? (
          <p style={tailStatsStyle}>Most-logged decade: {topDecade}</p>
        ) : null}
      </Stack>
    </aside>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "6px 8px",
        border: "none",
        borderRadius: "var(--border-radius-sm)",
        cursor: "pointer",
        background: active ? "var(--text-action)" : "transparent",
        color: active ? "var(--surface-page)" : "var(--text-body)",
        outlineColor: "var(--border-focus)",
      }}
      className="hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </button>
  );
}

function DistributionColumn({
  count,
  pctOfMax,
  ariaLabel,
}: {
  count: number;
  pctOfMax: number;
  ariaLabel: string;
}) {
  return (
    <li
      aria-label={ariaLabel}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "100%",
          // Min-height of 2px when count > 0 so non-zero buckets
          // stay visible even at sub-pixel proportional heights.
          height: count > 0 ? `max(${pctOfMax}%, 2px)` : 0,
          background: "currentColor",
          borderTopLeftRadius: "var(--border-radius-sm)",
          borderTopRightRadius: "var(--border-radius-sm)",
        }}
      />
    </li>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function ariaLabelFor(
  key: string,
  count: number,
  pctOfTotal: number,
  mode: Mode,
): string {
  const label = modeReviewLabel(mode, count);
  return `${key} stars: ${count} ${label} (${pctOfTotal.toFixed(1)}% of rated ${modeReviewLabel(mode, 2)})`;
}

function modeReviewLabel(mode: Mode, count: number): string {
  const singular =
    mode === "show"
      ? "show review"
      : mode === "season"
        ? "season review"
        : "episode review";
  return count === 1 ? singular : `${singular}s`;
}

function totalReviewsForMode(summary: TvSummary, mode: Mode): number {
  return mode === "show"
    ? summary.totalShowReviews
    : mode === "season"
      ? summary.totalSeasonReviews
      : summary.totalEpisodeReviews;
}

function computeAverageRating(
  ratingDist: Record<string, number>,
): number {
  let sum = 0;
  let count = 0;
  for (const [key, n] of Object.entries(ratingDist)) {
    const value = Number.parseFloat(key);
    if (!Number.isFinite(value)) continue;
    sum += value * n;
    count += n;
  }
  return count > 0 ? sum / count : 0;
}

function topN(dist: Record<string, number>, n: number): string[] {
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// ─── Inline styles ────────────────────────────────────────────────

const leadStatsStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-sm-font-size)",
  lineHeight: "var(--p-sm-line-height)",
  color: "var(--text-body)",
  letterSpacing: "0.02em",
  margin: 0,
};

const emphasizedNumberStyle: CSSProperties = {
  fontWeight: 600,
  color: "var(--text-heading)",
};

const tailStatsStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-caption)",
  letterSpacing: "0.04em",
  lineHeight: 1.5,
  margin: 0,
};
