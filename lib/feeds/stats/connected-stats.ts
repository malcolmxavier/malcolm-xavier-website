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
import { getFilmsWithEnrichment, getShowsWithEnrichment } from "../review-corpus";
import { applyFilters, parseFilmFilters } from "../letterboxd-utils";
import type { FilmFilters, Film } from "../letterboxd-utils";
import {
  applyShowFilters,
  summarizeShows,
  parseShowFilters,
} from "../serializd-utils";
import type { ShowFilters, Show, TvSummary } from "../serializd-utils";
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
  MONTHS,
  monthByYearMatrix,
  recentYears,
  WEEKDAY_INDEX,
  WEEKDAYS,
} from "./temporal";
import { hasActiveFilter } from "./filter-url-state";
import type { GroupedStackedMatrix, StackedMatrix } from "./chart-data";
import {
  collapse,
  CONNECTED_TILES,
  type CollapseResult,
  type TileSurvival,
} from "./collapse";
import { sumMatrix, versus, one } from "./survival-helpers";

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
  // Short labels keep the dense two-stack columns legible. The KEYS here must
  // match the canonical conglomerate names emitted by conglomerateOfStudio /
  // conglomerateOfNet verbatim — if the canon renames a group, the lookup
  // silently misses and the long name leaks into the column. Any abbreviation
  // we don't list falls through to the full canon name (the `|| x.c` below).
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

/** Logging cadence: films (Letterboxd) vs seasons (Serializd). */
export type ConnectedTemporal = {
  /** Films vs television by month, the headline cadence view: each month
      carries two bars (film, television), and each bar is stacked by
      year — so you read both the medium split AND the year-over-year mix
      in one chart. Indexed [month][medium][year]. */
  monthMediumYear: GroupedStackedMatrix;
  /** Films vs seasons by weekday (segments = Films, Seasons). */
  weekdayMatrix: StackedMatrix;
};

function connectedTemporal(
  filmDates: string[],
  seasonDates: string[],
): ConnectedTemporal {
  const byWeekday = (dates: string[], idx: number) =>
    dates.filter((d) => new Date(d).getUTCDay() === idx).length;

  // One shared year set across both libraries (recent six, ascending) so
  // film and TV bars stack on the SAME colours and the legend reads once
  // for the whole chart. Capped at six to keep the stacks legible and to
  // fit the six-hue categorical palette without wrapping.
  const years = recentYears([...filmDates, ...seasonDates], 6);
  // Each medium's [month][year] grid. monthByYearMatrix parses every date once
  // into a year→month tally, so the two grids cost two linear passes instead of
  // the 12×6 re-scan-and-re-parse the inline builder used to run per medium.
  const filmGrid = monthByYearMatrix(filmDates, years);
  const tvGrid = monthByYearMatrix(seasonDates, years);

  return {
    // [month] → [ [film by year], [television by year] ].
    monthMediumYear: {
      cats: [...MONTHS],
      groups: ["Film", "Television"],
      segments: years.map(String),
      matrix: MONTHS.map((_m, mi) => [filmGrid[mi], tvGrid[mi]]),
    },
    weekdayMatrix: {
      cats: [...WEEKDAYS],
      segments: ["Films", "Seasons"],
      matrix: WEEKDAY_INDEX.map((idx) => [
        byWeekday(filmDates, idx),
        byWeekday(seasonDates, idx),
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
    // Sort by the signed TV-over-film gap, descending: genres I rate higher on
    // television than on film lead, genres I rate higher on film trail, and the
    // sign of each row's gap stays readable as you scan down the dumbbell. This
    // ordering is intentional — the contrast (not the raw average) is the story.
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
  /** The degradation verdict + per-tile rungs for this (possibly filtered)
   *  corpus (§6). Connected never hands off to a single reviews list — it
   *  reports "connected-thin" and points back at the two cluster dashboards. */
  collapse: CollapseResult;
};

/**
 * Connected accepts only the dimensions that exist on BOTH libraries (§5c):
 * ratings, genres, languages, countries, conglomerates, watched*, actors.
 * The shared dims have identical field names on FilmFilters and ShowFilters,
 * so one object satisfies both — each side's apply function reads only the
 * fields it knows and ignores the rest. (Film-only / TV-only fields like
 * studios or networks aren't offered on connected; if a caller sets them
 * anyway, they'd narrow only their own side — the page controls won't expose
 * them, per §5c, so this is a non-issue in practice.)
 */
export type ConnectedFilters = FilmFilters & ShowFilters;

/** The narrowed connected corpus — both libraries narrowed in lockstep. */
type ConnectedCorpus = {
  films: EnrichedFilm[];
  enrichedShows: EnrichedShow[];
  summary: TvSummary;
  snapFilms: Film[];
  snapShows: Show[];
};

/**
 * Resolve the connected corpus.
 *
 * - No filters: shipped arrays, BYTE-FOR-BYTE identical to before.
 * - With filters: narrow the film side via `applyFilters` and the TV side via
 *   `applyShowFilters` (shared predicates, reused), restrict the enriched
 *   arrays to the survivors by TMDB id, and recompute the TV summary over the
 *   surviving shows. Both sides narrow against the SAME shared-dimension
 *   filter, so a connected figure stays balanced across libraries.
 */
function resolveConnectedCorpus(filters?: ConnectedFilters): ConnectedCorpus {
  if (!filters || !hasActiveFilter(filters)) {
    return {
      films: getEnrichedFilms(),
      enrichedShows: getEnrichedShows(),
      summary: getShows().summary,
      snapFilms: getFilms().films,
      snapShows: getShows().shows,
    };
  }

  // Film side.
  const { films: enrichedFilmSnap } = getFilmsWithEnrichment();
  const snapFilms = applyFilters(enrichedFilmSnap, filters).map((a) => a.film);
  const survivingFilmIds = new Set<number>();
  for (const f of snapFilms) if (f.tmdb?.id != null) survivingFilmIds.add(f.tmdb.id);
  const films = getEnrichedFilms().filter((e) => survivingFilmIds.has(e.tmdbId));

  // TV side.
  const { shows: enrichedShowSnap, summary: baseSummary } = getShowsWithEnrichment();
  const snapShows = applyShowFilters(enrichedShowSnap, filters).map((a) => a.show);
  const survivingShowIds = new Set<number>();
  for (const s of snapShows) if (s.tmdb?.id != null) survivingShowIds.add(s.tmdb.id);
  const enrichedShows = getEnrichedShows().filter((e) =>
    survivingShowIds.has(e.tmdbId),
  );
  const summary = summarizeShows(snapShows, baseSummary);

  return { films, enrichedShows, summary, snapFilms, snapShows };
}

/**
 * Compute every connected dashboard number from the live fixtures.
 *
 * `filters` optional: omitted/empty → full corpus, identical to the pre
 * filter behaviour. Provided → both libraries narrowed by the shared
 * predicate (§5c, §9).
 */
export function computeConnectedStats(filters?: ConnectedFilters): ConnectedStats {
  const corpus = resolveConnectedCorpus(filters);
  const films = corpus.films;
  // TV ratings use the season signal (see seasonRating), matching the
  // television dashboard — so crossover actors, the genre dumbbell's TV
  // side, the conglomerate split, and the pooled world lean rank on
  // seasons, not the most-recent-review proxy. Films are unchanged.
  const shows = corpus.enrichedShows.map((s) => ({ ...s, mine: seasonRating(s) }));
  const summary = corpus.summary;
  const pooled: Titled[] = [...films, ...shows];
  const cm = meanOf(pooled.map(mineOf));

  // Head-to-head: the FULL film corpus (not just the enriched subset)
  // vs. rated seasons. Season avg + rated-season count come from the
  // snapshot's per-level distribution.
  const snapFilms = corpus.snapFilms;
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
  const seasonDates = corpus.snapShows.flatMap((s) =>
    (s.reviews || [])
      .filter((r) => r.level === "season" && r.watchedDate)
      .map((r) => r.watchedDate),
  );

  // The view-model, sans the collapse verdict (which is derived FROM it, just
  // below — mirrors computeFilmStats / computeTvStats).
  const stats: Omit<ConnectedStats, "collapse"> = {
    headToHead: {
      filmsLogged: snapFilms.length,
      seasonsLogged,
      filmAvg,
      seasonAvg,
      seasonMinusFilm: seasonAvg - filmAvg,
    },
    crossoverActors: crossoverActors(films, shows),
    // `shows` MUST be the season-remapped copy built above (mine = seasonRating),
    // not corpus.enrichedShows directly: genreFilmVsTv averages each show's
    // `mine`, and the raw enriched field is the most-recent-review proxy. Passing
    // raw shows would silently average the wrong signal with no type error.
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

  // Bake in the degradation verdict (§6). The pooled corpus size (films +
  // rated seasons) anchors the always-surviving counters; the connected
  // verdict itself is the connected-thin exception, never a reviews handoff.
  const corpusN = snapFilms.length + seasonsLogged;
  return {
    ...stats,
    collapse: collapse(
      "connected",
      CONNECTED_TILES,
      connectedTileSurvival(stats, corpusN, filters),
    ),
  };
}

/**
 * Derive every connected tile's surviving-n + self-reference flag from the
 * computed view-model and the active filter. Pure (the same stats always map
 * to the same survival), so it's unit-testable against the fixtures — the
 * connected sibling of filmTileSurvival / tvTileSurvival.
 *
 * Connected tiles DON'T deep-link (cross-brand → no single reviews list), so
 * there are no navigational "immortal" tiles here; every chart gates on its
 * own structural floor, and a single-value include self-references the tile
 * whose axis it pins.
 */
export function connectedTileSurvival(
  s: Omit<ConnectedStats, "collapse">,
  corpusN: number,
  filters?: ConnectedFilters,
): TileSurvival[] {
  const f = filters ?? {};

  // A single include value collapses the matching tile's distribution to a
  // tautology (§6 self-reference). Two connected tiles have a pinnable axis:
  //   • filtering to ONE genre makes the film-vs-TV genre dumbbell a one-row
  //     comparison, so it folds to a readout; and
  //   • filtering to ONE actor makes the crossover-actors versus tile a single
  //     self-comparison — mirrors how the film and TV dashboards pin their own
  //     `actors` versus tile on a one-actor filter (film-stats / tv-stats).
  // (Rating and watched-year don't have a connected distribution tile to
  // flatten — head-to-head and the temporal grids stay meaningful under a
  // single value.)
  const selfRef = new Set<string>();
  if (one(f.genres)) selfRef.add("genres-film-vs-tv");
  if (one(f.actors)) selfRef.add("crossover-actors");

  // Per-tile survival on the right fragility axis. Counters ride the pooled
  // corpus (honest at any n ≥ 1). Stacked/grid tiles count the items feeding
  // them (sumMatrix), not their category count, so a dense few-category chart
  // still survives. Versus tiles live on their most-logged column and degrade
  // to a readout when the rated column drops below the per-column floor.
  const surv: Record<
    string,
    { survivingN: number; degradeToReadout?: boolean }
  > = {
    // Head to head — the always-surviving counter that anchors the page.
    "films-vs-television": { survivingN: corpusN },
    // Film vs. television. The dumbbell counts shared genres (≥5 logged on
    // each side); see its floor: 2 in CONNECTED_TILES. Crossover actors is a
    // versus tile gated symmetrically (≥2 films AND ≥2 shows).
    "genres-film-vs-tv": { survivingN: s.genreFilmVsTv.length },
    "crossover-actors": versus(s.crossoverActors),
    // Where it comes from — counter rides the corpus; the language×country bar
    // counts surviving pairs; languages/countries are versus tiles.
    "world-cinema-lean": { survivingN: corpusN },
    languages: versus(s.languages),
    countries: versus(s.countries),
    "language-x-country": { survivingN: s.overlap.topPairs.length },
    // The industry — a film-vs-TV stacked bar; counts the titles feeding it.
    "by-conglomerate": { survivingN: sumMatrix(s.conglomerate.matrix) },
    // When I watch — each grid counts its logged events. The month view is a
    // grouped stack ([month][medium][year]); flatten one level for the total.
    "film-and-tv-by-month": {
      survivingN: sumMatrix(s.temporal.monthMediumYear.matrix.flat()),
    },
    "by-weekday": { survivingN: sumMatrix(s.temporal.weekdayMatrix.matrix) },
  };

  return CONNECTED_TILES.map((tile) => ({
    id: tile.id,
    survivingN: surv[tile.id]?.survivingN ?? 0,
    selfReferenced: selfRef.has(tile.id),
    degradeToReadout: surv[tile.id]?.degradeToReadout ?? false,
  }));
}

/** The connected dashboard's filterable params — the dimensions it actually
 *  REPORTS on AND that exist on BOTH libraries (§5c). Bounded rails: rating,
 *  genre, watched year. Omnibox (high-card): actor, language, country,
 *  conglomerate. Cluster-only dimensions connected never surfaces (studios,
 *  networks, creators, directors, writers, type, decade) are deliberately
 *  absent. Shared by the URL parser and the cross-dashboard carry-over. */
export const CONNECTED_FILTER_PARAMS = [
  "rating",
  "genre",
  "watchedYear",
  "actor",
  "language",
  "country",
  "conglomerate",
] as const;

/**
 * Parse the connected dashboard's URL params into a ConnectedFilters object.
 *
 * Restrict the raw params to CONNECTED_FILTER_PARAMS FIRST — a hand-crafted
 * ?studio= / ?network= must never narrow one side only — then delegate to the
 * proven per-library parsers and merge. The shared dims have identical field
 * names and semantics on FilmFilters and ShowFilters, so the two parses agree
 * on every field and the merged object satisfies both halves of the
 * intersection type.
 */
export function parseConnectedFilters(
  params: Record<string, string | string[] | undefined>,
): ConnectedFilters {
  const shared: Record<string, string | string[] | undefined> = {};
  for (const p of CONNECTED_FILTER_PARAMS) shared[p] = params[p];
  // Spread-merge contract: parseShowFilters wins on any field both parsers
  // emit. That is safe ONLY because every CONNECTED_FILTER_PARAMS dimension is
  // a *shared* field (rating, genre, watchedYear, actor, language, country,
  // conglomerate) that both parsers read from the same key and parse
  // identically — so the override is a no-op in value, never a merge loss. The
  // film-only fields (directors, writers, studios, collections) and TV-only
  // fields (creators, networks, type) survive because the other parser never
  // emits them. `watchedWindow` can't leak: it isn't in CONNECTED_FILTER_PARAMS,
  // so connected only ever sets `watchedYears`.
  //
  // The `as ConnectedFilters` is a TS limitation only: each parser returns the
  // watchedYears|watchedWindow discriminated union, and spreading two
  // union-typed results can't be inferred as assignable to their intersection
  // even though the value satisfies both.
  return {
    ...parseFilmFilters(shared),
    ...parseShowFilters(shared),
  } as ConnectedFilters;
}

/**
 * Narrow a cluster dashboard's active params to connected's vocabulary and
 * return a "?a=b" query string (or "") — so a film/TV selection carries onto
 * /stats/connected without leaking cluster-only params (studios, networks, …)
 * the connected parser would ignore anyway. The shared dims use identical
 * param names and encodings across all three dashboards, so values transfer
 * verbatim.
 */
export function carryConnectedParams(active: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of CONNECTED_FILTER_PARAMS) {
    for (const v of active.getAll(k)) out.append(k, v);
  }
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}
