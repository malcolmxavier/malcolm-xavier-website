// ─────────────────────────────────────────────────────────────────
// StatsBand — the television cluster's "by the numbers" module on
// /television. The TV analog of the film StatsBand, relocated from the
// old listing-hero SummaryPanel for the same reasons (see that file).
//
// TV-specific wrinkle: the scope toggle. Three modes — Seasons (default),
// Shows, Episodes — each swap the rating-distribution chart to that
// level's pre-computed buckets and update the lead numbers, because each
// level is a distinct reviewing posture. Pre-computing the three
// distributions at snapshot-write time keeps the toggle client-side
// without shipping the full reviews array, so this is a client component
// (the only stateful landing module).
//
// Deep-links mirror the stats dashboard's clickable tiles:
//   • each rating bar → /television/reviews?rating={k}&cardKind={mode}
//     (scoped to the active toggle, exactly like the dashboard)
//   • each top genre  → /television/genre/{slug}
//   • the top decade  → /television/decade/{slug}
//   • the in-year count → /television/reviews?watchedYear={year}
// and the whole module links onward to /television/stats.
// ─────────────────────────────────────────────────────────────────

"use client";

import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import { Stack } from "@/components/layout/Stack";
import { Kicker } from "@/components/typography/Kicker";
import { Link } from "@/components/primitives/Link";
import { SegmentedButton } from "@/components/primitives/SegmentedButton";
import { ColumnChart, type Column } from "@/components/stats/ColumnChart";
import { slugifyEntity } from "@/lib/feeds/slug";
import { slugifyGenre } from "@/lib/feeds/serializd-utils";
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
   * Per-level counts of reviews logged in the current calendar year,
   * derived at request time in page.tsx (so they track `new Date()` and
   * stay correct across the year boundary). Both maps apply the
   * miniseries double-count rule (see lib/feeds/serializd-mode-counts.mjs)
   * so they stay consistent with the lifetime totals shown alongside.
   */
  currentYearByLevel: { show: number; season: number; episode: number };
  /**
   * Per-mode average rating across reviews logged this year. Null when a
   * mode has zero rated reviews this year — the in-year average is then
   * suppressed rather than rendering NaN★.
   */
  currentYearAvgByLevel: {
    show: number | null;
    season: number | null;
    episode: number | null;
  };
};

export function StatsBand({
  summary,
  currentYearByLevel,
  currentYearAvgByLevel,
}: Props) {
  // Default = Season: the highest count and the level most listing cards
  // sit at. The toggle is purely visual — no URL state.
  const [mode, setMode] = useState<Mode>("season");

  const dist = summary.ratingDistributionByLevel[mode] ?? {};
  const ratingValues = Object.values(dist);
  const totalRatings = ratingValues.reduce((a, b) => a + b, 0);
  const avgRating = computeAverageRating(dist);
  const totalForMode = totalReviewsForMode(summary, mode);
  const inYearForMode = currentYearByLevel[mode];
  const inYearAvgForMode = currentYearAvgByLevel[mode];
  const topGenres = topN(summary.genreDistribution, 3);
  const topDecade = topN(summary.decadeDistribution, 1)[0];
  const watchedYear = new Date().getUTCFullYear();

  const columns: Column[] = RATING_KEYS.map((k) => [k, dist[k] ?? 0]);
  // Rating bars carry the active mode forward as cardKind, so the landing
  // and the dashboard deep-link identically (a Season-mode 4★ bar lands
  // on Season-level 4★ reviews). Episode mode is the exception: episode
  // reviews aren't show/season cards, so the grid has nothing to filter
  // to — those bars stay non-clickable (matching the stats dashboard,
  // which omits episode rating links for the same reason).
  const ratingHref = (k: string) =>
    mode !== "episode" && (dist[k] ?? 0) > 0
      ? `/television/reviews?rating=${k}&cardKind=${mode}`
      : undefined;
  const ratingAria = (label: string, value: number) => {
    const pct = totalRatings > 0 ? (value / totalRatings) * 100 : 0;
    const noun = modeReviewLabel(mode, value);
    return `${label} stars: ${value} ${noun} (${pct.toFixed(1)}% of rated ${modeReviewLabel(mode, 2)})`;
  };
  const ratingTip = (label: string, value: number) =>
    `${label}★ · ${value} ${modeReviewLabel(mode, value)}`;

  return (
    <Stack gap="400">
      <Kicker accent>Stats at a glance</Kicker>

      {/* Scope toggle — swaps the chart + lead numbers across the three
          review levels. role=group + label so AT announces what the
          segmented control governs. */}
      <div role="group" aria-label="Rating distribution scope">
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            maxWidth: "fit-content",
            background: "var(--surface-default)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--border-radius-sm)",
          }}
        >
          <SegmentedButton
            active={mode === "season"}
            onClick={() => setMode("season")}
          >
            Seasons
          </SegmentedButton>
          <SegmentedButton
            active={mode === "show"}
            onClick={() => setMode("show")}
          >
            Shows
          </SegmentedButton>
          <SegmentedButton
            active={mode === "episode"}
            onClick={() => setMode("episode")}
          >
            Episodes
          </SegmentedButton>
        </div>
      </div>

      {/* Two-column band on lg+: facts left, chart right. items-start so
          the data summary sits at the top, level with the chart's eyebrow
          (the facts column is shorter than the chart; top-aligning keeps
          the summary tucked under the section eyebrow instead of floating
          down to the chart's baseline). Stacks to a single column below lg. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-12">
        <Stack gap="300">
          {/* Lead stats — counts line + averages line, sharing the mono
              register. Single noun ("review") because the toggle above
              already disambiguates the level. The averages line is
              suppressed entirely when the mode has no rated reviews, and
              the in-year half when the mode has none this year, so we
              never render NaN★. One group with a spelled-out aria-label
              so AT users who miss the toggle's pressed state still hear
              the level. */}
          <div
            role="group"
            aria-label={`Lifetime ${modeReviewLabel(mode, totalForMode)}: ${totalForMode.toLocaleString()} total, ${inYearForMode.toLocaleString()} in ${watchedYear}${totalRatings > 0 ? `, average ${avgRating.toFixed(2)} stars${inYearAvgForMode !== null ? `, ${inYearAvgForMode.toFixed(2)} stars in ${watchedYear}` : ""}` : ""}`}
          >
            <p style={leadStatsStyle}>
              <strong style={emphasizedNumberStyle}>
                {totalForMode.toLocaleString()}
              </strong>{" "}
              {totalForMode === 1 ? "review" : "reviews"}
              {" · "}
              <Link href={`/television/reviews?watchedYear=${watchedYear}`}>
                <strong style={emphasizedNumberStyle}>
                  {inYearForMode.toLocaleString()}
                </strong>{" "}
                in {watchedYear}
              </Link>
            </p>
            {totalRatings > 0 ? (
              <p style={{ ...leadStatsStyle, marginTop: 4 }}>
                {"Avg "}
                <strong style={emphasizedNumberStyle}>
                  {avgRating.toFixed(2)}
                </strong>
                ★
                {inYearAvgForMode !== null ? (
                  <>
                    {" · "}
                    <strong style={emphasizedNumberStyle}>
                      {inYearAvgForMode.toFixed(2)}
                    </strong>
                    ★ in {watchedYear}
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          {/* Tail facts — each entity links to its dedicated route. */}
          {topGenres.length > 0 ? (
            <p style={tailStatsStyle}>
              Top genres:{" "}
              {joinNodes(
                topGenres.map((g) => (
                  <Link key={g} href={`/television/genre/${slugifyGenre(g)}`}>
                    {g}
                  </Link>
                )),
              )}
            </p>
          ) : null}
          {topDecade ? (
            <p style={tailStatsStyle}>
              Most-logged decade:{" "}
              <Link href={`/television/decade/${slugifyEntity(topDecade)}`}>
                {topDecade}
              </Link>
            </p>
          ) : null}

          {/* Onward link to the full dashboard. Lives inside the summary
              column (not below the band) so the CTA stays tight under the
              facts instead of floating ~chart-height below them. */}
          <p style={{ margin: 0, marginTop: 4 }}>
            <Link href="/television/stats">See all the stats →</Link>
          </p>
        </Stack>

        <div>
          <Kicker>Rating distribution</Kicker>
          <div style={{ marginTop: 8 }}>
            <ColumnChart
              columns={columns}
              ariaLabelFor={ratingAria}
              tipFor={ratingTip}
              hrefFor={ratingHref}
              minHeight={140}
            />
          </div>
          {/* Episode bars don't link anywhere — episodes have no grid
              cards, so there's nothing to filter the reviews page to.
              The note tells the user why these bars (unlike Season/Show)
              aren't clickable. */}
          {mode === "episode" ? (
            <p style={{ ...tailStatsStyle, marginTop: 8 }}>
              Episode reviews live inside a show—open a show to read them.
            </p>
          ) : null}
        </div>
      </div>
    </Stack>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function computeAverageRating(ratingDist: Record<string, number>): number {
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

/** Level-aware review noun: "season review(s)" / "show review(s)" / "episode review(s)". */
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

/**
 * Join React nodes with the Oxford comma, preserving each item as a
 * clickable <Link> rather than flattening to a string.
 */
function joinNodes(nodes: ReactNode[]): ReactNode {
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];
  if (nodes.length === 2) {
    return (
      <>
        {nodes[0]} and {nodes[1]}
      </>
    );
  }
  return (
    <>
      {nodes.slice(0, -1).map((node, i) => (
        <Fragment key={i}>{node}, </Fragment>
      ))}
      and {nodes[nodes.length - 1]}
    </>
  );
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
  fontSize: "var(--p-sm-font-size)",
  color: "var(--text-caption)",
  letterSpacing: "0.04em",
  lineHeight: 1.5,
  margin: 0,
};
