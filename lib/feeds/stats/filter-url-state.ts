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
