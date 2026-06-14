// ─────────────────────────────────────────────────────────────────
// buildOriginHref — the ONE helper for "where did this card come from."
//
// A listing surface (reviews grid, genre/facet route, collection leaf)
// reconstructs its own relative URL — pathname + active filter query —
// and threads it onto each card link as `?from=<encoded>`. The detail
// page replays that URL to compute filter-aware, multi-hop neighbours
// (see lib/feeds/film-neighbors.ts and the TV detail page's
// findContextualNeighbors) and to label the "you came from …"
// breadcrumb.
//
// Extracted from three verbatim copies that lived in the TV genre
// route, the TV facet route, and the TV reviews page; now shared so
// both clusters build the origin URL identically.
//
// Pure, client-safe (no fs / no server-only deps).
// ─────────────────────────────────────────────────────────────────

/**
 * Reconstruct the relative URL (pathname + query) of a listing surface.
 *
 * Drops the back-nav markers `ref` and `from` so the origin URL never
 * nests a previous origin inside itself. For repeated keys Next gives an
 * array; we keep the first value — the filter vocabularies that arrive
 * as arrays (a key repeated in the URL) only ever pin one value per
 * listing, and the CSV multi-select filters (`?genre=Drama,Comedy`) ride
 * in a single string param, so they're preserved whole.
 */
export function buildOriginHref(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "ref" || k === "from") continue;
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      if (v[0] !== undefined) sp.set(k, v[0]);
    } else {
      sp.set(k, v);
    }
  }
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
