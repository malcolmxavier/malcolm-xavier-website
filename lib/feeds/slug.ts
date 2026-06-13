// ─────────────────────────────────────────────────────────────────
// Entity slug helpers — the ONE vocabulary shared across WS6.
//
// A stats-tile row, the filter param it deep-links to, and (in 6b) the
// dedicated `[slug]` route must all agree on how an entity name becomes
// a URL token. `slugifyGenre` (letterboxd-utils) and `slugifyShow`
// (serializd-utils) are pre-existing one-offs; this is the generic the
// new entity facets (actors, writers, studios, networks, languages,
// countries, conglomerates, decades, …) standardize on.
//
// Pure, client-safe (no fs / no server-only deps).
// ─────────────────────────────────────────────────────────────────

/**
 * Slugify any entity display name: strip diacritics (so "Penélope Cruz"
 * → "penelope-cruz", not "pen-lope-cruz"), drop apostrophes, lowercase,
 * collapse every other run of non-alphanumerics to a single hyphen, and
 * trim leading/trailing hyphens. Matches the permissive `slugifyShow`
 * shape so person/studio names slug cleanly.
 */
export function slugifyEntity(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // strip combining marks (accents)
    .toLowerCase()
    .replace(/[‘’‛'`]/g, "") // drop apostrophe variants (don't hyphenate)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reverse a slug back to its canonical display name by walking the
 * candidate names and re-slugifying each — the genre-route pattern
 * (`findGenreBySlug`), generalized. O(n) per call; n is a facet's
 * distinct-value count (tens to a few hundred), called once per route
 * render. Returns the first match, or null when no candidate slugs to
 * the given slug (an unknown/tampered slug — caller decides 404 vs
 * empty). First-match-wins on the rare slug collision, same as genre.
 */
export function findEntityBySlug(names: string[], slug: string): string | null {
  for (const name of names) {
    if (slugifyEntity(name) === slug) return name;
  }
  return null;
}

/**
 * Wave B facet match: true if any canonical candidate name slugifies into
 * the selected slug set. The shared vocabulary means a selected slug
 * (from a URL param or a stats-tile deep-link) and a title's canonicalized
 * value compare on identical tokens. Used by both reviews filter pipelines.
 */
export function facetHit(selectedSlugs: string[], candidateNames: string[]): boolean {
  return candidateNames.some((n) => selectedSlugs.includes(slugifyEntity(n)));
}

/**
 * A low-cardinality facet group for the reviews sidebar: a labelled chip
 * rail. `options` is the full [displayName, count] list, sorted count
 * desc; each chip's value is `slugifyEntity(displayName)`, and `key` is
 * the FilmFilters/ShowFilters array the param writes to. Built by the
 * reviews pages, consumed by the shells (and, in 6c, the typeahead).
 */
export type FacetGroup = {
  key: string;
  param: string;
  label: string;
  options: [string, number][];
};
