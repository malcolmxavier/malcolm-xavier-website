// ─────────────────────────────────────────────────────────────────
// Film dashboard numbers.
//
// Assembles the /films/stats view-model from the enrichment reader +
// the ported compute primitives. Faithful to the stats sketch's film
// tiles (build-stats-sketch.mjs ~975–1006): same keyFns, same
// shrinkage constants, same canon. WS5 renders these; it computes
// none of them, so the numbers can't drift between surfaces.
//
// Server-only (reads fixtures via the enrichment reader).
// ─────────────────────────────────────────────────────────────────

import { getFilms } from "../letterboxd";
import { getFilmsWithEnrichment } from "../review-corpus";
import { hybridMatchIds, combineMatchSets } from "../fuzzy-search";
import { applyFilters, summarizeFilms } from "../letterboxd-utils";
import type { FilmFilters, FilmsSummary, Film } from "../letterboxd-utils";
import { getCollectionDetails, getEnrichedFilms } from "../enrichment";
import type { EnrichedFilm } from "../enrichment";
import {
  avgFromDist,
  contrastE,
  meanOf,
  rank,
  shrinkCell,
  type Contrast,
} from "./shrinkage";
import { canonStudio, conglomerateOfStudio } from "./studio-canon";
import {
  buildFamilies,
  contrastDeskew,
  familiesOf,
  releasedTotalFromCollectionDetails,
  type DeskewContrast,
  type FamilyInfoMap,
} from "./franchise";
import { filmActorNames } from "./people";
import {
  BUDGET_TIER_LABELS,
  budgetTierIndex,
  countryName,
  languageName,
  normalizeCountry,
  normalizeLanguage,
  RELEASE_ERAS,
  releaseEraIndex,
} from "./provenance";
import {
  divergingGenre,
  overlapCounts,
  worldLean,
  type DivergingGenre,
  type OverlapCounts,
  type WorldLean,
} from "./distributions";
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
import type { HeatGrid, StackedMatrix } from "./chart-data";
import {
  collapse,
  FILMS_TILES,
  type CollapseResult,
  type TileSurvival,
} from "./collapse";
import { sumMatrix, sumHeat, versus, one } from "./survival-helpers";

/** The rating each film contributes (never null in the enriched set). */
const mineOf = (f: EnrichedFilm) => f.mine ?? 0;

/** Distinct franchise ranking — most-logged + shrunk highest-rated (≥2). */
export type FranchiseRanking = {
  most: [string, number][];
  major: { k: string; adj: number }[];
};

function franchiseRanking(
  films: EnrichedFilm[],
  familyInfo: FamilyInfoMap,
  mean: number,
): FranchiseRanking {
  const cnt: Record<string, number> = {};
  const sum: Record<string, number> = {};
  const name: Record<string, string> = {};
  const m = 3;
  for (const f of films) {
    for (const k of familiesOf(f)) {
      if (!familyInfo[k]?.qualifies) continue;
      cnt[k] = (cnt[k] || 0) + 1;
      sum[k] = (sum[k] || 0) + mineOf(f);
      name[k] = familyInfo[k].name;
    }
  }
  const most: [string, number][] = Object.entries(cnt)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, n]): [string, number] => [name[k], n]);
  const major = Object.keys(cnt)
    .filter((k) => cnt[k] >= 2)
    .map((k) => {
      const v = cnt[k];
      const raw = sum[k] / v;
      return { k: name[k], adj: (v / (v + m)) * raw + (m / (v + m)) * mean };
    })
    .sort((a, b) => b.adj - a.adj)
    .slice(0, 8);
  return { most, major };
}

/** Theatrical vs. streaming counts, averages, and the theatrical premium. */
export type TheatricalSplit = {
  wideCount: number;
  wideAvg: number;
  nonCount: number;
  nonAvg: number;
  premium: number;
};

export function theatricalSplit(films: EnrichedFilm[]): TheatricalSplit {
  const cls = films.filter((f) => f.release && f.release.cls !== "unknown");
  const theat = cls.filter((f) => f.release!.cls === "theatrical");
  const non = cls.filter((f) => f.release!.cls !== "theatrical");
  const wideAvg = meanOf(theat.map(mineOf));
  const nonAvg = meanOf(non.map(mineOf));
  return {
    wideCount: theat.length,
    wideAvg,
    nonCount: non.length,
    nonAvg,
    premium: wideAvg - nonAvg,
  };
}

/** One delta row: a film and how far your rating sat above (+) or below (−)
 *  the external score, on the 0.5–5★ scale. */
export type GapRow = { title: string; year: number; slug: string; delta: number };

/** One side of the you-vs-them comparison — either the critics (Metascore) or
 *  the crowd (Letterboxd). Each track stands on its own coverage. */
export type RatingGap = {
  /** Mean (your★ − their★) across the films carrying this external score. */
  avg: number;
  /** How many films carried this score. This is the comparison base AND the
   *  tile's surviving-n: it shows the average down to a single film and only
   *  hides at zero. */
  count: number;
  /** Your biggest over-them calls (top by positive delta). Empty below the
   *  list threshold, where the tile shows the average gap alone. */
  hotTakes: GapRow[];
  /** Their darlings you rated below them (top by negative delta). */
  darlings: GapRow[];
};

/** You-vs-them: how your ratings diverge from the critics (Metascore) and the
 *  crowd (Letterboxd). Two independent tracks over DIFFERENT film sets — nearly
 *  every film carries a Letterboxd score but only ~87% a Metascore — so each
 *  owns its coverage count rather than sharing one (misleading) denominator. */
export type YouVsWorld = {
  critics: RatingGap;
  crowd: RatingGap;
};

// Below this many scored films a track shows just its average gap, no lists:
// one or two films per side isn't a hot-takes-vs-darlings contrast, it's the
// same handful sorted twice. At or above it each side takes k = min(6, ⌊n/2⌋),
// so the two lists are always distinct titles (top-k and bottom-k can't overlap
// while k ≤ n/2).
const GAP_LIST_MIN = 4;

/** Build one comparison track from per-film deltas (already computed as
 *  your★ − their★). Sorts once, then takes symmetric top/bottom slices. */
function ratingGap(rows: GapRow[]): RatingGap {
  const sorted = [...rows].sort((a, b) => b.delta - a.delta);
  const n = sorted.length;
  // Films per list: none below the threshold, else half the set capped at 6.
  const k = n >= GAP_LIST_MIN ? Math.min(6, Math.floor(n / 2)) : 0;
  return {
    avg: meanOf(rows.map((r) => r.delta)),
    count: n,
    hotTakes: sorted.slice(0, k),
    // slice(-0) returns the whole array, so guard the empty case explicitly.
    darlings: k ? sorted.slice(-k).reverse() : [],
  };
}

/**
 * Rating gaps vs. the critics (Metascore, ÷20 onto the 0.5–5★ scale) and the
 * Letterboxd crowd, plus the sharpest disagreements either way (sketch
 * youVsWorldTile, ~582). Each track runs over only the films carrying that
 * score; a film lacking one sits out that track entirely.
 */
export function youVsWorld(films: EnrichedFilm[]): YouVsWorld {
  const critics = films
    .filter((f) => f.ratings?.metacritic != null && f.mine != null)
    .map((f) => ({
      title: f.title,
      year: f.year,
      slug: f.slug,
      delta: (f.mine as number) - (f.ratings!.metacritic as number) / 20,
    }));
  const crowd = films
    .filter((f) => f.ratings?.letterboxd != null && f.mine != null)
    .map((f) => ({
      title: f.title,
      year: f.year,
      slug: f.slug,
      delta: (f.mine as number) - (f.ratings!.letterboxd as number),
    }));
  return { critics: ratingGap(critics), crowd: ratingGap(crowd) };
}

// Release-type / budget-tier segment labels (column-stack legends).
const RELEASE_TYPE_KEYS = ["theatrical", "limited", "streaming"] as const;
const RELEASE_TYPE_LABELS = ["Theatrical", "Limited", "Streaming"];

/**
 * Films you logged, stacked by release type within each *release* year
 * (everything before 2012 collapses into one "≤2011" column, which is
 * effectively all-theatrical). Sketch releaseTypeTile (~698).
 */
export function releaseTypeByYear(films: EnrichedFilm[]): StackedMatrix {
  const pre = { theatrical: 0, limited: 0, streaming: 0 };
  const byYear: Record<number, { theatrical: number; limited: number; streaming: number }> = {};
  for (const f of films) {
    if (!f.release || f.release.cls === "unknown") continue;
    const cls = f.release.cls;
    if (f.year < 2012) {
      pre[cls]++;
    } else {
      (byYear[f.year] ??= { theatrical: 0, limited: 0, streaming: 0 })[cls]++;
    }
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  return {
    cats: ["≤2011", ...years.map(String)],
    segments: [...RELEASE_TYPE_LABELS],
    matrix: [
      RELEASE_TYPE_KEYS.map((k) => pre[k]),
      ...years.map((y) => RELEASE_TYPE_KEYS.map((k) => byYear[y][k])),
    ],
  };
}

/**
 * Wide-theatrical films with a reported budget, stacked by budget tier
 * within each release year (≤2011 collapsed). Recent years undercount —
 * much indie/streaming work has no reported budget. Sketch
 * budgetTierByYearTile (~719).
 */
export function budgetTierByYear(films: EnrichedFilm[]): StackedMatrix {
  const elig = films.filter(
    (f) => f.release?.cls === "theatrical" && (f.budget ?? 0) > 0,
  );
  const pre = [0, 0, 0, 0];
  const byYear: Record<number, number[]> = {};
  for (const f of elig) {
    const t = budgetTierIndex(f.budget as number);
    if (f.year < 2012) pre[t]++;
    else (byYear[f.year] ??= [0, 0, 0, 0])[t]++;
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  return {
    cats: ["≤2011", ...years.map(String)],
    segments: [...BUDGET_TIER_LABELS],
    matrix: [pre, ...years.map((y) => byYear[y])],
  };
}

/**
 * Budget-tier × release-era heatmap of average rating (Bayesian-shrunk,
 * m=5), wide-theatrical + reported-budget only. Sketch heatmapTile (~755).
 */
export function budgetEraHeat(films: EnrichedFilm[]): HeatGrid {
  const gmean = meanOf(films.map(mineOf));
  const acc: number[][][] = BUDGET_TIER_LABELS.map(() =>
    RELEASE_ERAS.map(() => []),
  );
  for (const f of films) {
    if (f.release?.cls !== "theatrical" || (f.budget ?? 0) <= 0) continue;
    acc[budgetTierIndex(f.budget as number)][releaseEraIndex(f.year)].push(
      mineOf(f),
    );
  }
  return {
    rows: [...BUDGET_TIER_LABELS],
    cols: [...RELEASE_ERAS],
    cells: acc.map((row) => row.map((a) => shrinkCell(a, gmean, 5))),
  };
}

/**
 * Release-type × release-era heatmap of average rating (shrunk, m=5).
 * All classified films — no budget gate, so coverage is full. Sketch
 * releaseTypeHeatmapTile (~769).
 */
export function releaseTypeEraHeat(films: EnrichedFilm[]): HeatGrid {
  const gmean = meanOf(films.map(mineOf));
  const typeIndex: Record<string, number> = { theatrical: 0, limited: 1, streaming: 2 };
  const acc: number[][][] = RELEASE_TYPE_LABELS.map(() =>
    RELEASE_ERAS.map(() => []),
  );
  for (const f of films) {
    if (!f.release || typeIndex[f.release.cls] == null) continue;
    acc[typeIndex[f.release.cls]][releaseEraIndex(f.year)].push(mineOf(f));
  }
  return {
    rows: [...RELEASE_TYPE_LABELS],
    cols: [...RELEASE_ERAS],
    cells: acc.map((row) => row.map((a) => shrinkCell(a, gmean, 5))),
  };
}

/** The full /films/stats view-model. */
export type FilmStats = {
  lifetime: { films: number; thisYear: number; hours: number; avgRating: number };
  genreDistribution: [string, number][];
  ratingDistribution: Record<string, number>;
  decadeDistribution: Record<string, number>;
  languages: Contrast;
  countries: Contrast;
  overlap: OverlapCounts;
  conglomerate: Contrast;
  studios: Contrast;
  actors: DeskewContrast;
  directors: DeskewContrast;
  writers: DeskewContrast;
  franchises: FranchiseRanking;
  worldLean: WorldLean;
  youVsWorld: YouVsWorld;
  divergingGenre: DivergingGenre;
  theatrical: TheatricalSplit;
  releaseType: [string, number][];
  releaseTypeByYear: StackedMatrix;
  budgetTierByYear: StackedMatrix;
  budgetEraHeat: HeatGrid;
  releaseTypeEraHeat: HeatGrid;
  temporal: {
    paceByDay: ReturnType<typeof doySeries>;
    byWeekday: [string, number][];
    byMonth: [string, number][];
    /** Weekday × recent-year stack (cats = weekdays, segments = years). */
    weekdayMatrix: StackedMatrix;
    /** Month × recent-year stack (cats = months, segments = years). */
    monthMatrix: StackedMatrix;
  };
  /**
   * The recursive-collapse verdict for this (possibly filtered) corpus
   * (STATS-FILTERS §6): per-tile ladder rung, per-band state, and the page
   * verdict. Computed server-side from the narrowed result so the render
   * never flashes a broken chart — tiles that fall below their archetype
   * floor degrade to a readout or fold into a band footnote instead.
   */
  collapse: CollapseResult;
};

/**
 * The narrowed corpus the stats compute runs against: the snapshot films
 * (drive runtime / watch-date / genre-row tiles), the enriched films (drive
 * the analytical tiles), and the summary (drives the lifetime + distribution
 * tiles). Bundling them keeps the unfiltered and filtered paths feeding the
 * SAME compute body — the only difference is whether the corpus was narrowed.
 */
type FilmCorpus = {
  snapFilms: Film[];
  films: EnrichedFilm[];
  summary: FilmsSummary;
};

/**
 * Resolve the corpus for a compute call.
 *
 * - No filters (the default / unfiltered dashboard): return the shipped
 *   snapshot arrays + summary verbatim. This is the BYTE-FOR-BYTE-identical
 *   path — `computeFilmStats()` behaves exactly as before.
 * - With filters: narrow the corpus via the SHARED `applyFilters` predicate
 *   (reused, not reimplemented — STATS-FILTERS §9), then derive the matching
 *   enriched subset by TMDB id and recompute the summary over the survivors.
 */
function resolveFilmCorpus(filters?: FilmFilters): FilmCorpus {
  // Unfiltered: hand back the shipped data untouched. An empty `{}` filter is
  // treated as "no filter" so an empty selection equals the unfiltered page.
  if (!filters || !hasAnyFilmFilter(filters)) {
    const { films: snapFilms, summary } = getFilms();
    return { snapFilms, films: getEnrichedFilms(), summary };
  }

  // Filtered: narrow the enrichment-joined corpus with the reviews predicate.
  // applyFilters returns AppliedFilm[]; we want the surviving Film objects.
  const { films: enrichedSnap } = getFilmsWithEnrichment();

  // The fuzzy ?title= / ?director= queries match OUTSIDE applyFilters (it
  // takes a precomputed id set so the Fuse dep stays off the client) — so we
  // replicate the reviews page's match step here, or a director picked via
  // the omnibox would render a chip but never narrow the corpus. Same field
  // paths + AND-combine as /films/reviews, so a stats deep-link carrying
  // ?director= resolves to the identical count on reviews (§11).
  const titleMatch = hybridMatchIds(
    enrichedSnap,
    filters.titleQuery,
    ["title"],
    (f) => f.id,
  );
  const directorMatch = hybridMatchIds(
    enrichedSnap,
    filters.directorQuery,
    ["tmdb.director"],
    (f) => f.id,
  );
  const matchIds = combineMatchSets(titleMatch, directorMatch);

  const surviving = applyFilters(enrichedSnap, filters, undefined, matchIds).map(
    (a) => a.film,
  );

  // The analytical tiles read getEnrichedFilms() (EnrichedFilm, keyed by
  // tmdbId). Restrict that array to the survivors via their TMDB ids. A
  // surviving film whose snapshot id is the TMDB id joins cleanly; films
  // without a TMDB match (id is the seed slug) carry no enrichment and so
  // never appear in an entity-facet result anyway.
  const survivingTmdbIds = new Set<number>();
  for (const f of surviving) {
    if (f.tmdb?.id != null) survivingTmdbIds.add(f.tmdb.id);
  }
  const films = getEnrichedFilms().filter((e) => survivingTmdbIds.has(e.tmdbId));

  // Recompute the summary over the narrowed snapshot subset (same counting
  // rules as the snapshot writer — see summarizeFilms).
  const summary = summarizeFilms(surviving);

  return { snapFilms: surviving, films, summary };
}

/** True if any FilmFilters field would actually narrow the corpus. */
function hasAnyFilmFilter(f: FilmFilters): boolean {
  return Object.values(f).some((v) => {
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.length > 0;
    // numeric bounds (releaseYearMin/Max) and watchedWindow
    return true;
  });
}

// ───────────────────────────────────────────────────────────────────
// Tile survival → collapse decisions (STATS-FILTERS §6).
//
// Surviving-n is measured along each archetype's REAL fragility axis — the
// two failure modes degrade differently and a single yardstick misses one:
//
// - SAMPLE-driven tiles fail when too few films feed them. Their surviving-n
//   is the feeding-FILM (or watch-event) count: counters, the diverging
//   genre tile (hard-capped at 12 rows, so a 15-ROW floor is unsatisfiable —
//   its reliability is really about sample size), stacked-by-year, heatmap,
//   line. Floors read as "films this chart type needs to be meaningful".
//
// - STRUCTURE-driven tiles fail when the films collapse onto too few
//   categories/columns even with a healthy sample. Their surviving-n is the
//   CATEGORY/COLUMN count: single-axis bars (genre/rating/pair bars) count
//   non-empty categories; versus tiles count their weaker column. A versus
//   whose "highest-rated" column empties while "most-logged" survives sets
//   `degradeToReadout` so it reads out the surviving column instead of
//   rendering a lopsided two-column chart (the case this feature exists for).
//
// Most counts come straight off the computed view-model.
// ───────────────────────────────────────────────────────────────────

// sumMatrix / sumHeat / versus / one moved to ./survival-helpers (shared with
// tvTileSurvival) — imported above.

/**
 * Derive every film tile's surviving-n + self-reference flag from the
 * computed view-model and the active filter. Pure: the same stats always
 * map to the same survival, so it's unit-testable against the fixtures.
 */
export function filmTileSurvival(
  s: Omit<FilmStats, "collapse">,
  filters?: FilmFilters,
): TileSurvival[] {
  const f = filters ?? {};

  // Tiles whose primary axis the user has pinned to a SINGLE include value —
  // their distribution is self-referential and collapses to a one-value
  // readout (§5/§6), independent of surviving rows. A single rating also
  // flattens the genre-rating divergence tile: every surviving film shares
  // that rating, so every genre averages to it and every bar is zero — so a
  // lone rating pins genres-vs-baseline too.
  const selfRef = new Set<string>();
  const pin = (active: boolean, ...ids: string[]) => {
    if (active) for (const id of ids) selfRef.add(id);
  };
  pin(one(f.ratings), "rating-distribution", "genres-vs-baseline");
  pin(one(f.genres), "genres", "genres-vs-baseline");
  pin(one(f.actors), "actors");
  pin(one(f.writers), "writers");
  pin(one(f.directors) || (f.directorQuery?.length ?? 0) >= 2, "directors");
  pin(one(f.collections), "collections");
  pin(one(f.languages), "languages", "language-x-country");
  pin(one(f.countries), "countries");
  pin(one(f.studios), "studios");
  pin(one(f.conglomerates), "by-conglomerate");
  pin(
    one(f.releaseTypes),
    "release-type-by-year",
    "release-type-x-era",
    "theatrical-vs-streaming",
  );
  pin(one(f.budgetTiers), "budget-tier-by-year", "budget-tier-x-era");

  // Total watch events feeding the temporal tiles (weekday tally sums to
  // the full event count, unlike the recent-years-only stacked matrices).
  const watchEvents = s.temporal.byWeekday.reduce((t, [, n]) => t + n, 0);

  // Counters ride the surviving corpus — a count is honest at any n ≥ 1. (The
  // diverging tile used to as well, but now gates on its escaped-genre count;
  // see genres-vs-baseline below.)
  const corpus = s.lifetime.films;

  // Per-tile survival on the right fragility axis (see the header). Versus
  // tiles carry a degradeToReadout flag for the half-empty-column case.
  const surv: Record<
    string,
    { survivingN: number; degradeToReadout?: boolean }
  > = {
    // The corpus
    lifetime: { survivingN: corpus },
    "rating-distribution": {
      survivingN: Object.values(s.ratingDistribution).filter((c) => c > 0).length,
    },
    // Taste — genres bar counts non-empty genres (navigational: immortal in
    // the collapse engine, so it rides the chart down to a single clickable
    // bar). genres-vs-baseline counts genres that have ESCAPED shrinkage —
    // per-genre n ≥ m/2 = 10 for film (m = 20). A divergence built on genres
    // all pulled to baseline is flat and unreadable, so gating on the
    // escaped-genre count keeps the tile's viability aligned with the same
    // per-genre sample the shrinkage depends on (vs. the old raw-corpus gate,
    // which let the chart render at 15 films total — below the m=20 prior, so
    // every bar was structurally near-flat). Counts off the charted rows.
    genres: { survivingN: s.genreDistribution.length },
    "genres-vs-baseline": {
      survivingN: s.divergingGenre.filter((g) => g.count >= 10).length,
    },
    // Cast, crew, and franchises — the four versus tiles.
    actors: versus(s.actors),
    writers: versus(s.writers),
    directors: versus(s.directors),
    collections: versus(s.franchises),
    // How I stack up — each rating-gap counter survives on its OWN coverage
    // (the films carrying that score), not the corpus, so it hides only when
    // nothing can be compared. Crowd ≈ corpus (Letterboxd is near-universal);
    // critics is the scarcer, more meaningful gate.
    "me-vs-critics": { survivingN: s.youVsWorld.critics.count },
    "me-vs-people": { survivingN: s.youVsWorld.crowd.count },
    // Where it comes from — the language×country bar counts surviving pairs.
    "world-cinema-lean": { survivingN: corpus },
    "language-x-country": { survivingN: s.overlap.topPairs.length },
    languages: versus(s.languages),
    countries: versus(s.countries),
    // Distribution — release/budget grids feed off films (budget off the
    // smaller wide-theatrical-with-budget subset, captured by the grid sum).
    "theatrical-vs-streaming": { survivingN: corpus },
    studios: versus(s.studios),
    "by-conglomerate": versus(s.conglomerate),
    "release-type-by-year": { survivingN: sumMatrix(s.releaseTypeByYear.matrix) },
    "budget-tier-by-year": { survivingN: sumMatrix(s.budgetTierByYear.matrix) },
    "release-type-x-era": { survivingN: sumHeat(s.releaseTypeEraHeat.cells) },
    "budget-tier-x-era": { survivingN: sumHeat(s.budgetEraHeat.cells) },
    // When I watch — watch events (a film can contribute several).
    "watch-pace": { survivingN: watchEvents },
    "watched-by-month": { survivingN: sumMatrix(s.temporal.monthMatrix.matrix) },
    "watched-by-weekday": {
      survivingN: sumMatrix(s.temporal.weekdayMatrix.matrix),
    },
  };

  return FILMS_TILES.map((tile) => ({
    id: tile.id,
    survivingN: surv[tile.id]?.survivingN ?? 0,
    selfReferenced: selfRef.has(tile.id),
    degradeToReadout: surv[tile.id]?.degradeToReadout ?? false,
  }));
}

/**
 * Compute every film dashboard number from the live fixtures.
 *
 * `filters` is optional: omitted (or empty) → the full corpus, identical to
 * the pre-filter behaviour. Provided → the predicate-narrowed corpus
 * (STATS-FILTERS §9). The compute body below is unchanged; only the corpus
 * it reads from differs.
 */
export function computeFilmStats(filters?: FilmFilters): FilmStats {
  const { snapFilms, films, summary } = resolveFilmCorpus(filters);
  const collectionDetails = getCollectionDetails();

  // Film prior = the corpus-wide average rating (over all 766 films).
  const fAvg = avgFromDist(summary.ratingDistribution);

  // Hours watched: snapshot runtimes (all films), not just enriched.
  const hours = Math.round(
    snapFilms.reduce((s, f) => s + (f.tmdb?.runtime || 0), 0) / 60,
  );

  // Franchise table (released-count qualification) for the franchise +
  // people-deskew rankings.
  const currentYear = new Date().getUTCFullYear();
  const releasedTotal = releasedTotalFromCollectionDetails(
    collectionDetails,
    currentYear,
  );
  const familyInfo = buildFamilies(films, releasedTotal);

  // Every watch date across the corpus (temporal tiles).
  const watchDates = snapFilms.flatMap((f) =>
    (f.reviews || []).map((r) => r.watchedDate).filter(Boolean),
  );
  // Recent years drive the stacked-by-year weekday/month tiles.
  const years = recentYears(watchDates);
  const yearLabels = years.map(String);

  // Genre rows for the diverging tile — every logged film's genres +
  // its rating, over the full corpus (not just the enriched subset).
  const genreRows = snapFilms.map((f) => ({
    genres: f.tmdb?.genres ?? [],
    rating: f.primaryRating,
  }));

  const stats: Omit<FilmStats, "collapse"> = {
    lifetime: {
      films: summary.totalFilms,
      thisYear: summary.thisYearCount,
      hours,
      avgRating: fAvg,
    },
    genreDistribution: rank(summary.genreDistribution),
    ratingDistribution: summary.ratingDistribution,
    decadeDistribution: summary.decadeDistribution,
    languages: contrastE(
      films,
      (f) => (f.language ? [normalizeLanguage(f.language)] : []),
      mineOf,
      4,
      8,
      3,
      fAvg,
      languageName,
    ),
    countries: contrastE(
      films,
      (f) => (f.country ? [normalizeCountry(f.country)] : []),
      mineOf,
      4,
      8,
      5,
      fAvg,
      countryName,
    ),
    overlap: overlapCounts(films),
    conglomerate: contrastE(
      films,
      (f) => [conglomerateOfStudio(f.studios)],
      mineOf,
      5,
      8,
      3,
      fAvg,
    ),
    studios: contrastE(
      films.filter((f) => f.studios?.length),
      (f) => f.studios.slice(0, 2).map(canonStudio),
      mineOf,
      4,
      8,
      8,
      fAvg,
    ),
    actors: contrastDeskew(films, filmActorNames, 4, 8, 5, fAvg, familyInfo),
    directors: contrastDeskew(
      films,
      (f) => (f.director ? [f.director] : []),
      4,
      8,
      3,
      fAvg,
      familyInfo,
    ),
    writers: contrastDeskew(
      films,
      (f) => (f.writers || []).map((w) => w.name),
      4,
      8,
      3,
      fAvg,
      familyInfo,
    ),
    franchises: franchiseRanking(films, familyInfo, fAvg),
    worldLean: worldLean(films),
    youVsWorld: youVsWorld(films),
    divergingGenre: divergingGenre(genreRows, fAvg, 20),
    theatrical: theatricalSplit(films),
    releaseType: rank(
      films.reduce<Record<string, number>>((acc, f) => {
        if (f.release && f.release.cls !== "unknown") {
          acc[f.release.cls] = (acc[f.release.cls] || 0) + 1;
        }
        return acc;
      }, {}),
    ),
    releaseTypeByYear: releaseTypeByYear(films),
    budgetTierByYear: budgetTierByYear(films),
    budgetEraHeat: budgetEraHeat(films),
    releaseTypeEraHeat: releaseTypeEraHeat(films),
    temporal: {
      paceByDay: doySeries(watchDates),
      byWeekday: weekdayTally(watchDates),
      byMonth: monthTally(watchDates),
      weekdayMatrix: {
        cats: [...WEEKDAYS],
        segments: yearLabels,
        matrix: weekdayByYearMatrix(watchDates, years),
      },
      monthMatrix: {
        cats: [...MONTHS],
        segments: yearLabels,
        matrix: monthByYearMatrix(watchDates, years),
      },
    },
  };

  // Bake the collapse verdict into the response (§6): the render reads the
  // per-tile rung / per-band state / page verdict instead of re-deriving
  // thinness in the view layer.
  return {
    ...stats,
    collapse: collapse("films", FILMS_TILES, filmTileSurvival(stats, filters)),
  };
}
