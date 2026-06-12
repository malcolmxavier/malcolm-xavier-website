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

/** You-vs-critics: how your ratings diverge from the consensus. */
export type YouVsWorld = {
  /** Mean (your★ − Metascore÷20) across films with a Metascore. */
  avgVsMetascore: number;
  /** Mean (your★ − Letterboxd crowd★) across films with a LB score. */
  avgVsLetterboxd: number;
  /** How many films had a Metascore to compare against. */
  filmsVsCritics: number;
  /** % of the enriched set covered by a Metascore (the comparison base). */
  coveragePct: number;
  /** Your biggest over-the-critics calls (top by positive delta). */
  hotTakes: { title: string; year: number; delta: number }[];
  /** Critics' darlings you rated below them (top by negative delta). */
  darlings: { title: string; year: number; delta: number }[];
};

/**
 * Rating gaps vs. Metascore (÷20 onto the 0.5–5★ scale) and the
 * Letterboxd crowd, plus the sharpest disagreements either way (sketch
 * youVsWorldTile, ~582). Films lacking the relevant external score are
 * simply excluded from that average.
 */
export function youVsWorld(films: EnrichedFilm[]): YouVsWorld {
  const mc = films
    .filter((f) => f.ratings?.metacritic != null && f.mine != null)
    .map((f) => ({
      title: f.title,
      year: f.year,
      delta: (f.mine as number) - (f.ratings!.metacritic as number) / 20,
    }));
  const lb = films
    .filter((f) => f.ratings?.letterboxd != null && f.mine != null)
    .map((f) => (f.mine as number) - (f.ratings!.letterboxd as number));
  const sorted = [...mc].sort((a, b) => b.delta - a.delta);
  return {
    avgVsMetascore: meanOf(mc.map((x) => x.delta)),
    avgVsLetterboxd: meanOf(lb),
    filmsVsCritics: mc.length,
    coveragePct: films.length ? Math.round((mc.length / films.length) * 100) : 0,
    hotTakes: sorted.slice(0, 6),
    darlings: sorted.slice(-6).reverse(),
  };
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
};

/** Compute every film dashboard number from the live fixtures. */
export function computeFilmStats(): FilmStats {
  const { films: snapFilms, summary } = getFilms();
  const films = getEnrichedFilms();
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

  return {
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
}
