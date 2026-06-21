// ─────────────────────────────────────────────────────────────────
// Server-side option builder for the /films/stats filter island
// (STATS-FILTERS §5a). Turns the unfiltered corpus into the bounded
// tri-state rails and names the high-cardinality dimensions the omnibox
// reaches. Built from the UNFILTERED films so a rail keeps every chip as
// the selection narrows (filtering must never shrink the control surface).
//
// Vocabulary matches the reviews predicate exactly — the same URL params
// (?rating=, ?genre=, ?decade=, …) and the same slug encoding
// (slugifyEntity for entity facets; raw names for genre; raw numbers for
// rating) — so a filter authored here round-trips through parseFilmFilters
// and the per-tile deep-links resolve on reviews (§11).
// ─────────────────────────────────────────────────────────────────

import {
  RUNTIME_BUCKETS,
  filmEntityFacets,
  type Film,
  type FilmsSummary,
} from "../letterboxd-utils";
import { slugifyEntity } from "../slug";
import type {
  StatsRail,
  StatsSummaryDim,
} from "@/components/filters/stats-filter-types";

// The rating histogram's x-axis values, ascending. The rail writes the raw
// number (parseFilmFilters reads ?rating= as numbers).
const RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

// The high-cardinality film dimensions, reached by name through the
// SearchOmnibox (never enumerated as a rail). param + filterKey mirror
// what /films/reviews/facet-search returns for each kind, so an omnibox
// selection writes the same param the reviews shell would.
//
// Not here: `directors` (the reviews omnibox only offers the fuzzy
// ?director= query, which can't carry exclusion — the exact directors
// facet has no endpoint yet) and `collections` (not in the omnibox at
// all). Both are flagged as known gaps until their typeahead lands.
export const FILM_SUMMARY_DIMS: StatsSummaryDim[] = [
  { param: "actor", filterKey: "actors", label: "Actor" },
  { param: "writer", filterKey: "writers", label: "Writer" },
  { param: "studio", filterKey: "studios", label: "Studio" },
  { param: "conglomerate", filterKey: "conglomerates", label: "Studio group" },
  { param: "language", filterKey: "languages", label: "Language" },
  { param: "country", filterKey: "countries", label: "Country" },
];

/** Build a rail from one of filmEntityFacets' bounded groups (decade /
 *  release type / budget tier). The chip value is the entity slug, exactly
 *  as the reviews rail writes it. */
function facetRail(
  facetByKey: Map<string, ReturnType<typeof filmEntityFacets>[number]>,
  key: string,
  label: string,
): StatsRail | null {
  const fg = facetByKey.get(key);
  if (!fg || fg.options.length === 0) return null;
  return {
    param: fg.param,
    filterKey: fg.key,
    label,
    values: fg.options.map(([name]) => ({
      slug: slugifyEntity(name),
      label: name,
    })),
  };
}

/**
 * The bounded tri-state rails for /films/stats, in display order: the
 * primary taste/shape dimensions first, the distribution long-tail after
 * (the island tucks the tail behind a "More filters" accordion on mobile,
 * exactly as the reviews drawer does).
 */
export function buildFilmStatsRails(
  films: Film[],
  summary: FilmsSummary,
): StatsRail[] {
  const facetByKey = new Map(
    filmEntityFacets(films).map((g) => [g.key, g] as const),
  );

  const rails: (StatsRail | null)[] = [
    // Rating — bounded 0.5–5★. slug is the raw number.
    {
      param: "rating",
      filterKey: "ratings",
      label: "Rating",
      values: RATING_VALUES.map((r) => ({ slug: String(r), label: `${r}★` })),
    },
    // Genre — slug IS the genre name (reviews writes ?genre=Horror, not a
    // slugified form), sorted alphabetically like the reviews rail.
    {
      param: "genre",
      filterKey: "genres",
      label: "Genre",
      values: Object.keys(summary.genreDistribution)
        .sort((a, b) => a.localeCompare(b))
        .map((g) => ({ slug: g, label: g })),
    },
    // Length — static runtime buckets (don't grow with the corpus).
    {
      param: "runtime",
      filterKey: "runtimeBuckets",
      label: "Length",
      values: RUNTIME_BUCKETS.map((b) => ({ slug: b.id, label: b.label })),
    },
    // Watched year — derived from each film's pre-computed watchedYearSet,
    // newest first, so the rail expands as the watch history grows.
    {
      param: "watchedYear",
      filterKey: "watchedYears",
      label: "Watched",
      values: watchedYears(films).map((y) => ({
        slug: String(y),
        label: String(y),
      })),
    },
    // Distribution long-tail — entity facets that are genuinely bounded.
    facetRail(facetByKey, "decades", "Decade"),
    facetRail(facetByKey, "releaseTypes", "Release"),
    facetRail(facetByKey, "budgetTiers", "Budget"),
  ];

  return rails.filter((r): r is StatsRail => r !== null);
}

/** Distinct watched years across the corpus, newest first. */
function watchedYears(films: Film[]): number[] {
  const set = new Set<number>();
  for (const f of films) for (const y of f.watchedYearSet) set.add(y);
  return Array.from(set).sort((a, b) => b - a);
}
