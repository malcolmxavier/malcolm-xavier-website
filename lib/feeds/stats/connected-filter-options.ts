// ─────────────────────────────────────────────────────────────────
// Server-side option builder for the /stats/connected filter island — the
// cross-brand sibling of film-filter-options.ts / tv-filter-options.ts.
// Pools BOTH libraries into the bounded tri-state rails and names the
// high-cardinality dimensions the omnibox reaches.
//
// Connected only offers the dimensions it actually REPORTS on AND that exist
// on both libraries (§5c, mirrored in CONNECTED_FILTER_PARAMS):
//   • Bounded rails  — rating, genre, watched year.
//   • Omnibox (high-card) — actor, language, country, conglomerate.
// Cluster-only dimensions it never surfaces (studios, networks, creators,
// directors, writers, type, decade) are deliberately absent.
//
// Vocabulary matches the predicate parseConnectedFilters expects: rating as a
// raw number, genre as the raw display NAME (both libraries read ?genre= raw),
// watched year as a raw year. The omnibox dims carry entity slugs, matching
// /stats/connected/facet-search.
// ─────────────────────────────────────────────────────────────────

import type { Film } from "../letterboxd-utils";
import type { Show } from "../serializd-utils";
import type {
  StatsRail,
  StatsSummaryDim,
} from "@/components/filters/stats-filter-types";

// The rating histogram's x-axis values, ascending. The rail writes the raw
// number (parseConnectedFilters reads ?rating= as numbers).
const RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

// The high-cardinality connected dimensions, reached by name through the
// SearchOmnibox (never enumerated as a rail). param + filterKey mirror what
// /stats/connected/facet-search returns for each kind, so an omnibox selection
// writes the same param the parser reads. "Conglomerate" is the neutral
// cross-brand label (films call it "Studio group", TV "Network group").
export const CONNECTED_SUMMARY_DIMS: StatsSummaryDim[] = [
  { param: "actor", filterKey: "actors", label: "Actor" },
  { param: "conglomerate", filterKey: "conglomerates", label: "Conglomerate" },
  { param: "language", filterKey: "languages", label: "Language" },
  { param: "country", filterKey: "countries", label: "Country" },
];

/** Distinct genres across BOTH libraries, alphabetical (matches the cluster
 *  rails' order). Genre is name-based on connected: the dumbbell compares the
 *  SAME genre string on each side, and both parsers read ?genre= verbatim. */
function pooledGenres(films: Film[], shows: Show[]): string[] {
  const set = new Set<string>();
  for (const f of films) for (const g of f.tmdb?.genres ?? []) set.add(g);
  for (const s of shows) for (const g of s.tmdb?.genres ?? []) set.add(g);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Distinct watched years across BOTH libraries, newest first, so the rail
 *  expands as either watch history grows. */
function pooledWatchedYears(films: Film[], shows: Show[]): number[] {
  const set = new Set<number>();
  for (const f of films) for (const y of f.watchedYearSet) set.add(y);
  for (const s of shows) for (const y of s.watchedYearSet) set.add(y);
  return Array.from(set).sort((a, b) => b - a);
}

/**
 * The bounded tri-state rails for /stats/connected, in display order: rating
 * and genre up front, watched year after. Built from the UNFILTERED pooled
 * corpus so a rail keeps every chip as the selection narrows.
 */
export function buildConnectedStatsRails(
  films: Film[],
  shows: Show[],
): StatsRail[] {
  return [
    // Rating — bounded 0.5–5★. slug is the raw number.
    {
      param: "rating",
      filterKey: "ratings",
      label: "Rating",
      values: RATING_VALUES.map((r) => ({ slug: String(r), label: `${r}★` })),
    },
    // Genre — slug IS the genre name (?genre=Drama, not a slugified form).
    {
      param: "genre",
      filterKey: "genres",
      label: "Genre",
      values: pooledGenres(films, shows).map((g) => ({ slug: g, label: g })),
    },
    // Watched year — pooled across both libraries, newest first.
    {
      param: "watchedYear",
      filterKey: "watchedYears",
      label: "Watched",
      values: pooledWatchedYears(films, shows).map((y) => ({
        slug: String(y),
        label: String(y),
      })),
    },
  ];
}
