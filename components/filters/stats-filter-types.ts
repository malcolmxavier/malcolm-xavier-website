// ─────────────────────────────────────────────────────────────────
// Shared prop shapes for the stats filter controls (STATS-FILTERS §3/§4).
// Client-safe (no "server-only", no "use client") so the server-side
// option builders (lib/feeds/stats/*-filter-options.ts) and the client
// island (StatsFilterControls.tsx) import the SAME types without crossing
// the server/client boundary — the same split omnibox-types.ts uses.
// ─────────────────────────────────────────────────────────────────

/** One selectable value on a bounded rail. `slug` is the stable URL token
 *  (a genre name, a rating number, an entity slug); `label` is the chip
 *  text (already human-cased upstream). */
export type StatsRailValue = { slug: string; label: string };

/** A bounded dimension rendered as a tri-state chip rail. The full value
 *  set is built from the UNFILTERED corpus so the rail keeps all its chips
 *  as the selection narrows. */
export type StatsRail = {
  /** URL param this rail writes, e.g. "genre". */
  param: string;
  /** The FilmFilters/ShowFilters key (used only for the readback). */
  filterKey: string;
  /** Rail heading, e.g. "Genre". */
  label: string;
  /** Every selectable value, in display order. */
  values: StatsRailValue[];
};

/** A high-cardinality dimension reached through the omnibox (no rail). Its
 *  selected values live as summary chips; this descriptor lets the island
 *  map an omnibox suggestion's param back to a dimension and render its
 *  active chips. */
export type StatsSummaryDim = {
  /** URL param, e.g. "actor". */
  param: string;
  /** The FilmFilters/ShowFilters key (used only for the readback). */
  filterKey: string;
  /** Human label for the readback / aria, e.g. "Actor". */
  label: string;
};
