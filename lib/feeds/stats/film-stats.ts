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
  countryName,
  languageName,
  normalizeCountry,
  normalizeLanguage,
} from "./provenance";
import { doySeries, monthTally, weekdayTally } from "./temporal";

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

/** Mean-rating deltas for non-English / non-US lean + % international. */
export type WorldLean = {
  nonEnglishVsEnglish: number;
  nonUsVsUs: number;
  pctInternational: number;
};

export function worldCinemaLean(films: EnrichedFilm[]): WorldLean {
  const lang = (f: EnrichedFilm) => normalizeLanguage(f.language);
  const ctry = (f: EnrichedFilm) => normalizeCountry(f.country);
  const en = films.filter((f) => lang(f) === "en");
  const nonen = films.filter((f) => f.language && lang(f) !== "en");
  const us = films.filter((f) => ctry(f) === "US");
  const nonus = films.filter((f) => f.country && ctry(f) !== "US");
  return {
    nonEnglishVsEnglish: meanOf(nonen.map(mineOf)) - meanOf(en.map(mineOf)),
    nonUsVsUs: meanOf(nonus.map(mineOf)) - meanOf(us.map(mineOf)),
    pctInternational: Math.round((nonus.length / (us.length + nonus.length)) * 100),
  };
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

/** Distinct-count summary for the language × country overlap tile. */
export type OverlapCounts = { pairs: number; languages: number; countries: number };

function overlapCounts(
  items: { language: string | null; country: string | null }[],
): OverlapCounts {
  const langs = new Set<string>();
  const countries = new Set<string>();
  const pairs = new Set<string>();
  for (const it of items) {
    const l = normalizeLanguage(it.language);
    const c = normalizeCountry(it.country);
    if (l) langs.add(l);
    if (c) countries.add(c);
    if (l && c) pairs.add(l + "·" + c);
  }
  return { pairs: pairs.size, languages: langs.size, countries: countries.size };
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
  theatrical: TheatricalSplit;
  releaseType: [string, number][];
  temporal: {
    paceByDay: ReturnType<typeof doySeries>;
    byWeekday: [string, number][];
    byMonth: [string, number][];
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
    worldLean: worldCinemaLean(films),
    theatrical: theatricalSplit(films),
    releaseType: rank(
      films.reduce<Record<string, number>>((acc, f) => {
        if (f.release && f.release.cls !== "unknown") {
          acc[f.release.cls] = (acc[f.release.cls] || 0) + 1;
        }
        return acc;
      }, {}),
    ),
    temporal: {
      paceByDay: doySeries(watchDates),
      byWeekday: weekdayTally(watchDates),
      byMonth: monthTally(watchDates),
    },
  };
}
