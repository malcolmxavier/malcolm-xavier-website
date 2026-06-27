// ─────────────────────────────────────────────────────────────────
// StatsBand — the film cluster's "by the numbers" module on /films.
//
// Relocated from the old SummaryPanel that used to ride the right rail
// of every listing hero (reviews / genre / facet). Those pages now lead
// straight into the grid; the lifetime stats live here, on the editorial
// landing, where "lifetime" is the right register (the panel never
// reflected a listing's active filter anyway, so it sat oddly on a
// filtered genre/facet page).
//
// Display-only server component. Every datum deep-links into the matching
// filtered view, mirroring the stats dashboard's clickable tiles:
//   • each rating bar → /films/reviews?rating={k}
//   • each top genre  → /films/genre/{slug}
//   • the top decade  → /films/decade/{slug}
//   • the in-year count → /films/reviews?watchedYear={year}
// and the whole module links onward to /films/stats ("The Stats").
//
// Layout: a titled landing module (a Kicker eyebrow like its siblings),
// then a two-column band on lg+ — lead + tail facts on the left, the
// rating-distribution chart on the right — stacking on smaller screens.
//
// Accessibility: the rating chart reuses the dashboard's ColumnChart, so
// each column carries one aria-label (the bars are aria-hidden) and a
// screen reader hears one fact per bar. The module opens with its <Kicker>
// eyebrow, matching the other landing sections.
// ─────────────────────────────────────────────────────────────────

import { Fragment, type CSSProperties, type ReactNode } from "react";
import { Stack } from "@/components/layout/Stack";
import { Kicker } from "@/components/typography/Kicker";
import { Link } from "@/components/primitives/Link";
import { ColumnChart, type Column } from "@/components/stats/ColumnChart";
import { slugifyEntity } from "@/lib/feeds/slug";
import { slugifyGenre } from "@/lib/feeds/letterboxd-utils";
import type { FilmsSummary } from "@/lib/feeds/letterboxd-utils";

// Ascending left → right (0.5★ to 5★), matching Letterboxd's profile
// histogram orientation. These are the rating-distribution buckets.
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

type Props = {
  summary: FilmsSummary;
  /**
   * Films watched in the current calendar year. Derived at request time
   * in page.tsx (not from the snapshot's frozen count) so it tracks
   * `new Date()` and stays correct across the year boundary — see the
   * page-level derivation comment for why.
   */
  currentYearCount: number;
};

export function StatsBand({ summary, currentYearCount }: Props) {
  const dist = summary.ratingDistribution;
  const ratingValues = Object.values(dist);
  const totalRatings = ratingValues.reduce((a, b) => a + b, 0);
  const avgRating = computeAverageRating(dist);
  const topGenres = topN(summary.genreDistribution, 3);
  const topDecade = topN(summary.decadeDistribution, 1)[0];
  const watchedYear = new Date().getUTCFullYear();

  // [label, value] pairs for the chart, in ascending rating order.
  const columns: Column[] = RATING_KEYS.map((k) => [k, dist[k] ?? 0]);
  // Each bucket links to that rating's filtered reviews — but only when
  // the bucket is non-empty, so we never deep-link to an empty result.
  const ratingHref = (k: string) =>
    (dist[k] ?? 0) > 0 ? `/films/reviews?rating=${k}` : undefined;
  // SR label per bar, matching the old panel's phrasing (count + share).
  const ratingAria = (label: string, value: number) => {
    const pct = totalRatings > 0 ? (value / totalRatings) * 100 : 0;
    const noun = value === 1 ? "review" : "reviews";
    return `${label} stars: ${value} ${noun} (${pct.toFixed(1)}% of rated reviews)`;
  };
  // Hover chip for sighted users — the same fact in a compact form.
  const ratingTip = (label: string, value: number) =>
    `${label}★ · ${value} ${value === 1 ? "review" : "reviews"}`;

  return (
    <Stack gap="400">
      <Kicker accent>Stats at a glance</Kicker>

      {/* Two-column band on lg+: facts left, chart right. items-start so
          the data summary sits at the top, level with the chart's eyebrow
          (the facts column is shorter than the chart; top-aligning keeps
          the summary tucked under the section eyebrow instead of floating
          down to the chart's baseline). Stacks to a single column below lg. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-12">
        <Stack gap="300">
          {/* Lead stats line — total, this-year (linked to that year's
              filtered reviews), and the lifetime average. */}
          <p style={leadStatsStyle}>
            <strong style={emphasizedNumberStyle}>
              {summary.totalFilms.toLocaleString()}
            </strong>{" "}
            films
            {" · "}
            <Link href={`/films/reviews?watchedYear=${watchedYear}`}>
              <strong style={emphasizedNumberStyle}>
                {currentYearCount.toLocaleString()}
              </strong>{" "}
              in {watchedYear}
            </Link>
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

          {/* Tail facts — each entity links to its dedicated route. */}
          {topGenres.length > 0 ? (
            <p style={tailStatsStyle}>
              Top genres:{" "}
              {joinNodes(
                topGenres.map((g) => (
                  <Link key={g} href={`/films/genre/${slugifyGenre(g)}`}>
                    {g}
                  </Link>
                )),
              )}
            </p>
          ) : null}
          {topDecade ? (
            <p style={tailStatsStyle}>
              Most-logged decade:{" "}
              <Link href={`/films/decade/${slugifyEntity(topDecade)}`}>
                {topDecade}
              </Link>
            </p>
          ) : null}

          {/* Onward link to the full dashboard. Lives inside the summary
              column (not below the band) so the CTA stays tight under the
              facts instead of floating ~chart-height below them. */}
          <p style={{ margin: 0, marginTop: 4 }}>
            <Link href="/films/stats">See all the stats →</Link>
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
        </div>
      </div>
    </Stack>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Weighted-mean rating across all reviews. Iterates ratingDistribution
 * keys (stringified bucket centers like "0.5", "1.5", …).
 */
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

/** Sort a count map by count desc and return the top n keys. */
function topN(dist: Record<string, number>, n: number): string[] {
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

/**
 * Join React nodes into a natural-language list with the Oxford comma:
 * "A" / "A and B" / "A, B, and C". The prose analog of the panel's
 * formatList, but it preserves each item as a clickable <Link> rather
 * than flattening to a string.
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

// ─── Inline styles (shared register with the TV StatsBand) ────────

const leadStatsStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-sm-font-size)",
  lineHeight: "var(--p-sm-line-height)",
  color: "var(--text-body)",
  letterSpacing: "0.02em",
  margin: 0,
};

// <strong> inside the lead-stats line — slightly heavier weight lifts the
// numbers without breaking the mono cadence.
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
