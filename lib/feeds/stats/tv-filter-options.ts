// ─────────────────────────────────────────────────────────────────
// Server-side option builder for the /television/stats filter island
// (STATS-FILTERS §5a) — the TV sibling of film-filter-options.ts. Turns
// the unfiltered show corpus into the bounded tri-state rails and names the
// high-cardinality dimensions the omnibox reaches. Built from the UNFILTERED
// shows so a rail keeps every chip as the selection narrows.
//
// Vocabulary matches the reviews predicate exactly — the same URL params
// (?rating=, ?genre=, ?network=, ?type=, ?decade=, ?watchedYear=) and the
// same encoding parseShowFilters expects: rating as a raw number; genre /
// network / type as their raw display NAMES (parseShowFilters reads these
// verbatim, not slugified); decade as the "2010s" slug. The omnibox dims
// (actor / creator / conglomerate / language / country) carry entity slugs,
// matching /television/reviews/facet-search.
// ─────────────────────────────────────────────────────────────────

import {
  deriveAvailableTypes,
  type Show,
  type TvSummary,
} from "../serializd-utils";
import { curatedTvRailNetworks } from "../facet-index";
import type {
  StatsRail,
  StatsRailValue,
  StatsSummaryDim,
} from "@/components/filters/stats-filter-types";

// The rating histogram's x-axis values, ascending. The rail writes the raw
// number (parseShowFilters reads ?rating= as numbers).
const RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

// The high-cardinality TV dimensions, reached by name through the
// SearchOmnibox (never enumerated as a rail). param + filterKey mirror what
// /television/reviews/facet-search returns for each kind, so an omnibox
// selection writes the same param the reviews shell would. Network is NOT
// here: it's a bounded rail below (and still reachable via the omnibox's
// full network list for the floored-out tail). TV has no writer/studio.
export const TV_SUMMARY_DIMS: StatsSummaryDim[] = [
  { param: "actor", filterKey: "actors", label: "Actor" },
  { param: "creator", filterKey: "creators", label: "Creator" },
  { param: "conglomerate", filterKey: "conglomerates", label: "Network group" },
  { param: "language", filterKey: "languages", label: "Language" },
  { param: "country", filterKey: "countries", label: "Country" },
];

/** Build a name-based rail from a [name, count][] facet list (network /
 *  type): the chip slug IS the raw name, exactly what parseShowFilters reads
 *  for ?network= / ?type=. Returns null when the dimension is empty. */
function nameRail(
  param: string,
  filterKey: string,
  label: string,
  entries: [string, number][],
): StatsRail | null {
  if (entries.length === 0) return null;
  return {
    param,
    filterKey,
    label,
    values: entries.map(([name]): StatsRailValue => ({ slug: name, label: name })),
  };
}

/**
 * The bounded tri-state rails for /television/stats, in display order:
 * rating / genre / network up front, the type + decade long-tail after (the
 * island tucks the tail behind a "More filters" accordion on mobile).
 */
export function buildTvStatsRails(
  shows: Show[],
  summary: TvSummary,
): StatsRail[] {
  const rails: (StatsRail | null)[] = [
    // Rating — bounded 0.5–5★. slug is the raw number.
    {
      param: "rating",
      filterKey: "ratings",
      label: "Rating",
      values: RATING_VALUES.map((r) => ({ slug: String(r), label: `${r}★` })),
    },
    // Genre — slug IS the genre name (reviews writes ?genre=Drama, not a
    // slugified form), sorted alphabetically like the reviews rail.
    {
      param: "genre",
      filterKey: "genres",
      label: "Genre",
      values: Object.keys(summary.genreDistribution)
        .sort((a, b) => a.localeCompare(b))
        .map((g) => ({ slug: g, label: g })),
    },
    // Network — canonical PRIMARY network, floored (curatedTvRailNetworks);
    // name-based slug. The omnibox reaches the floored-out tail.
    nameRail("network", "networks", "Network", curatedTvRailNetworks(shows)),
    // Type — low-cardinality TMDB series type (Scripted / Reality / …).
    nameRail("type", "types", "Type", deriveAvailableTypes(shows)),
    // Decade — premiere-decade slugs ("2010s"), newest first.
    {
      param: "decade",
      filterKey: "decades",
      label: "Decade",
      values: Object.keys(summary.decadeDistribution)
        .sort((a, b) => Number.parseInt(b) - Number.parseInt(a))
        .map((d) => ({ slug: d, label: d })),
    },
    // Watched year — derived from each show's pre-computed watchedYearSet,
    // newest first, so the rail expands as the watch history grows.
    {
      param: "watchedYear",
      filterKey: "watchedYears",
      label: "Watched",
      values: watchedYears(shows).map((y) => ({
        slug: String(y),
        label: String(y),
      })),
    },
  ];

  return rails.filter((r): r is StatsRail => r !== null);
}

/** Distinct watched years across the corpus, newest first. */
function watchedYears(shows: Show[]): number[] {
  const set = new Set<number>();
  for (const s of shows) for (const y of s.watchedYearSet) set.add(y);
  return Array.from(set).sort((a, b) => b - a);
}
