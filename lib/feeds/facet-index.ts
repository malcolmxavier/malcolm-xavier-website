// ─────────────────────────────────────────────────────────────────
// Facet indexation — the ONE source of "which entity values earn a
// dedicated indexed route."
//
// Four consumers must agree on this gate or the site ships thin pages
// (or 404s its own sitemap):
//   1. generateStaticParams on each /[medium]/[facet]/[slug] route
//      (pre-renders exactly the indexable pages, nothing thin)
//   2. app/sitemap.ts (the crawl manifest)
//   3. the reviews-page canonical handoff — a single-facet ?param= state
//      canonicals to its dedicated route ONLY when the value clears the
//      floor (sub-floor values stay self-canonical, no route exists)
//   4. the stats-tile deep-links — link to the route iff indexable, else
//      fall back to the noindex ?param= form
//
// Per-type count floors are the locked policy (PLAN.md "Indexation
// rule"), calibrated per type's cardinality. Studio is the one
// exception: a curated allowlist AND count ≥ 5 — TMDB lists production
// companies, not searcher-facing studios, so a count floor alone can't
// separate labels from co-financiers.
//
// Pure + client-safe: operates on a passed-in corpus, no fs / no
// server-only deps, so tests and both server layers import it freely.
// ─────────────────────────────────────────────────────────────────

import {
  filmFacetDistributions,
  type Film,
} from "./letterboxd-utils";
import {
  showFacetDistributions,
  type Show,
  type ShowFacet,
} from "./serializd-utils";
import { primaryNetwork } from "./stats/network-canon";
import { STUDIO_INDEX_ALLOWLIST } from "./stats/studio-canon";
import {
  buildFamilies,
  familiesOf,
  releasedTotalFromCollectionDetails,
  type FamilyInfoMap,
} from "./stats/franchise";
import {
  familiesOfShow,
  tvFamilyName,
  TV_FAMILIES,
} from "./stats/tv-franchise";
import type { CollectionDetail } from "./enrichment";

/** Film facet types that earn a dedicated indexed route. */
export type FilmRouteFacet =
  | "directors"
  | "actors"
  | "writers"
  | "studios"
  | "languages"
  | "countries"
  | "decades";

/**
 * TV facet types that earn a dedicated indexed route. `networks` + `types`
 * aren't in showFacetDistributions (they're the WS3-era facets, keyed on
 * primary network / tmdb.type), so they're counted directly here.
 */
export type TvRouteFacet =
  | "creators"
  | "actors"
  | "networks"
  | "languages"
  | "countries"
  | "types"
  | "decades";

/**
 * Per-type count floors (PLAN.md floors table, locked 2026-06-10). A value
 * indexes iff its logged count ≥ the floor; studio additionally requires
 * STUDIO_INDEX_ALLOWLIST membership.
 */
export const FILM_FACET_FLOORS: Record<FilmRouteFacet, number> = {
  directors: 3,
  actors: 8,
  writers: 3,
  studios: 5,
  languages: 3,
  countries: 5,
  decades: 2,
};

export const TV_FACET_FLOORS: Record<TvRouteFacet, number> = {
  creators: 2,
  actors: 3,
  networks: 5,
  languages: 2,
  countries: 3,
  types: 2,
  decades: 2,
};

// ── Route URL vocabulary (shared by the renderers, the sitemap, the stats
//    deep-links, and the reviews canonical handoff) ─────────────────────
/** Facet key → URL segment, e.g. directors → /films/director/[slug]. */
export const FILM_FACET_BASEPATH: Record<FilmRouteFacet, string> = {
  directors: "director",
  actors: "actor",
  writers: "writer",
  studios: "studio",
  languages: "language",
  countries: "country",
  decades: "decade",
};

export const TV_FACET_BASEPATH: Record<TvRouteFacet, string> = {
  creators: "creator",
  actors: "actor",
  networks: "network",
  languages: "language",
  countries: "country",
  types: "type",
  decades: "decade",
};

/**
 * Facet key → the reviews query param it canonicalizes from. Film
 * `directors` is undefined: the exact-director facet has NO param (the
 * ?director= param is the fuzzy search box), so the director route pins
 * internally and there's no single-facet param state to hand off / deep-link
 * via param.
 */
export const FILM_FACET_PARAM: Record<FilmRouteFacet, string | undefined> = {
  directors: undefined,
  actors: "actor",
  writers: "writer",
  studios: "studio",
  languages: "language",
  countries: "country",
  decades: "decade",
};

export const TV_FACET_PARAM: Record<TvRouteFacet, string> = {
  creators: "creator",
  actors: "actor",
  networks: "network",
  languages: "language",
  countries: "country",
  types: "type",
  decades: "decade",
};

// The TvRouteFacet members that live in showFacetDistributions (everything
// except networks/types, which are counted separately below).
type ShowDistFacet = Extract<TvRouteFacet, ShowFacet>;

// ── Memoization ───────────────────────────────────────────────────
// indexableFilmFacetNames / indexableTvFacetNames are called many times
// per build (once per route's generateStaticParams, again in the sitemap,
// again per stats deep-link). Each underlying distribution is a full pass
// over the corpus, so cache the per-facet result keyed by the corpus array
// identity (getFilmsWithEnrichment / getShowsWithEnrichment return a stable
// module-cached array, so this hits across all consumers in one build).
const filmCache = new WeakMap<Film[], Map<FilmRouteFacet, [string, number][]>>();
const showCache = new WeakMap<Show[], Map<TvRouteFacet, [string, number][]>>();

/** [name, count] for primary network across the corpus. The network filter
 *  matches on PRIMARY network (so a show counts under exactly one network —
 *  consistent with deriveAvailableNetworks and the stats counting rule). */
function networkDistribution(shows: Show[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const show of shows) {
    const primary = primaryNetwork(show.tmdb?.networks ?? []);
    if (primary) counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

/** [name, count] for TMDB series type across the corpus. */
function typeDistribution(shows: Show[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const show of shows) {
    const t = show.tmdb?.type;
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

/**
 * [canonical name, logged count] pairs that clear the floor for a film
 * facet — the exact set of values that earn a dedicated indexed route (and
 * a sitemap entry). Studio additionally requires allowlist membership.
 * Sorted count desc (inherited from the distribution). The count feeds the
 * route copy ("N films directed by X"). Memoized per corpus + facet.
 */
export function indexableFilmFacets(
  facet: FilmRouteFacet,
  films: Film[],
): [string, number][] {
  let perFacet = filmCache.get(films);
  if (!perFacet) {
    perFacet = new Map();
    filmCache.set(films, perFacet);
  }
  const cached = perFacet.get(facet);
  if (cached) return cached;

  const floor = FILM_FACET_FLOORS[facet];
  const dist = filmFacetDistributions(films)[facet];
  const kept = dist.filter(([name, count]) => {
    if (count < floor) return false;
    if (facet === "studios") return STUDIO_INDEX_ALLOWLIST.has(name);
    return true;
  });
  perFacet.set(facet, kept);
  return kept;
}

/** TV mirror of indexableFilmFacets. */
export function indexableTvFacets(
  facet: TvRouteFacet,
  shows: Show[],
): [string, number][] {
  let perFacet = showCache.get(shows);
  if (!perFacet) {
    perFacet = new Map();
    showCache.set(shows, perFacet);
  }
  const cached = perFacet.get(facet);
  if (cached) return cached;

  const floor = TV_FACET_FLOORS[facet];
  const dist =
    facet === "networks"
      ? networkDistribution(shows)
      : facet === "types"
        ? typeDistribution(shows)
        : showFacetDistributions(shows)[facet as ShowDistFacet];
  const kept = dist.filter(([, count]) => count >= floor);
  perFacet.set(facet, kept);
  return kept;
}

/** Canonical names (only) that clear the floor for a film facet. */
export function indexableFilmFacetNames(
  facet: FilmRouteFacet,
  films: Film[],
): string[] {
  return indexableFilmFacets(facet, films).map(([name]) => name);
}

/** Canonical names (only) that clear the floor for a TV facet. */
export function indexableTvFacetNames(
  facet: TvRouteFacet,
  shows: Show[],
): string[] {
  return indexableTvFacets(facet, shows).map(([name]) => name);
}

/**
 * True if a specific film entity (canonical display name) earns a route.
 * The stats deep-link route-vs-param fallback and the reviews canonical
 * handoff both gate on this.
 */
export function isIndexableFilmFacet(
  facet: FilmRouteFacet,
  name: string,
  films: Film[],
): boolean {
  return indexableFilmFacetNames(facet, films).includes(name);
}

/** TV mirror of isIndexableFilmFacet. */
export function isIndexableTvFacet(
  facet: TvRouteFacet,
  name: string,
  shows: Show[],
): boolean {
  return indexableTvFacetNames(facet, shows).includes(name);
}

// ── Film collections (franchise families → /films/collections/[slug]) ──
//
// Collections are the one facet that ISN'T a flat field on the film: a
// family is a CURATED grouping over TMDB collections (FAMILY_BY_* in
// stats/franchise.ts) — e.g. "John Wick" folds in Ballerina, "Alien"
// merges four TMDB collections. So the route vocabulary is the curated
// FAMILY name, NOT the raw TMDB collection name the ?collection= filter
// param carries. That mismatch is exactly why the stats Franchises tile
// couldn't deep-link before this workstream.
//
// Indexation gate: a family earns a route iff it QUALIFIES as a franchise
// (buildFamilies' rule: curated, or ≥3 released members) AND clears the
// route count floor (≥ FRANCHISE_ROUTE_FLOOR logged films). The franchise
// qualification floor (watched ≥ 2, used by the stats tile) is looser than
// the route floor (≥ 3), so a 2-film family shows on the dashboard but
// gets no thin page — same no-thin-page rule as every other facet.

/** Minimum logged films for a family to earn a dedicated route (PLAN.md
 *  floors table: film:franchise = 3). */
export const FRANCHISE_ROUTE_FLOOR = 3;

/** One routable collection: the family KEY (for membership tests via
 *  familiesOf — curated names map to themselves, raw collections to
 *  "col:<id>"), the display NAME (for copy + slug), and the logged COUNT. */
export type FilmCollectionRoute = { key: string; name: string; count: number };

// Map a reviews-corpus Film onto the minimal shape the franchise rule
// needs. tmdbId drives the curated FAMILY_BY_FILM lookup (Ballerina has no
// TMDB collection); collection + rating ride the enrichment delta.
function toFranchiseFilm(f: Film) {
  return {
    tmdbId: f.tmdb?.id ?? f.enrichment?.tmdbId ?? -1,
    collection: f.enrichment?.collection ?? null,
    mine: f.primaryRating ?? f.enrichment?.mine ?? null,
  };
}

/** The franchise-family table for the film corpus (curated families +
 *  qualifying TMDB collections), keyed by family key. `currentYear` gates
 *  the released-member count that qualifies an un-curated collection.
 *
 *  Not memoized (unlike the flat-facet distributions above): there's a
 *  single collection route, so this is hit only a handful of times per
 *  build, and a films-keyed WeakMap would have to also key on
 *  collectionDetails + currentYear to be correct. buildFamilies is a couple
 *  of cheap passes; computing it fresh is the honest, drift-proof choice. */
export function filmFamilyInfo(
  films: Film[],
  collectionDetails: Record<number, CollectionDetail>,
  currentYear: number,
): FamilyInfoMap {
  const released = releasedTotalFromCollectionDetails(
    collectionDetails,
    currentYear,
  );
  return buildFamilies(films.map(toFranchiseFilm), released);
}

/**
 * The families that earn a dedicated indexed route — qualifying franchises
 * whose logged count clears FRANCHISE_ROUTE_FLOOR. Sorted count desc, name
 * asc (stable slug order for the sitemap + hub). The count feeds the route
 * copy ("N films in the X collection").
 */
export function indexableFilmCollections(
  films: Film[],
  collectionDetails: Record<number, CollectionDetail>,
  currentYear: number,
): FilmCollectionRoute[] {
  const info = filmFamilyInfo(films, collectionDetails, currentYear);
  return Object.entries(info)
    .filter(([, v]) => v.qualifies && v.watched >= FRANCHISE_ROUTE_FLOOR)
    .map(([key, v]) => ({ key, name: v.name, count: v.watched }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Display names (only) of the routable film collections. */
export function indexableFilmCollectionNames(
  films: Film[],
  collectionDetails: Record<number, CollectionDetail>,
  currentYear: number,
): string[] {
  return indexableFilmCollections(films, collectionDetails, currentYear).map(
    (c) => c.name,
  );
}

/** The corpus films belonging to a family (by family KEY) — the membership
 *  set a collection route filters its grid down to. Uses familiesOf so a
 *  film in multiple families (AVP → Alien AND Predator) lands in each. */
export function filmsInFilmFamily(films: Film[], key: string): Film[] {
  return films.filter((f) => familiesOf(toFranchiseFilm(f)).includes(key));
}

// ── TV collections (curated franchise families → /television/collections) ──
//
// Fully curated (TV_FAMILY_BY_SHOW in stats/tv-franchise.ts) — TMDB has no
// show-family signal. Because every member is hand-picked there's no padding
// noise, so the route floor is lower than film's (2 vs 3). The Bravo-verse
// hierarchy (Bravo → Real Housewives / Vanderpump Rules) means a show counts
// under BOTH its subcollection and its parent (familiesOfShow walks parents),
// so a parent collection's count is the union of its subcollections.

/** Minimum logged shows for a TV family to earn a route. Lower than film's
 *  FRANCHISE_ROUTE_FLOOR because the curated map has no noise to filter. */
export const TV_FRANCHISE_ROUTE_FLOOR = 2;

/** One routable TV collection: family key, display name, member-show count,
 *  and parent key (for the hierarchy display on the hub + parent route). */
export type TvCollectionRoute = {
  key: string;
  name: string;
  count: number;
  parent?: string;
};

const tvShowTmdbId = (s: Show): number =>
  s.tmdb?.id ?? Number(String(s.id).replace("tmdb-tv-", ""));

/** Member-show counts per family key across the corpus (parent collections
 *  included via familiesOfShow's parent walk). */
function tvFamilyCounts(shows: Show[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of shows) {
    for (const key of familiesOfShow(tvShowTmdbId(s))) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * The TV families that earn a dedicated route — every curated family whose
 * member count clears TV_FRANCHISE_ROUTE_FLOOR. Sorted count desc, name asc.
 */
export function indexableTvCollections(shows: Show[]): TvCollectionRoute[] {
  const counts = tvFamilyCounts(shows);
  return Object.keys(TV_FAMILIES)
    .map((key) => ({
      key,
      name: tvFamilyName(key),
      count: counts.get(key) ?? 0,
      parent: TV_FAMILIES[key].parent,
    }))
    .filter((c) => c.count >= TV_FRANCHISE_ROUTE_FLOOR)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Display names (only) of the routable TV collections. */
export function indexableTvCollectionNames(shows: Show[]): string[] {
  return indexableTvCollections(shows).map((c) => c.name);
}

/** The corpus shows belonging to a family (by family KEY) — the membership
 *  set a TV collection route filters down to. A parent key returns the union
 *  of its subcollections (familiesOfShow includes ancestors). */
export function showsInTvFamily(shows: Show[], key: string): Show[] {
  return shows.filter((s) => familiesOfShow(tvShowTmdbId(s)).includes(key));
}
