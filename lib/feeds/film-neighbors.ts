// ─────────────────────────────────────────────────────────────────
// Filter-aware detail-page neighbours for the FILMS cluster.
//
// When a card is clicked out of a listing, the listing threads its own
// URL onto the card as `?from=<encoded-listing>`. The film detail page
// passes that here so the "newer/older" nav walks the SAME filtered +
// sorted set the user was browsing — not the global chronological order
// (which is the fallback when there's no `from`, handled by the caller).
//
// This is the film mirror of the TV detail page's findContextualNeighbors.
// It recognizes every film listing surface:
//   • /films/reviews (+ bare /films) → the corpus grid with the user's
//                                       filters + sort replayed
//   • /films/genre/<slug>            → genre-pinned grid
//   • /films/<facet>/<slug>          → WS6b facet routes (actor, director,
//                                       writer, studio, language, country,
//                                       decade) — pinned by slug
//   • /films/collections/<slug>      → WS7 collection, walked in release
//                                       order (matches the leaf page)
//
// Like TV, the fuzzy ?title=/?director= search is NOT replayed (those
// states are noindex + rare, and the Fuse matcher is server-only); the
// neighbour set uses the non-search filters, which is graceful and
// consistent with the TV behaviour.
//
// Pure + client-safe: operates on an injected corpus (no fs / no
// server-only deps), so it's unit-testable and importable from the
// server detail page. The caller assembles the corpus from
// getFilmsWithEnrichment() + the collections index.
// ─────────────────────────────────────────────────────────────────

import {
  applyFilters,
  findGenreBySlug,
  parseFilmFilters,
  parseFilmSort,
  type Film,
  type FilmFilters,
} from "./letterboxd-utils";
import {
  filmFacetForBasePath,
  filmsInFilmFamily,
  filmCollectionMemberSort,
  resolveFilmFacet,
  FILM_FACET_PIN_KEY,
  type FilmCollectionRoute,
} from "./facet-index";
import { findEntityBySlug } from "./slug";

/** Everything the film neighbour + breadcrumb logic needs, injected so
 *  the module stays pure (the server detail page supplies it). */
export type FilmNeighborCorpus = {
  /** The enriched films array (same one the listing grids filter). */
  films: Film[];
  /** summary.genreDistribution — for resolving a /genre/<slug> pin. */
  genreDistribution: Record<string, number>;
  /** The routable collections (indexableFilmCollections output) — for
   *  resolving a /collections/<slug> to its family key + display name. */
  collections: FilmCollectionRoute[];
};

/** Parse a `from` URL into its pathname + query record, or null if it's
 *  missing / malformed. The `from` value is a relative URL, so resolve
 *  against a stub origin. */
function parseFrom(
  fromParam: string | undefined,
): { pathname: string; sp: Record<string, string | string[] | undefined> } | null {
  if (!fromParam) return null;
  let url: URL;
  try {
    url = new URL(fromParam, "http://internal.local");
  } catch {
    return null;
  }
  return {
    pathname: url.pathname,
    sp: Object.fromEntries(url.searchParams.entries()),
  };
}

/**
 * Replay a listing's `from` URL into the ordered list of film ids the
 * user was browsing. Returns null when the pathname isn't a recognized
 * film listing surface (caller then falls back to chronological).
 */
function orderedFilmIds(
  fromParam: string | undefined,
  corpus: FilmNeighborCorpus,
): string[] | null {
  const parsed = parseFrom(fromParam);
  if (!parsed) return null;
  const { pathname, sp } = parsed;
  const { films } = corpus;

  // Collection leaf: walk the family in release order (matches the leaf
  // page; user filters/sort don't apply on a collection page).
  const collMatch = pathname.match(/^\/films\/collections\/([^/]+)$/);
  if (collMatch) {
    const name = findEntityBySlug(
      corpus.collections.map((c) => c.name),
      collMatch[1],
    );
    const family = name
      ? corpus.collections.find((c) => c.name === name)
      : undefined;
    if (!family) return null;
    return filmsInFilmFamily(films, family.key)
      .sort(filmCollectionMemberSort)
      .map((f) => f.id);
  }

  // Genre route: pin the canonical genre name, then apply user filters.
  const genreMatch = pathname.match(/^\/films\/genre\/([^/]+)$/);
  if (genreMatch) {
    const genre = findGenreBySlug(corpus.genreDistribution, genreMatch[1]);
    if (!genre) return null;
    const filters: FilmFilters = { ...parseFilmFilters(sp), genres: [genre] };
    return applyFilters(films, filters, parseFilmSort(sp)).map((a) => a.film.id);
  }

  // WS6b facet route: /films/<facet>/<slug>. The facet pins by slug
  // (exactly as app/films/_facet-route.tsx does).
  const facetMatch = pathname.match(/^\/films\/([^/]+)\/([^/]+)$/);
  if (facetMatch) {
    const facet = filmFacetForBasePath(facetMatch[1]);
    if (!facet) return null;
    const slug = facetMatch[2];
    const filters: FilmFilters = {
      ...parseFilmFilters(sp),
      [FILM_FACET_PIN_KEY[facet]]: [slug],
    };
    return applyFilters(films, filters, parseFilmSort(sp)).map((a) => a.film.id);
  }

  // The corpus grid — at /films/reviews or the bare /films (kept so any
  // pre-move link carrying ?from=/films still resolves filter-aware).
  if (pathname === "/films/reviews" || pathname === "/films") {
    const filters = parseFilmFilters(sp);
    return applyFilters(films, filters, parseFilmSort(sp)).map((a) => a.film.id);
  }

  return null;
}

/**
 * Filter-aware prev/next for the film detail page. Returns the films
 * immediately newer/older than `filmId` in the replayed listing order,
 * or null when there's no usable `from` (caller falls back to the
 * chronological getFilmNeighbors).
 */
export function findFilmContextualNeighbors(
  filmId: string,
  fromParam: string | undefined,
  corpus: FilmNeighborCorpus,
): { newer: Film | null; older: Film | null } | null {
  const orderedIds = orderedFilmIds(fromParam, corpus);
  if (!orderedIds) return null;
  const idx = orderedIds.indexOf(filmId);
  if (idx === -1) return null;
  const byId = new Map(corpus.films.map((f) => [f.id, f]));
  return {
    newer: idx > 0 ? byId.get(orderedIds[idx - 1]) ?? null : null,
    older:
      idx + 1 < orderedIds.length ? byId.get(orderedIds[idx + 1]) ?? null : null,
  };
}

/**
 * A short editorial breadcrumb describing where the visitor came from,
 * derived from the same `from` URL. Returns null when there's nothing
 * distinctive to surface (e.g. the bare corpus grid with no filters).
 * Examples: "Keanu Reeves", "John Wick", "Drama · 5★", "2025".
 */
export function describeFilmFilterContext(
  fromParam: string | undefined,
  corpus: FilmNeighborCorpus,
): string | null {
  const parsed = parseFrom(fromParam);
  if (!parsed) return null;
  const { pathname, sp } = parsed;

  // Collection / genre / facet routes name themselves.
  const collMatch = pathname.match(/^\/films\/collections\/([^/]+)$/);
  if (collMatch) {
    return findEntityBySlug(
      corpus.collections.map((c) => c.name),
      collMatch[1],
    );
  }

  const labels: string[] = [];
  const genrePathMatch = pathname.match(/^\/films\/genre\/([^/]+)$/);
  if (genrePathMatch) {
    const genre = findGenreBySlug(corpus.genreDistribution, genrePathMatch[1]);
    if (genre) labels.push(genre);
  } else {
    const facetMatch = pathname.match(/^\/films\/([^/]+)\/([^/]+)$/);
    const facet = facetMatch ? filmFacetForBasePath(facetMatch[1]) : null;
    if (facet && facetMatch) {
      const resolved = resolveFilmFacet(facet, corpus.films, facetMatch[2]);
      if (resolved) labels.push(resolved.name);
    } else {
      // Bare reviews grid — surface the meaningful query filters (mirror
      // the TV breadcrumb's set: genre, rating, watched year/window).
      const genre = asStr(sp.genre);
      if (genre) labels.push(genre.split(",").filter(Boolean).join(" · "));
    }
  }

  const rating = asStr(sp.rating);
  if (rating) {
    const ratings = rating.split(",").filter(Boolean);
    labels.push(ratings.length === 1 ? `${ratings[0]}★` : `${ratings.join("/")}★`);
  }
  const watchedYear = asStr(sp.watchedYear);
  if (watchedYear) labels.push(watchedYear.split(",").filter(Boolean).join("/"));
  if (asStr(sp.watchedWindow) === "12mo") labels.push("Past 12mo");

  return labels.length > 0 ? labels.join(" · ") : null;
}

/** First value of a possibly-array search param. */
function asStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
