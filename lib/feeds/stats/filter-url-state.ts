// ─────────────────────────────────────────────────────────────────
// Pure URL-mutation helpers for the stats filter island
// (STATS-FILTERS §7, build step 5). The dashboards are server-rendered
// and URL-driven (§9): the client island never holds filter state of its
// own — it reads the current state out of one dimension's query param and
// produces the NEXT param value, which the caller writes back into the
// URL to trigger a server round-trip.
//
// Everything here operates on a single dimension's raw param string (e.g.
// the value of `?genre=`), so it composes with any param key. It builds on
// filter-url.ts (parse/serialize the leading-"!" encoding) and tri-state.ts
// (the Style-A cycle order) — single sources of truth, reused not forked.
// ─────────────────────────────────────────────────────────────────

import { parseDimension, serializeDimension } from "./filter-url";
import { nextTriState, type TriState } from "./tri-state";

// The tri-state of one value within a dimension's current param string.
export function dimensionState(
  raw: string | undefined | null,
  slug: string,
): TriState {
  const { include, exclude } = parseDimension(raw);
  if (include.includes(slug)) return "include";
  if (exclude.includes(slug)) return "exclude";
  return "neutral";
}

// Force one value to a specific state, returning the new param string.
// Used by the summary chips (Style B): the body-toggle calls this with the
// flipped state, the × calls it with "neutral" (removal). "neutral" drops
// the value from both buckets entirely.
export function setDimensionValue(
  raw: string | undefined | null,
  slug: string,
  state: TriState,
): string {
  const { include, exclude } = parseDimension(raw);
  // Remove the value from wherever it currently sits, then re-add per state.
  const nextInclude = include.filter((s) => s !== slug);
  const nextExclude = exclude.filter((s) => s !== slug);
  if (state === "include") nextInclude.push(slug);
  if (state === "exclude") nextExclude.push(slug);
  return serializeDimension(nextInclude, nextExclude);
}

// Advance one value to its next tri-state (Style A cycle:
// neutral → include → exclude → neutral), returning the new param string.
// Used by the bounded rail chips.
export function cycleDimensionValue(
  raw: string | undefined | null,
  slug: string,
): string {
  const current = dimensionState(raw, slug);
  return setDimensionValue(raw, slug, nextTriState(current));
}

// ─────────────────────────────────────────────────────────────────
// Stats-tile deep-link filter carryover
//
// A stats dashboard is URL-driven: every active filter lives in the query
// string. When a tile deep-links into the reviews funnel, the reader expects
// the WHOLE active filter set to come along — clicking a studio tile while the
// page is filtered by rating + decade + language should land on that studio
// scoped by all three, not on a fresh single-facet view. Each tile builder used
// to emit a clean single-facet URL with no awareness of the page's filters, so
// the rest of the selection was silently dropped. This helper merges the page's
// active params onto a tile's href.
// ─────────────────────────────────────────────────────────────────

/**
 * Compose a tile deep-link with the page's active filters.
 *
 * @param href    the tile's own destination — either a canonical facet route
 *                (`/films/studio/a24`, where the facet is pinned in the PATH) or
 *                a `?param=` reviews URL (where it's pinned in the query).
 * @param active  the page's current query string (built from `searchParams`).
 * @param pinned  param key(s) this click sets via the PATH and so must NOT be
 *                carried (otherwise a canonical route would be double-filtered,
 *                or a fuzzy `?director=` query would ride onto an exact route).
 *                The href's OWN query keys are always dropped automatically, so
 *                `?param=` builders need no explicit pin.
 *
 * Carried params come first; the tile's own params win on any conflict. Pure —
 * never mutates `active`.
 */
export function withCarriedFilters(
  href: string,
  active: URLSearchParams,
  pinned: readonly string[] = [],
): string {
  const [path, ownQuery = ""] = href.split("?");
  const own = new URLSearchParams(ownQuery);
  // Keys the destination already pins (via path or its own query) are dropped
  // from the carried set so the click's value is the one that takes effect.
  const drop = new Set<string>([...pinned, ...own.keys()]);

  const out = new URLSearchParams();
  for (const [key, value] of active) {
    if (drop.has(key)) continue;
    out.append(key, value);
  }
  for (const [key, value] of own) out.append(key, value);

  const query = out.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * True when a parsed filter object holds at least one field that would
 * actually narrow the corpus. Generic across FilmFilters, ShowFilters, and
 * ConnectedFilters — they share this exact "sparse object of optional
 * dimensions" shape, so a single predicate serves every stats surface and a
 * newly added filter field can't silently update one hand-rolled copy while
 * missing another. An empty `{}` (every dimension cleared) is treated as "no
 * filter", so an empty selection renders identically to the unfiltered page.
 */
export function hasActiveFilter(f: Record<string, unknown>): boolean {
  return Object.values(f).some((v) => {
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.length > 0;
    // Numeric bounds (releaseYearMin / releaseYearMax) and the watchedWindow
    // enum are always meaningful once set.
    return true;
  });
}
