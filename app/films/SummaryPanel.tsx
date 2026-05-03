// ─────────────────────────────────────────────────────────────────
// SummaryPanel — lifetime stats sidebar for /films, sits inline
// with the hero on lg+. Below lg it stacks underneath the hero
// text, where the natural reading order (page title → stats) still
// holds.
//
// Display-only server component. Reads the pre-aggregated `summary`
// returned by `getFilms()`; no live computation, no client state.
// Lifetime stats — does NOT reflect the active filter. The grid is
// the place where filter state surfaces; the panel anchors the page
// with stable identity.
//
// Layout (top to bottom):
//   1. Lead stats line — `{n} films · {n} this year · Avg {x}★`
//   2. Rating-distribution column chart (vertical bars)
//   3. Tail stats line — top genres + most-logged decade
//
// Chart bars use currentColor inherited from the .star-rating-fill
// class so the histogram and the cards' stars share the same green.
//
// Accessibility:
//   • <aside aria-label="Lifetime stats"> announces the landmark.
//   • Each chart bar is a <li> with a single aria-label that says
//     "{rating} stars: {n} reviews ({pct}% of rated reviews)".
//     Visual sub-elements are aria-hidden so SR users hear one
//     clean announcement per bar, not three.
// ─────────────────────────────────────────────────────────────────

import { Stack } from "@/components/layout/Stack";
import { Kicker } from "@/components/typography/Kicker";
import type { FilmsSummary } from "@/lib/feeds/letterboxd-utils";

// Ascending left → right (0.5★ to 5★) — matches Letterboxd's
// profile-page histogram orientation. The chart is a column chart
// (vertical bars rising from a shared baseline).
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

type Props = { summary: FilmsSummary };

export function SummaryPanel({ summary }: Props) {
  const ratingValues = Object.values(summary.ratingDistribution);
  const totalRatings = ratingValues.reduce((a, b) => a + b, 0);
  // 1 as a floor so an empty distribution doesn't blow up division.
  const maxBucket = Math.max(...ratingValues, 1);
  const avgRating = computeAverageRating(summary.ratingDistribution);
  const topGenres = topN(summary.genreDistribution, 3);
  const topDecade = topN(summary.decadeDistribution, 1)[0];
  const watchedYear = new Date().getUTCFullYear();

  return (
    // lg:h-full so the aside fills the grid cell (which the parent
    // grid stretches to the hero column's height). On mobile this
    // is a no-op — the aside keeps its content height.
    <aside aria-label="Lifetime stats" className="lg:h-full">
      {/* lg:h-full propagates the height down to Stack so its
          flex-column children can resolve flex-1 against a real
          height. */}
      <Stack gap="400" className="lg:h-full">
        {/* Scope kicker — names what the chart below counts. The
            panel intentionally does NOT reflect the grid's active
            filter (the chart is a stable identity for the page),
            so labelling its scope here keeps the user from reading
            the bars as the filtered subset and getting confused
            when filtering to Horror leaves 5★ Animation buckets in
            view. Closes the labelling half of
            films-stats-orphaned-by-filters; the chip rail above
            the grid handles the recovery half. */}
        <Kicker>
          Lifetime · all {summary.totalFilms.toLocaleString()} films
        </Kicker>
        {/* ─── Lead stats line ──────────────────────────────────── */}
        <p style={leadStatsStyle}>
          <strong style={emphasizedNumberStyle}>
            {summary.totalFilms.toLocaleString()}
          </strong>{" "}
          films
          {" · "}
          <strong style={emphasizedNumberStyle}>
            {summary.thisYearCount.toLocaleString()}
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
        {/* lg:flex-1 makes this block claim leftover vertical space
            within Stack, so the chart inside expands when the hero
            column is taller. flex flex-col so the inner OL can
            flex-grow inside this block. */}
        <div className="flex flex-col lg:flex-1" style={{ gap: 8 }}>
          <Kicker>Rating distribution</Kicker>
          <ol
            role="list"
            // star-rating-fill on the parent so each bar's
            // currentColor inherits the sitewide green pair (light
            // green-800 / dark green-400). flex-1 + min-height:
            // each LI stretches to the OL's height, which on lg+
            // tracks the hero column. min-height keeps a sensible
            // floor on mobile / very short heroes.
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
              const count = summary.ratingDistribution[key] ?? 0;
              const pctOfMax = (count / maxBucket) * 100;
              const pctOfTotal =
                totalRatings > 0 ? (count / totalRatings) * 100 : 0;
              return (
                <DistributionColumn
                  key={key}
                  count={count}
                  pctOfMax={pctOfMax}
                  ariaLabel={ariaLabelFor(key, count, pctOfTotal)}
                />
              );
            })}
          </ol>
          {/* Rating labels sit on a parallel flex row so column
              heights aren't pushed by label leading. aria-hidden
              because the per-bar aria-label already announces the
              rating value. */}
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
              <span
                key={key}
                style={{ flex: 1, textAlign: "center" }}
              >
                {key}
              </span>
            ))}
          </div>
        </div>

        {/* ─── Tail stats — one row each so each fact stands on
            its own and the eye doesn't have to parse a long inline
            list at micro-caption size. */}
        {topGenres.length > 0 ? (
          <p style={tailStatsStyle}>
            Top genres: {topGenres.join(", ")}
          </p>
        ) : null}
        {topDecade ? (
          <p style={tailStatsStyle}>Most-logged decade: {topDecade}</p>
        ) : null}
      </Stack>
    </aside>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

/**
 * One vertical column in the rating-distribution chart. The column
 * fills its track from the baseline up — height is the bucket's
 * share of the maximum bucket, so the tallest bar always reaches
 * 100% and others scale proportionally.
 */
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
        // No fixed height — the parent <ol> sets its own height
        // (min 140px on mobile, flex-grown on lg+ to the column's
        // available space) and we stretch to fill it via the OL's
        // align-items: stretch. The bar inside (the <span>) uses
        // pctOfMax% of THIS li's height, so taller column = taller
        // bars.
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "100%",
          // Min-height of 2px when count > 0 so a bucket with at
          // least one review stays visible — otherwise the smallest
          // buckets would render at sub-pixel heights and disappear.
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
): string {
  const reviewsLabel = count === 1 ? "review" : "reviews";
  return `${key} stars: ${count} ${reviewsLabel} (${pctOfTotal.toFixed(1)}% of rated reviews)`;
}

/**
 * Weighted-mean rating across all reviews. Iterates ratingDistribution
 * keys (which are stringified bucket centers like "0.5", "1.5", ...).
 */
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

/** Sort a count map by count desc and return the top n keys. */
function topN(dist: Record<string, number>, n: number): string[] {
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

// ─── Inline styles ────────────────────────────────────────────────

const leadStatsStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-sm-font-size)",
  lineHeight: "var(--p-sm-line-height)",
  color: "var(--text-body)",
  letterSpacing: "0.02em",
  margin: 0,
} as const;

// <strong> inside the lead-stats line — slightly heavier weight,
// lifts the numbers visually without breaking the mono cadence.
const emphasizedNumberStyle = {
  fontWeight: 600,
  color: "var(--text-heading)",
} as const;

const tailStatsStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-caption)",
  letterSpacing: "0.04em",
  lineHeight: 1.5,
  margin: 0,
} as const;
