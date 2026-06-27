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
  filmEntityFacets,
  slugifyGenre,
  type Film,
  type FilmFilters,
} from "./letterboxd-utils";
import {
  showFacetDistributions,
  showEntityFacets,
  deriveAvailableNetworks,
  type Show,
  type ShowFacet,
  type ShowFilters,
} from "./serializd-utils";
import type { FacetGroup } from "./slug";
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
import { findEntityBySlug, slugifyEntity } from "./slug";

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

// ── Curated sidebar rails ────────────────────────────────────────
//
// The sidebar chip rails show only values that clear their indexation
// floor; the long tail (count-of-1 languages, countries, …) is reachable
// via the omnibox search instead. We reuse the LOCKED per-facet floors —
// no new thresholds — and apply curation ONLY to the facets Malcolm
// named: language + country (both clusters) and network (TV). Studio /
// network group (conglomerates) have no floor and we don't create one, so
// they render in full (small fixed sets with no long tail); every other
// rail (genre, type, decade, release, budget) is also left untouched.
//
// These live here, not in *EntityFacets, because facet-index owns the
// floors and already depends on the utils (one-way) — applying the floor
// in the utils would invert that into a cycle.

/** Drop a FacetGroup's options below `floor`. */
function floorFacetGroup(group: FacetGroup, floor: number): FacetGroup {
  return { ...group, options: group.options.filter(([, c]) => c >= floor) };
}

/** Film sidebar rails with language + country floored (the rest in full). */
export function curatedFilmEntityFacets(films: Film[]): FacetGroup[] {
  return filmEntityFacets(films).map((g) => {
    if (g.key === "languages")
      return floorFacetGroup(g, FILM_FACET_FLOORS.languages);
    if (g.key === "countries")
      return floorFacetGroup(g, FILM_FACET_FLOORS.countries);
    return g;
  });
}

/** TV sidebar rails with language + country floored (the rest in full). */
export function curatedShowEntityFacets(shows: Show[]): FacetGroup[] {
  return showEntityFacets(shows).map((g) => {
    if (g.key === "languages")
      return floorFacetGroup(g, TV_FACET_FLOORS.languages);
    if (g.key === "countries")
      return floorFacetGroup(g, TV_FACET_FLOORS.countries);
    return g;
  });
}

/** The TV network rail, floored. (deriveAvailableNetworks stays full for
 *  the omnibox — only the rail is curated.) */
export function curatedTvRailNetworks(shows: Show[]): [string, number][] {
  return deriveAvailableNetworks(shows).filter(
    ([, c]) => c >= TV_FACET_FLOORS.networks,
  );
}

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

// ── Single-value facet deep-links (shared: stats tiles + detail page) ──
//
// Both the stats dashboard and the per-film review page emit the same kind of
// link: "click this facet value → the reviews behind it." Those links must use
// ONE slug vocabulary and ONE route-vs-?param= decision, or the two surfaces
// drift — exactly the failure mode (a slug on one side, a display name on the
// other) behind the ?genre= no-op bug. Routing both surfaces through this one
// factory makes that drift unrepresentable.

/**
 * The facet kinds whose single value both the stats tiles and the detail page
 * link. A superset of FilmRouteFacet (the routed facets) plus the param-only
 * facets that have no dedicated route (genre / releaseType / budgetTier /
 * conglomerate).
 */
export type FilmFacetLink =
  | "directors"
  | "actors"
  | "writers"
  | "studios"
  | "languages"
  | "countries"
  | "genres"
  | "releaseTypes"
  | "budgetTiers"
  | "conglomerates";

/**
 * Build a value→href resolver bound to one films corpus. The corpus is read
 * only to compute the per-facet indexable name sets, which are cached on first
 * use so each resolver call is O(1).
 *
 * Routing rules (mirroring the stats page's previous inline builders exactly):
 *  - actor / writer / studio / language / country → the dedicated
 *    `/films/<segment>/<slug>` route IFF the value clears its indexation floor,
 *    else the noindex `/films/reviews?<param>=<slug>` filter (the ?param key is
 *    the same word as the route segment).
 *  - director → the same route-iff-indexable test, but the sub-floor fallback is
 *    the FUZZY `?director=<name>` search: the exact director facet has no slug
 *    param (that ?director= box is a fuzzy name match, deliberately separate).
 *  - genre → always the dedicated `/films/genre/<slug>` route.
 *  - releaseType / budgetTier / conglomerate → always the noindex `?param=`
 *    filter (no dedicated route exists for these dimensions).
 */
export function makeFilmFacetHref(
  films: Film[],
): (facet: FilmFacetLink, value: string) => string | undefined {
  // Indexable name sets are corpus-wide; build each at most once.
  const indexableCache = new Map<FilmRouteFacet, Set<string>>();
  const indexable = (facet: FilmRouteFacet): Set<string> => {
    let set = indexableCache.get(facet);
    if (!set) {
      set = new Set(indexableFilmFacetNames(facet, films));
      indexableCache.set(facet, set);
    }
    return set;
  };

  return (facet, value) => {
    switch (facet) {
      case "genres":
        return `/films/genre/${slugifyGenre(value)}`;
      case "releaseTypes":
        return `/films/reviews?releaseType=${slugifyEntity(value)}`;
      case "budgetTiers":
        return `/films/reviews?budgetTier=${slugifyEntity(value)}`;
      case "conglomerates":
        return `/films/reviews?conglomerate=${slugifyEntity(value)}`;
      case "directors":
        return indexable("directors").has(value)
          ? `/films/director/${slugifyEntity(value)}`
          : `/films/reviews?director=${encodeURIComponent(value)}`;
      default: {
        // actor / writer / studio / language / country — route-iff-indexable.
        const base = FILM_FACET_BASEPATH[facet];
        return indexable(facet).has(value)
          ? `/films/${base}/${slugifyEntity(value)}`
          : `/films/reviews?${base}=${slugifyEntity(value)}`;
      }
    }
  };
}

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

/**
 * Every linkable facet → the query-param key a click on it pins. Unlike
 * FILM_FACET_PARAM (routed facets only, `directors` deliberately undefined),
 * this is total over FilmFacetLink, so the stats deep-link carryover
 * (`withCarriedFilters`) always knows which active param a tile click replaces:
 *  - genre / releaseType / budgetTier / conglomerate — their own ?param key;
 *  - actor / writer / studio / language / country — the route-segment word,
 *    which doubles as the ?param key in the sub-floor fallback;
 *  - director — `director`: a director-tile click goes to the EXACT route, so
 *    any active fuzzy `?director=` search must be dropped rather than carried.
 */
export const FILM_FACET_LINK_PARAM: Record<FilmFacetLink, string> = {
  directors: "director",
  actors: "actor",
  writers: "writer",
  studios: "studio",
  languages: "language",
  countries: "country",
  genres: "genre",
  releaseTypes: "releaseType",
  budgetTiers: "budgetTier",
  conglomerates: "conglomerate",
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

/**
 * The TV facet kinds whose single value both the stats tiles and the show
 * detail page link — the TV sibling of FilmFacetLink. A superset of the routed
 * TV facets plus the param-only ones (genre / conglomerate). Decade is excluded
 * (the detail page already shows the premiere year and offers no decade link),
 * matching the films factory.
 */
export type TvFacetLink =
  | "creators"
  | "actors"
  | "networks"
  | "languages"
  | "countries"
  | "types"
  | "genres"
  | "conglomerates";

/**
 * Build a value→href resolver bound to one shows corpus — the TV sibling of
 * makeFilmFacetHref. Both the /television/stats deep-links and the per-show
 * detail block resolve through this, so the slug + route-vs-?param= decision
 * can't drift between the two surfaces (the discipline that fixed the ?genre=
 * no-op on films). Indexable name sets are cached on first use, so each call
 * is O(1).
 *
 * Routing rules (mirroring the stats page's previous inline builders exactly):
 *  - actor / creator / language / country → the dedicated
 *    `/television/<segment>/<slug>` route IFF the value clears its indexation
 *    floor, else the noindex `/television/reviews?<param>=<slug>` filter; both
 *    sides slug via slugifyEntity (the ?param key is the route-segment word).
 *  - network / type → the same route-iff-indexable test, but the sub-floor
 *    fallback keeps the NAME-based ?network= / ?type= param (encodeURIComponent,
 *    not a slug — parseShowFilters reads these verbatim, unlike the slug facets).
 *  - genre → always the dedicated `/television/genre/<slug>` route.
 *  - conglomerate → always the noindex `?conglomerate=<slug>` filter (no route).
 *
 * Type AVAILABILITY (a type logged only at the episode level produces no
 * show/season cards, so filtering to it lands an empty grid) is the caller's
 * concern, not this route vocabulary: the stats page and the detail block each
 * pre-check against the card-types set before resolving a type link.
 */
export function makeTvFacetHref(
  shows: Show[],
): (facet: TvFacetLink, value: string) => string | undefined {
  const indexableCache = new Map<TvRouteFacet, Set<string>>();
  const indexable = (facet: TvRouteFacet): Set<string> => {
    let set = indexableCache.get(facet);
    if (!set) {
      set = new Set(indexableTvFacetNames(facet, shows));
      indexableCache.set(facet, set);
    }
    return set;
  };

  return (facet, value) => {
    switch (facet) {
      case "genres":
        return `/television/genre/${slugifyGenre(value)}`;
      case "conglomerates":
        return `/television/reviews?conglomerate=${slugifyEntity(value)}`;
      case "networks":
        return indexable("networks").has(value)
          ? `/television/network/${slugifyEntity(value)}`
          : `/television/reviews?network=${encodeURIComponent(value)}`;
      case "types":
        return indexable("types").has(value)
          ? `/television/type/${slugifyEntity(value)}`
          : `/television/reviews?type=${encodeURIComponent(value)}`;
      default: {
        // actor / creator / language / country — route-iff-indexable, slug param.
        const base = TV_FACET_BASEPATH[facet];
        return indexable(facet).has(value)
          ? `/television/${base}/${slugifyEntity(value)}`
          : `/television/reviews?${base}=${slugifyEntity(value)}`;
      }
    }
  };
}

/**
 * Every linkable TV facet → the query-param key a click on it pins (the TV
 * mirror of FILM_FACET_LINK_PARAM, total over TvFacetLink) so the stats
 * deep-link carryover (`withCarriedFilters`) always knows which active param a
 * tile click replaces.
 */
export const TV_FACET_LINK_PARAM: Record<TvFacetLink, string> = {
  creators: "creator",
  actors: "actor",
  networks: "network",
  languages: "language",
  countries: "country",
  types: "type",
  genres: "genre",
  conglomerates: "conglomerate",
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
const filmCache = new WeakMap<
  Film[],
  Map<FilmRouteFacet, [string, number][]>
>();
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

// ── Facet route → filter replay (shared by the facet routes AND the
//    detail-page neighbour resolvers) ─────────────────────────────────
//
// A facet leaf route (e.g. /films/actor/keanu-reeves) scopes its grid by
// force-pinning one FilmFilters/ShowFilters key. The detail-page neighbour
// resolver must replay that EXACT pin to walk the same set, so the pin
// config + the basePath→facet inverse + the slug→entity resolution all live
// here as the single source. (Previously PIN_KEY/PIN were defined privately
// inside each _facet-route.tsx.)

/** Inverse of FILM_FACET_BASEPATH: URL segment → facet key (e.g. "actor"
 *  → "actors"). null for any non-facet segment. */
export function filmFacetForBasePath(basePath: string): FilmRouteFacet | null {
  for (const [facet, bp] of Object.entries(FILM_FACET_BASEPATH)) {
    if (bp === basePath) return facet as FilmRouteFacet;
  }
  return null;
}

/** Inverse of TV_FACET_BASEPATH: URL segment → facet key. */
export function tvFacetForBasePath(basePath: string): TvRouteFacet | null {
  for (const [facet, bp] of Object.entries(TV_FACET_BASEPATH)) {
    if (bp === basePath) return facet as TvRouteFacet;
  }
  return null;
}

/** The FilmFilters key each film facet pins. Film facets all pin BY SLUG
 *  (applyFilters' facetHit compares the slugified value), so the pin value
 *  is always the route slug. */
export const FILM_FACET_PIN_KEY: Record<FilmRouteFacet, keyof FilmFilters> = {
  directors: "directors",
  actors: "actors",
  writers: "writers",
  studios: "studios",
  languages: "languages",
  countries: "countries",
  decades: "decades",
};

/** The ShowFilters key each TV facet pins + whether it pins by canonical
 *  NAME rather than slug. network + type are name-based (the WS3 filters
 *  match canonical names); the rest pin by slug. */
export type TvPinConfig = { pinKey: keyof ShowFilters; nameBased?: boolean };
export const TV_FACET_PIN: Record<TvRouteFacet, TvPinConfig> = {
  creators: { pinKey: "creators" },
  actors: { pinKey: "actors" },
  networks: { pinKey: "networks", nameBased: true },
  languages: { pinKey: "languages" },
  countries: { pinKey: "countries" },
  types: { pinKey: "types", nameBased: true },
  decades: { pinKey: "decades" },
};

/**
 * Resolve a route slug to its canonical entity name + logged count among
 * the floor-clearing (indexable) values only. Unknown / sub-floor → null.
 * (The facet routes call this for copy; the neighbour resolvers call it for
 * the breadcrumb label + the name-based TV pin value.)
 */
export function resolveFilmFacet(
  facet: FilmRouteFacet,
  films: Film[],
  slug: string,
): { name: string; count: number } | null {
  const indexable = indexableFilmFacets(facet, films);
  const name = findEntityBySlug(
    indexable.map(([n]) => n),
    slug,
  );
  if (name === null) return null;
  return { name, count: indexable.find(([n]) => n === name)![1] };
}

/** TV mirror of resolveFilmFacet. */
export function resolveTvFacet(
  facet: TvRouteFacet,
  shows: Show[],
  slug: string,
): { name: string; count: number } | null {
  const indexable = indexableTvFacets(facet, shows);
  const name = findEntityBySlug(
    indexable.map(([n]) => n),
    slug,
  );
  if (name === null) return null;
  return { name, count: indexable.find(([n]) => n === name)![1] };
}

/** Member ordering for a film collection — release year asc, then title.
 *  The collection LEAF page and the neighbour resolver share this so their
 *  prev/next order can't drift. */
export function filmCollectionMemberSort(a: Film, b: Film): number {
  return a.releaseYear - b.releaseYear || a.title.localeCompare(b.title);
}

/** Member ordering for a TV collection — premiere year asc, then name. */
export function tvCollectionMemberSort(a: Show, b: Show): number {
  return a.premiereYear - b.premiereYear || a.name.localeCompare(b.name);
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

/** The routable film collections a given film belongs to — for the "Part of
 *  …" backlink on a film's detail page. Filtered to the SAME indexable gate +
 *  membership the collection leaf uses, so a link appears iff a real
 *  collection page contains this film (no broken links). */
export function filmCollectionsOfFilm(
  films: Film[],
  collectionDetails: Record<number, CollectionDetail>,
  currentYear: number,
  filmId: string,
): FilmCollectionRoute[] {
  return indexableFilmCollections(films, collectionDetails, currentYear).filter(
    (c) => filmsInFilmFamily(films, c.key).some((f) => f.id === filmId),
  );
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

/**
 * The shows a collection LEAF page surfaces — a superset of showsInTvFamily
 * used ONLY by the per-collection page (and the matching detail-page
 * neighbour walk), never by the hub or the counts. For a family that
 * declares a `network` (Bravo), the leaf additionally includes every logged
 * show whose PRIMARY network is that network — so a network-only title like
 * Watch What Happens Live (reviewed at the episode level, absent from the
 * curated map) is discoverable on the Bravo page. Curated members always
 * win, so a cross-network curated pick (Vanderpump Villa, on Hulu) is never
 * dropped. Families without a `network` behave exactly like showsInTvFamily.
 */
export function showsAttributedToTvFamily(shows: Show[], key: string): Show[] {
  const network = TV_FAMILIES[key]?.network;
  return shows.filter((s) => {
    if (familiesOfShow(tvShowTmdbId(s)).includes(key)) return true;
    if (network && primaryNetwork(s.tmdb?.networks ?? []) === network) return true;
    return false;
  });
}

/** The routable TV collections a given show belongs to — for the "Part of
 *  …" backlink on a show's detail page. Uses the same indexable gate +
 *  leaf attribution (curated families PLUS network-backed membership for
 *  Bravo), so a link appears iff a real collection page lists this show. */
export function tvCollectionsOfShow(
  shows: Show[],
  serializdShowId: number,
): TvCollectionRoute[] {
  return indexableTvCollections(shows).filter((c) =>
    showsAttributedToTvFamily(shows, c.key).some(
      (s) => s.serializdShowId === serializdShowId,
    ),
  );
}
