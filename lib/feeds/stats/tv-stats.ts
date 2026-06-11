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
import { doySeries, monthTally, weekdayTally } from "./temporal";

const mineOf = (s: EnrichedShow) => s.mine ?? 0;

/** Network rollup: each show under its canonical primary network. */
export type NetworkRollup = {
  /** Most-logged: [network, showCount]. */
  most: [string, number][];
  /** Highest-rated (≥3 shows), raw gated average — not shrunk. */
  topRated: [string, number][];
};

export function networkRollup(shows: EnrichedShow[]): NetworkRollup {
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

/** Distinct-count summary for the language × country overlap tile. */
export type OverlapCounts = { pairs: number; languages: number; countries: number };

function overlapCounts(shows: EnrichedShow[]): OverlapCounts {
  const langs = new Set<string>();
  const countries = new Set<string>();
  const pairs = new Set<string>();
  for (const s of shows) {
    const l = normalizeLanguage(s.language);
    const c = normalizeCountry(s.country);
    if (l) langs.add(l);
    if (c) countries.add(c);
    if (l && c) pairs.add(l + "·" + c);
  }
  return { pairs: pairs.size, languages: langs.size, countries: countries.size };
}

/** The full /television/stats view-model. */
export type TvStats = {
  lifetime: {
    shows: number;
    seasonReviews: number;
    episodeReviews: number;
    thisYear: number;
    avgShow: number;
    avgSeason: number;
    avgEpisode: number;
  };
  genres: GenreRanking;
  networks: NetworkRollup;
  conglomerate: Contrast;
  multiNetwork: MultiNetwork[];
  actors: Contrast;
  creators: Contrast;
  languages: Contrast;
  countries: Contrast;
  overlap: OverlapCounts;
  types: [string, number][];
  temporal: {
    seasonPaceByDay: ReturnType<typeof doySeries>;
    seasonsByWeekday: [string, number][];
    seasonsByMonth: [string, number][];
    episodesByMonth: [string, number][];
  };
};

/** Compute every TV dashboard number from the live fixtures. */
export function computeTvStats(): TvStats {
  const { summary } = getShows();
  const shows = getEnrichedShows();

  // Per-show prior = the mean of non-null show ratings (one per title).
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

  return {
    lifetime: {
      shows: summary.totalShows,
      seasonReviews: summary.totalSeasonReviews,
      episodeReviews: summary.totalEpisodeReviews,
      thisYear: summary.thisYearCount,
      avgShow: avgFromDist(byLevel.show),
      avgSeason: avgFromDist(byLevel.season),
      avgEpisode: avgFromDist(byLevel.episode),
    },
    genres: genreRanking(shows),
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
    },
  };
}
