// ─────────────────────────────────────────────────────────────────
// Television dashboard numbers.
//
// Assembles the /television/stats view-model from the enrichment
// reader + ported primitives. Faithful to the sketch's TV tiles
// (build-stats-sketch.mjs ~272, 384–401, 1035–1058).
//
// Two TV-specific rules carry over verbatim:
//   • Per-level rating averages come straight from the snapshot's
//     `ratingDistributionByLevel`, which the bootstrap already built
//     with the miniseries double-count rule (serializd-mode-counts).
//     We never re-bucket here.
//   • The network rollup counts each show ONCE under its canonical
//     PRIMARY (first-listed) network — so a network-switcher or a
//     linear+streamer simulcast isn't double-counted — and its
//     "highest rated" is a raw gated average (not shrunk), matching
//     the sketch's networks tile.
//
// Server-only.
// ─────────────────────────────────────────────────────────────────

import { getShows } from "../serializd";
import { getShowsWithEnrichment } from "../review-corpus";
import { applyShowFilters, summarizeShows } from "../serializd-utils";
import type { ShowFilters, TvSummary } from "../serializd-utils";
import { getEnrichedShows } from "../enrichment";
import type { EnrichedShow } from "../enrichment";
import { avgFromDist, contrastE, meanOf, rank, type Contrast } from "./shrinkage";
import {
  NETWORK_MOVES,
  canonNet,
  conglomerateOfNet,
  primaryNetwork,
} from "./network-canon";
import { creatorNames, isActingShow, tvActorNames } from "./people";
import {
  countryName,
  languageName,
  normalizeCountry,
  normalizeLanguage,
} from "./provenance";
import {
  doySeries,
  monthByYearMatrix,
  monthTally,
  MONTHS,
  recentYears,
  weekdayByYearMatrix,
  weekdayTally,
  WEEKDAYS,
} from "./temporal";
import {
  divergingGenre,
  overlapCounts,
  worldLean,
  type DivergingGenre,
  type OverlapCounts,
  type WorldLean,
} from "./distributions";
import type { StackedMatrix } from "./chart-data";
import {
  collapse,
  TV_TILES,
  ARCHETYPE_FLOORS,
  type CollapseResult,
  type TileSurvival,
} from "./collapse";
import { sumMatrix, versus, one } from "./survival-helpers";
import { hasActiveFilter } from "./filter-url-state";

/**
 * A show's canonical rating for the analytics: the mean of its rated
 * SEASONS. Season ratings are the dense signal (231 ratings across 139
 * shows); a deliberate show-level rating is rare (~13 shows), and `mine`
 * (the most-recent review's rating) is a noisy, last-touched proxy. Falls
 * back to a show-level review rating, then `mine`, then null. Remapping
 * each show's `mine` to this value (in computeTvStats / connected-stats)
 * moves every tile that ranks on a rating onto the season signal at once.
 */
export function seasonRating(s: EnrichedShow): number | null {
  const seasonRatings = (s.reviews || [])
    .filter((r) => r.level === "season" && r.rating != null)
    .map((r) => r.rating as number);
  if (seasonRatings.length) {
    return seasonRatings.reduce((a, b) => a + b, 0) / seasonRatings.length;
  }
  const showLevel = (s.reviews || []).find((r) => r.level === "show" && r.rating != null);
  if (showLevel) return showLevel.rating as number;
  return s.mine ?? null;
}

const mineOf = (s: EnrichedShow) => s.mine ?? 0;

/** Network rollup: each show under its canonical primary network. */
export type NetworkRollup = {
  /** Most-logged: [network, showCount]. */
  most: [string, number][];
  /** Highest-rated (≥3 shows), raw gated average — not shrunk. */
  topRated: [string, number][];
};

export function networkRollup(shows: EnrichedShow[]): NetworkRollup {
  // Show-level ranking: one increment per show, weighted by the show's `mine`
  // rating (mineOf). A network is a property of the show, so this deliberately
  // does NOT expand per season/episode — the miniseries double-count rule
  // (modesForReview) governs the per-mode COUNT surfaces, not these rollups.
  const cnt: Record<string, number> = {};
  const sum: Record<string, number> = {};
  for (const s of shows) {
    const primary = primaryNetwork(s.networks);
    if (!primary) continue;
    cnt[primary] = (cnt[primary] || 0) + 1;
    sum[primary] = (sum[primary] || 0) + mineOf(s);
  }
  const topRated = Object.keys(cnt)
    .filter((n) => cnt[n] >= 3)
    .map((n): [string, number] => [n, sum[n] / cnt[n]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return { most: rank(cnt, 5), topRated };
}

/** Shows that aired on more than one distinct (canonical) network. */
export type MultiNetwork = { name: string; nets: string[]; move: string | null };

export function multiNetworkShows(shows: EnrichedShow[]): MultiNetwork[] {
  const out: MultiNetwork[] = [];
  for (const s of shows) {
    const nets = [...new Set(s.networks.map(canonNet))];
    if (nets.length < 2) continue;
    out.push({ name: s.name, nets, move: NETWORK_MOVES[s.name] ?? null });
  }
  return out;
}

/** Genre ranking: counts + raw gated (≥5) average, mirroring the sketch. */
export type GenreRanking = {
  most: [string, number][];
  topRated: [string, number][];
};

function genreRanking(shows: EnrichedShow[]): GenreRanking {
  // Show-level ranking: one increment per show per genre, weighted by the
  // show's `mine` rating (mineOf). A genre is a property of the show, so this
  // deliberately does NOT expand per season/episode — the miniseries
  // double-count rule (modesForReview) governs the per-mode COUNT surfaces, not
  // these rollups.
  const cnt: Record<string, number> = {};
  const sum: Record<string, number> = {};
  for (const s of shows) {
    for (const g of s.genres || []) {
      cnt[g] = (cnt[g] || 0) + 1;
      sum[g] = (sum[g] || 0) + mineOf(s);
    }
  }
  const topRated = Object.keys(cnt)
    .filter((g) => cnt[g] >= 5)
    .map((g): [string, number] => [g, sum[g] / cnt[g]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return { most: rank(cnt, 5), topRated };
}

/** One review-level's rating distribution: the bars + its average + n. */
export type LevelDistribution = {
  /** [ratingKey, count][] in ascending 0.5–5★ order. */
  bars: [string, number][];
  avg: number;
  n: number;
};

/** Ascending 0.5–5★ keys — the column-chart x-axis for each level. */
const RATING_KEYS = [
  "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5",
] as const;

/**
 * The three per-level rating distributions (show / season / episode),
 * read straight from the snapshot's `ratingDistributionByLevel` — which
 * the bootstrap already built with the miniseries double-count rule. We
 * never re-bucket here (sketch tvRatingByLevelTile, ~330).
 */
export function ratingByLevel(
  byLevel: Record<"show" | "season" | "episode", Record<string, number>>,
): Record<"show" | "season" | "episode", LevelDistribution> {
  const build = (dist: Record<string, number>): LevelDistribution => ({
    bars: RATING_KEYS.map((k): [string, number] => [k, dist[k] ?? 0]),
    avg: avgFromDist(dist),
    n: Object.values(dist).reduce((a, b) => a + b, 0),
  });
  return {
    show: build(byLevel.show),
    season: build(byLevel.season),
    episode: build(byLevel.episode),
  };
}

/** The full /television/stats view-model. */
export type TvStats = {
  lifetime: {
    shows: number;
    seasonReviews: number;
    episodeReviews: number;
    thisYear: number;
    /** The reconciled headline rating — the season-review average (equals
        the distribution chart's Seasons mean). The page's "avg season
        rating" and the genre-diverging baseline, both on the season grain. */
    avgRating: number;
    avgShow: number;
    avgSeason: number;
    avgEpisode: number;
  };
  ratingByLevel: Record<"show" | "season" | "episode", LevelDistribution>;
  genres: GenreRanking;
  divergingGenre: DivergingGenre;
  networks: NetworkRollup;
  conglomerate: Contrast;
  multiNetwork: MultiNetwork[];
  actors: Contrast;
  creators: Contrast;
  languages: Contrast;
  countries: Contrast;
  worldLean: WorldLean;
  overlap: OverlapCounts;
  types: [string, number][];
  temporal: {
    seasonPaceByDay: ReturnType<typeof doySeries>;
    seasonsByWeekday: [string, number][];
    seasonsByMonth: [string, number][];
    episodesByMonth: [string, number][];
    /** Season completions, weekday × recent-year stack. */
    seasonWeekdayMatrix: StackedMatrix;
    /** Season completions, month × recent-year stack. */
    seasonMonthMatrix: StackedMatrix;
  };
  /** Per-tile / per-band / page collapse decisions under the active filter
   *  (STATS-FILTERS §6) — computed live, same as the films dashboard. */
  collapse: CollapseResult;
};

/**
 * The narrowed TV corpus: the enriched shows (drive every analytical tile)
 * and the summary (drives lifetime + per-level distributions). Bundled so the
 * unfiltered and filtered paths feed the same compute body.
 */
type TvCorpus = {
  enrichedShows: EnrichedShow[];
  summary: TvSummary;
};

/**
 * Resolve the corpus for a TV compute call.
 *
 * - No filters: shipped enriched shows + summary, BYTE-FOR-BYTE identical to
 *   the pre-filter behaviour.
 * - With filters: narrow the enrichment-joined Show[] via the SHARED
 *   `applyShowFilters` predicate (reused, not reimplemented), restrict the
 *   EnrichedShow[] to the survivors by TMDB id, and recompute the summary
 *   over the surviving shows (honouring the miniseries double-count rule).
 */
function resolveTvCorpus(filters?: ShowFilters): TvCorpus {
  if (!filters || !hasActiveFilter(filters)) {
    return { enrichedShows: getEnrichedShows(), summary: getShows().summary };
  }

  const { shows: enrichedSnap, summary: baseSummary } = getShowsWithEnrichment();
  const surviving = applyShowFilters(enrichedSnap, filters).map((a) => a.show);

  const survivingTmdbIds = new Set<number>();
  for (const s of surviving) {
    if (s.tmdb?.id != null) survivingTmdbIds.add(s.tmdb.id);
  }
  const enrichedShows = getEnrichedShows().filter((e) =>
    survivingTmdbIds.has(e.tmdbId),
  );
  const summary = summarizeShows(surviving, baseSummary);

  return { enrichedShows, summary };
}

/**
 * Compute every TV dashboard number from the live fixtures.
 *
 * `filters` optional: omitted/empty → full corpus, identical to the pre
 * filter behaviour. Provided → the predicate-narrowed corpus (§9).
 */
export function computeTvStats(filters?: ShowFilters): TvStats {
  const { enrichedShows, summary } = resolveTvCorpus(filters);
  // Canonical rating = the season signal. Remapping `mine` to seasonRating
  // here moves every analytical tile (genres, people, networks, provenance,
  // world lean, diverging) AND the baseline onto season ratings at once,
  // since they all read `mine`. The rating-distribution-by-level tile is
  // unaffected — it reads the snapshot's per-level histograms, not `mine`.
  const shows = enrichedShows.map((s) => ({ ...s, mine: seasonRating(s) }));

  // Corpus baseline = the mean canonical (season-derived) show rating, over
  // the ~139 rated shows. This is the diverging/contrast prior and the
  // reconciled "average rating" the page displays.
  const tAvg = meanOf(shows.map((s) => s.mine).filter((r): r is number => r != null));

  const acting = shows.filter(isActingShow);

  // Review dates split by level (season = the multi-year unit; episode
  // dates are current-year-only by how Serializd logging began).
  const seasonDates = shows.flatMap((s) =>
    (s.reviews || [])
      .filter((r) => r.level === "season" && r.watchedDate)
      .map((r) => r.watchedDate),
  );
  const episodeDates = shows.flatMap((s) =>
    (s.reviews || [])
      .filter((r) => r.level === "episode" && r.watchedDate)
      .map((r) => r.watchedDate),
  );

  const byLevel = summary.ratingDistributionByLevel;

  // Recent years drive the season stacked-by-year tiles.
  const seasonYears = recentYears(seasonDates);
  const seasonYearLabels = seasonYears.map(String);

  // The displayed corpus average AND the genre-diverging are on the SEASON
  // grain: each rated season is one observation, inheriting its show's
  // genres. So the headline average and the diverging baseline read the
  // same number as the rating-distribution chart's Seasons view (≈3.23) —
  // no per-title-vs-per-review discrepancy. (The per-show `tAvg` above
  // stays the shrinkage prior for the people/network/etc. tiles, which gate
  // on distinct titles and never display a baseline, so the grains don't
  // collide on screen.)
  const seasonMean = avgFromDist(byLevel.season);
  const genreRows = shows.flatMap((s) =>
    (s.reviews ?? [])
      .filter((r) => r.level === "season" && r.rating != null)
      .map((r) => ({ genres: s.genres ?? [], rating: r.rating as number })),
  );

  const stats: Omit<TvStats, "collapse"> = {
    lifetime: {
      shows: summary.totalShows,
      seasonReviews: summary.totalSeasonReviews,
      episodeReviews: summary.totalEpisodeReviews,
      thisYear: summary.thisYearCount,
      // The reconciled headline = the season-review average (same number
      // the distribution chart's Seasons view shows), not the per-title
      // mean — so the two never read as a discrepancy.
      avgRating: seasonMean,
      avgShow: avgFromDist(byLevel.show),
      avgSeason: avgFromDist(byLevel.season),
      avgEpisode: avgFromDist(byLevel.episode),
    },
    ratingByLevel: ratingByLevel(byLevel),
    genres: genreRanking(shows),
    divergingGenre: divergingGenre(genreRows, seasonMean, 8),
    networks: networkRollup(shows),
    conglomerate: contrastE(
      shows,
      (s) => [conglomerateOfNet(s.networks)],
      mineOf,
      5,
      8,
      3,
      tAvg,
    ),
    multiNetwork: multiNetworkShows(shows),
    actors: contrastE(acting, tvActorNames, mineOf, 4, 8, 2, tAvg),
    creators: contrastE(acting, creatorNames, mineOf, 3, 8, 2, tAvg),
    languages: contrastE(
      shows,
      (s) => (s.language ? [normalizeLanguage(s.language)] : []),
      mineOf,
      4,
      8,
      3,
      tAvg,
      languageName,
    ),
    countries: contrastE(
      shows,
      (s) => (s.country ? [normalizeCountry(s.country)] : []),
      mineOf,
      4,
      8,
      3,
      tAvg,
      countryName,
    ),
    worldLean: worldLean(shows),
    overlap: overlapCounts(shows),
    types: rank(
      shows.reduce<Record<string, number>>((acc, s) => {
        if (s.type) acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {}),
    ),
    temporal: {
      seasonPaceByDay: doySeries(seasonDates),
      seasonsByWeekday: weekdayTally(seasonDates),
      seasonsByMonth: monthTally(seasonDates),
      episodesByMonth: monthTally(episodeDates),
      seasonWeekdayMatrix: {
        cats: [...WEEKDAYS],
        segments: seasonYearLabels,
        matrix: weekdayByYearMatrix(seasonDates, seasonYears),
      },
      seasonMonthMatrix: {
        cats: [...MONTHS],
        segments: seasonYearLabels,
        matrix: monthByYearMatrix(seasonDates, seasonYears),
      },
    },
  };

  // Live degradation: resolve every tile's rung, every band's state, and the
  // page verdict from the narrowed view-model — same engine the films
  // dashboard runs (§6). Before this, the TV page rendered every tile as full.
  return {
    ...stats,
    collapse: collapse("television", TV_TILES, tvTileSurvival(stats, filters)),
  };
}

/**
 * Derive every TV tile's surviving-n + self-reference flag from the computed
 * view-model and the active filter — the TV counterpart of `filmTileSurvival`.
 * Pure: the same stats always map to the same survival, so it's unit-testable
 * against the fixtures.
 */
export function tvTileSurvival(
  s: Omit<TvStats, "collapse">,
  filters?: ShowFilters,
): TileSurvival[] {
  const f = filters ?? {};

  // Tiles whose primary axis the user pinned to a SINGLE include value: their
  // distribution is self-referential and collapses to a one-value readout
  // (§5/§6). A lone rating also flattens the genre-divergence tile (every
  // surviving season shares that rating, so every genre averages to it).
  const selfRef = new Set<string>();
  const pin = (active: boolean, ...ids: string[]) => {
    if (active) for (const id of ids) selfRef.add(id);
  };
  pin(one(f.ratings), "rating-distribution-by-level", "genres-vs-baseline");
  pin(one(f.genres), "genres", "genres-vs-baseline");
  pin(one(f.actors), "actors");
  pin(one(f.creators), "creators");
  pin(one(f.languages), "languages", "language-x-country");
  pin(one(f.countries), "countries");
  pin(one(f.networks), "networks");
  pin(one(f.conglomerates), "by-conglomerate");
  pin(one(f.types), "type");

  const corpus = s.lifetime.shows;

  // The rating-distribution tile carries a show/season/episode level toggle, so
  // it survives if ANY level has bars to plot — count the richest level.
  const ratingBuckets = Math.max(
    ...(["show", "season", "episode"] as const).map(
      (lvl) => s.ratingByLevel[lvl].bars.filter(([, c]) => c > 0).length,
    ),
  );
  // Season review events feed the pace line (a show can contribute several).
  const seasonEvents = s.temporal.seasonsByWeekday.reduce((t, [, n]) => t + n, 0);

  const surv: Record<
    string,
    { survivingN: number; degradeToReadout?: boolean }
  > = {
    // The corpus
    lifetime: { survivingN: corpus },
    "rating-distribution-by-level": { survivingN: ratingBuckets },
    type: { survivingN: s.types.length },
    // Taste — genres bar counts plotted (non-empty) genres; it's navigational
    // (immortal in the catalog), so it rides the chart down to a single
    // clickable bar. genres-vs-baseline counts genres that have ESCAPED
    // shrinkage — per-genre n ≥ m/2 = 4 for TV (m = 8). A divergence built on
    // genres all pulled to baseline is flat and unreadable, so gating on the
    // escaped-genre count (vs. the old raw-corpus gate, which let the chart
    // render below the m=8 prior with every bar near-flat) keeps the tile's
    // viability aligned with the same per-genre sample the shrinkage depends on.
    // Mirrors films (count ≥ m/2 = 10 at m = 20) with the tile floor of 2.
    genres: { survivingN: s.genres.most.length },
    "genres-vs-baseline": {
      survivingN: s.divergingGenre.filter((g) => g.count >= 4).length,
    },
    // People
    actors: versus(s.actors),
    creators: versus(s.creators),
    // Where it comes from
    "world-cinema-lean": { survivingN: corpus },
    "language-x-country": { survivingN: s.overlap.topPairs.length },
    languages: versus(s.languages),
    countries: versus(s.countries),
    // How it reached me. Networks is a NetworkRollup ({most, topRated}), not a
    // Contrast ({most, major}), so it can't use the shared `versus` helper: it
    // survives on the most-logged column and degrades to a readout when the
    // highest-rated side drops below the same per-column versus floor every
    // other versus tile reads (ARCHETYPE_FLOORS.versus), rather than a literal.
    networks: {
      survivingN: s.networks.most.length,
      degradeToReadout: s.networks.topRated.length < ARCHETYPE_FLOORS.versus,
    },
    "by-conglomerate": versus(s.conglomerate),
    "shows-across-networks": { survivingN: s.multiNetwork.length },
    // When I watch
    "season-pace": { survivingN: seasonEvents },
    "seasons-by-month": { survivingN: sumMatrix(s.temporal.seasonMonthMatrix.matrix) },
    "seasons-by-weekday": {
      survivingN: sumMatrix(s.temporal.seasonWeekdayMatrix.matrix),
    },
    "episodes-by-month": {
      survivingN: s.temporal.episodesByMonth.filter(([, n]) => n > 0).length,
    },
  };

  return TV_TILES.map((tile) => ({
    id: tile.id,
    survivingN: surv[tile.id]?.survivingN ?? 0,
    selfReferenced: selfRef.has(tile.id),
    degradeToReadout: surv[tile.id]?.degradeToReadout ?? false,
  }));
}
