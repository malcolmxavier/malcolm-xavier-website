// ─────────────────────────────────────────────────────────────────
// Connected (cross-brand film × TV) dashboard numbers.
//
// Assembles the /stats/connected view-model from the enrichment
// reader + ported primitives. Faithful to the sketch's connected tiles
// (build-stats-sketch.mjs 843–924).
//
// The signature tile is crossover actors: the unified actor rule
// (top-10 billed; TV also ≥3 episodes), gated SYMMETRICALLY — in ≥2
// films AND ≥2 shows — so it reads as leading crossover work. Counts
// and means pool both libraries.
//
// Server-only.
// ─────────────────────────────────────────────────────────────────

import { getEnrichedFilms, getEnrichedShows } from "../enrichment";
import type { EnrichedFilm, EnrichedShow } from "../enrichment";
import { getFilms } from "../letterboxd";
import { getShows } from "../serializd";
import { avgFromDist, contrastE, meanOf, type Contrast } from "./shrinkage";
import { seasonRating } from "./tv-stats";
import { filmActorNames, tvActorNames } from "./people";
import {
  countryName,
  languageName,
  normalizeCountry,
  normalizeLanguage,
} from "./provenance";
import {
  overlapCounts,
  worldLean,
  type OverlapCounts,
  type WorldLean,
} from "./distributions";
import { conglomerateOfStudio } from "./studio-canon";
import { conglomerateOfNet } from "./network-canon";
import {
  dayOfYear,
  MONTHS,
  WEEKDAY_INDEX,
  WEEKDAYS,
} from "./temporal";
import type { StackedMatrix } from "./chart-data";

/** Anything with a language, country, and personal rating (film or show). */
type Titled = { language: string | null; country: string | null; mine: number | null };
const mineOf = (x: Titled) => x.mine ?? 0;

/** Film-vs-season head-to-head: counts + averages + the delta. */
export type HeadToHead = {
  filmsLogged: number;
  seasonsLogged: number;
  filmAvg: number;
  seasonAvg: number;
  seasonMinusFilm: number;
};

/** Crossover-actor ranking, with each name's film·TV split in the label. */
export type CrossoverActors = {
  /** Most-logged: ["Name (9f·2t)", combinedCount]. */
  most: [string, number][];
  /** Highest-rated (shrunk over everything logged): ["Name (9f·2t)", adj]. */
  major: [string, number][];
  /** How many actors clear the ≥2-films-AND-≥2-shows gate. */
  total: number;
};

/**
 * Crossover actors: gate symmetrically (≥2 films AND ≥2 shows), shrink
 * the combined rating toward the pooled mean (m=3). Label carries the
 * film·TV split, e.g. "Nicole Kidman (9f·2t)".
 */
export function crossoverActors(
  films: EnrichedFilm[],
  shows: EnrichedShow[],
): CrossoverActors {
  const cm = meanOf([...films, ...shows].map(mineOf));
  const m = 3;
  const fr: Record<string, number[]> = {};
  const tr: Record<string, number[]> = {};
  for (const f of films) for (const n of filmActorNames(f)) (fr[n] ??= []).push(mineOf(f));
  for (const s of shows) for (const n of tvActorNames(s)) (tr[n] ??= []).push(mineOf(s));
  const cross = Object.keys(fr)
    .filter((n) => (fr[n] || []).length >= 2 && (tr[n] || []).length >= 2)
    .map((n) => {
      const r = [...fr[n], ...tr[n]];
      const cnt = r.length;
      const raw = meanOf(r);
      return {
        label: `${n} (${fr[n].length}f·${tr[n].length}t)`,
        cnt,
        adj: (cnt / (cnt + m)) * raw + (m / (cnt + m)) * cm,
      };
    });
  const most: [string, number][] = cross
    .slice()
    .sort((a, b) => b.cnt - a.cnt || b.adj - a.adj)
    .slice(0, 8)
    .map((x): [string, number] => [x.label, x.cnt]);
  const major: [string, number][] = cross
    .slice()
    .sort((a, b) => b.adj - a.adj)
    .slice(0, 8)
    .map((x): [string, number] => [x.label, x.adj]);
  return { most, major, total: cross.length };
}

/**
 * Who owns what you watch, film + TV. Each film rolls up via its studio,
 * each show via its network, to the parent conglomerate (else
 * independent). Top-8 parents by combined total, displayed low→high so
 * the tallest (independent) sits on the right. Stacked Film vs TV (sketch
 * connConglomerateBoth, ~925).
 */
function conglomerateBoth(
  films: EnrichedFilm[],
  shows: EnrichedShow[],
): StackedMatrix {
  // Short labels keep the dense two-stack columns legible.
  const ABBR: Record<string, string> = {
    "Warner Bros. Discovery": "WBD",
    NBCUniversal: "NBCU",
    "Independent / other": "Indie+",
    "Amazon MGM": "Amazon",
  };
  const fc: Record<string, number> = {};
  const tc: Record<string, number> = {};
  for (const f of films) {
    const c = conglomerateOfStudio(f.studios);
    fc[c] = (fc[c] || 0) + 1;
  }
  for (const s of shows) {
    const c = conglomerateOfNet(s.networks);
    tc[c] = (tc[c] || 0) + 1;
  }
  const all = [...new Set([...Object.keys(fc), ...Object.keys(tc)])]
    .map((c) => ({ c, f: fc[c] || 0, t: tc[c] || 0, tot: (fc[c] || 0) + (tc[c] || 0) }))
    .sort((a, b) => b.tot - a.tot)
    .slice(0, 8)
    .sort((a, b) => a.tot - b.tot);
  return {
    cats: all.map((x) => ABBR[x.c] || x.c),
    segments: ["Film", "TV"],
    matrix: all.map((x) => [x.f, x.t]),
  };
}

/** One cumulative-by-day curve, all years pooled onto a single calendar. */
function pooledCumulative(dates: string[]): [number, number][] {
  const days = dates.map(dayOfYear).sort((a, b) => a - b);
  let c = 0;
  const points: [number, number][] = [[1, 0]];
  for (const d of days) {
    c++;
    points.push([d, c]);
  }
  return points;
}

/** A named line series for the cadence line chart (Films vs Seasons). */
export type LineSeries = { label: string; points: [number, number][] };

/** Logging cadence: films (Letterboxd) vs seasons (Serializd). */
export type ConnectedTemporal = {
  /** Cumulative films vs seasons, all years pooled onto one calendar. */
  pace: LineSeries[];
  /** Films vs seasons by weekday (segments = Films, Seasons). */
  weekdayMatrix: StackedMatrix;
  /** Films vs seasons by month. */
  monthMatrix: StackedMatrix;
};

function connectedTemporal(
  filmDates: string[],
  seasonDates: string[],
): ConnectedTemporal {
  const byWeekday = (dates: string[], idx: number) =>
    dates.filter((d) => new Date(d).getUTCDay() === idx).length;
  const byMonth = (dates: string[], mi: number) =>
    dates.filter((d) => new Date(d).getUTCMonth() === mi).length;
  return {
    pace: [
      { label: "Films", points: pooledCumulative(filmDates) },
      { label: "Seasons", points: pooledCumulative(seasonDates) },
    ],
    weekdayMatrix: {
      cats: [...WEEKDAYS],
      segments: ["Films", "Seasons"],
      matrix: WEEKDAY_INDEX.map((idx) => [
        byWeekday(filmDates, idx),
        byWeekday(seasonDates, idx),
      ]),
    },
    monthMatrix: {
      cats: [...MONTHS],
      segments: ["Films", "Seasons"],
      matrix: MONTHS.map((_m, mi) => [
        byMonth(filmDates, mi),
        byMonth(seasonDates, mi),
      ]),
    },
  };
}

/** A shared-genre rating comparison row (film avg vs TV avg). */
export type GenreDumbbell = { label: string; filmAvg: number; tvAvg: number };

function genreFilmVsTv(
  films: EnrichedFilm[],
  shows: EnrichedShow[],
): GenreDumbbell[] {
  const tally = (
    items: { genres: string[]; mine: number | null }[],
  ): [Record<string, number>, Record<string, number>] => {
    const c: Record<string, number> = {};
    const s: Record<string, number> = {};
    for (const it of items)
      for (const g of it.genres || []) {
        c[g] = (c[g] || 0) + 1;
        s[g] = (s[g] || 0) + (it.mine ?? 0);
      }
    return [c, s];
  };
  const [fg, fs] = tally(films);
  const [tg, ts] = tally(shows);
  return Object.keys(fg)
    .filter((g) => tg[g] && fg[g] >= 5 && tg[g] >= 5)
    .map((g) => ({ label: g, filmAvg: fs[g] / fg[g], tvAvg: ts[g] / tg[g] }))
    .sort((x, y) => y.tvAvg - y.filmAvg - (x.tvAvg - x.filmAvg));
}

/** The full /stats/connected view-model. */
export type ConnectedStats = {
  headToHead: HeadToHead;
  crossoverActors: CrossoverActors;
  genreFilmVsTv: GenreDumbbell[];
  languages: Contrast;
  countries: Contrast;
  overlap: OverlapCounts;
  conglomerate: StackedMatrix;
  worldLean: WorldLean;
  temporal: ConnectedTemporal;
};

/** Compute every connected dashboard number from the live fixtures. */
export function computeConnectedStats(): ConnectedStats {
  const films = getEnrichedFilms();
  // TV ratings use the season signal (see seasonRating), matching the
  // television dashboard — so crossover actors, the genre dumbbell's TV
  // side, the conglomerate split, and the pooled world lean rank on
  // seasons, not the most-recent-review proxy. Films are unchanged.
  const shows = getEnrichedShows().map((s) => ({ ...s, mine: seasonRating(s) }));
  const { summary } = getShows();
  const pooled: Titled[] = [...films, ...shows];
  const cm = meanOf(pooled.map(mineOf));

  // Head-to-head: the FULL film corpus (not just the enriched subset)
  // vs. rated seasons. Season avg + rated-season count come from the
  // snapshot's per-level distribution.
  const snapFilms = getFilms().films;
  const filmAvg = meanOf(
    snapFilms.map((f) => f.primaryRating).filter((r): r is number => r != null),
  );
  const seasonDist = summary.ratingDistributionByLevel.season;
  const seasonsLogged = Object.values(seasonDist).reduce((a, b) => a + b, 0);
  const seasonAvg = avgFromDist(seasonDist);

  // Cadence dates: film watch dates (full corpus) vs season completions.
  const filmDates = snapFilms.flatMap((f) =>
    (f.reviews || []).map((r) => r.watchedDate).filter(Boolean),
  );
  const seasonDates = getShows().shows.flatMap((s) =>
    (s.reviews || [])
      .filter((r) => r.level === "season" && r.watchedDate)
      .map((r) => r.watchedDate),
  );

  return {
    headToHead: {
      filmsLogged: snapFilms.length,
      seasonsLogged,
      filmAvg,
      seasonAvg,
      seasonMinusFilm: seasonAvg - filmAvg,
    },
    crossoverActors: crossoverActors(films, shows),
    genreFilmVsTv: genreFilmVsTv(films, shows),
    languages: contrastE(
      pooled.filter((x) => x.language),
      (x) => [normalizeLanguage(x.language)],
      mineOf,
      4,
      8,
      4,
      cm,
      languageName,
    ),
    countries: contrastE(
      pooled.filter((x) => x.country),
      (x) => [normalizeCountry(x.country)],
      mineOf,
      4,
      8,
      4,
      cm,
      countryName,
    ),
    overlap: overlapCounts(pooled),
    conglomerate: conglomerateBoth(films, shows),
    worldLean: worldLean(pooled),
    temporal: connectedTemporal(filmDates, seasonDates),
  };
}
