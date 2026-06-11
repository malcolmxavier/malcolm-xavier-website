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
import { filmActorNames, tvActorNames } from "./people";
import {
  countryName,
  languageName,
  normalizeCountry,
  normalizeLanguage,
} from "./provenance";

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

/** Mean-rating lean (non-English / non-US) pooled across both libraries. */
export type WorldLean = {
  nonEnglishVsEnglish: number;
  nonUsVsUs: number;
  pctInternational: number;
};

function worldLeanCombined(items: Titled[]): WorldLean {
  const lang = (x: Titled) => normalizeLanguage(x.language);
  const ctry = (x: Titled) => normalizeCountry(x.country);
  const en = items.filter((x) => lang(x) === "en");
  const nonen = items.filter((x) => x.language && lang(x) !== "en");
  const us = items.filter((x) => ctry(x) === "US");
  const nonus = items.filter((x) => x.country && ctry(x) !== "US");
  return {
    nonEnglishVsEnglish: meanOf(nonen.map(mineOf)) - meanOf(en.map(mineOf)),
    nonUsVsUs: meanOf(nonus.map(mineOf)) - meanOf(us.map(mineOf)),
    pctInternational: Math.round((nonus.length / (us.length + nonus.length)) * 100),
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
  worldLean: WorldLean;
};

/** Compute every connected dashboard number from the live fixtures. */
export function computeConnectedStats(): ConnectedStats {
  const films = getEnrichedFilms();
  const shows = getEnrichedShows();
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
    worldLean: worldLeanCombined(pooled),
  };
}
