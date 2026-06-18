// ─────────────────────────────────────────────────────────────────
// entity-typeahead — server-only search backing the reviews-page
// SearchOmnibox. Given a typed query, returns grouped suggestions:
//   • Titles  → a known-item jump to that review's detail page
//   • People / studios / creators → a facet filter to apply to the grid
//
// The high-cardinality facet lists (actors, writers, studios, creators)
// would be ~160 KB to ship to the client, so the omnibox fetches matches
// from a Route Handler that calls in here instead. The complete ranked
// [name, count][] per facet already exists via filmFacetDistributions /
// showFacetDistributions (the high-card keys are just omitted from the
// sidebar rails), so this adds matching + shaping, not new ranking.
//
// `server-only` keeps the corpus + this module off the client bundle,
// mirroring fuzzy-search.ts's posture.
// ─────────────────────────────────────────────────────────────────

import "server-only";
import {
  getFilmsWithEnrichment,
  getShowsWithEnrichment,
} from "./review-corpus";
import { filmFacetDistributions } from "./letterboxd-utils";
import {
  showFacetDistributions,
  deriveAvailableNetworks,
} from "./serializd-utils";
import { slugifyEntity } from "./slug";
import type { Suggestion } from "@/components/filters/omnibox-types";

export type { Suggestion };

/** Minimum query length before we search (matches the title-search floor). */
const MIN_QUERY_LENGTH = 2;
/** Max suggestions per group (titles, each facet kind). */
const PER_GROUP = 6;

/** Lowercase + strip diacritics so "peñélope" matches "penelope". */
export function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Match a facet's [name, count][] options against the query: substring
 * hits only, ranked prefix-first then by count (the relevance order a
 * typeahead wants — NOT the rail's alphabetical order). Capped to limit.
 */
export function matchEntities(
  options: [string, number][],
  needle: string,
  limit: number,
): [string, number][] {
  const hits = options.filter(([name]) => norm(name).includes(needle));
  hits.sort((a, b) => {
    const ap = norm(a[0]).startsWith(needle) ? 0 : 1;
    const bp = norm(b[0]).startsWith(needle) ? 0 : 1;
    return ap - bp || b[1] - a[1] || a[0].localeCompare(b[0]);
  });
  return hits.slice(0, limit);
}

// Film facet kinds the omnibox searches. Director is the one query-based
// entry (param `director`, value = the canonical name fed into the fuzzy
// directorQuery filter); the rest are slug-based facets. Studio group,
// language, and country are low-card rails too, but searching them here
// reaches the long tail the curated rails drop.
const FILM_FACET_SEARCH: {
  kind: string;
  distKey:
    | "directors"
    | "actors"
    | "writers"
    | "studios"
    | "conglomerates"
    | "languages"
    | "countries";
  param: string;
  facetKey?: string;
  valueIsName?: boolean;
}[] = [
  {
    kind: "Director",
    distKey: "directors",
    param: "director",
    valueIsName: true,
  },
  { kind: "Actor", distKey: "actors", param: "actor", facetKey: "actors" },
  { kind: "Writer", distKey: "writers", param: "writer", facetKey: "writers" },
  { kind: "Studio", distKey: "studios", param: "studio", facetKey: "studios" },
  {
    kind: "Studio group",
    distKey: "conglomerates",
    param: "conglomerate",
    facetKey: "conglomerates",
  },
  {
    kind: "Language",
    distKey: "languages",
    param: "language",
    facetKey: "languages",
  },
  {
    kind: "Country",
    distKey: "countries",
    param: "country",
    facetKey: "countries",
  },
];

export function searchFilmSuggestions(query: string): Suggestion[] {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];
  const needle = norm(q);
  const { films } = getFilmsWithEnrichment();

  // Titles → detail-page jumps. Prefix matches first, then alphabetical.
  const titles: Suggestion[] = films
    .filter((f) => norm(f.title).includes(needle))
    .sort(
      (a, b) =>
        (norm(a.title).startsWith(needle) ? 0 : 1) -
          (norm(b.title).startsWith(needle) ? 0 : 1) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, PER_GROUP)
    .map((f) => ({
      kind: "Title",
      label: f.title,
      sublabel: String(f.releaseYear),
      href: `/films/${f.letterboxdSlug}-${f.releaseYear}`,
    }));

  const d = filmFacetDistributions(films);
  // matchEntities still ranks by count internally; we just don't surface
  // the number — a static lifetime count is misleading scent next to a
  // suggestion (same reason it was dropped from the chips).
  const facets: Suggestion[] = FILM_FACET_SEARCH.flatMap((c) =>
    matchEntities(d[c.distKey], needle, PER_GROUP).map(([name]) => ({
      kind: c.kind,
      label: name,
      param: c.param,
      facetKey: c.facetKey,
      value: c.valueIsName ? name : slugifyEntity(name),
    })),
  );

  return [...titles, ...facets];
}

const SHOW_FACET_SEARCH: {
  kind: string;
  distKey: "actors" | "creators" | "conglomerates" | "languages" | "countries";
  param: string;
  facetKey: string;
}[] = [
  { kind: "Actor", distKey: "actors", param: "actor", facetKey: "actors" },
  {
    kind: "Creator",
    distKey: "creators",
    param: "creator",
    facetKey: "creators",
  },
  {
    kind: "Network group",
    distKey: "conglomerates",
    param: "conglomerate",
    facetKey: "conglomerates",
  },
  {
    kind: "Language",
    distKey: "languages",
    param: "language",
    facetKey: "languages",
  },
  {
    kind: "Country",
    distKey: "countries",
    param: "country",
    facetKey: "countries",
  },
];

export function searchShowSuggestions(query: string): Suggestion[] {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];
  const needle = norm(q);
  const { shows } = getShowsWithEnrichment();

  const titles: Suggestion[] = shows
    .filter((s) => norm(s.name).includes(needle))
    .sort(
      (a, b) =>
        (norm(a.name).startsWith(needle) ? 0 : 1) -
          (norm(b.name).startsWith(needle) ? 0 : 1) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, PER_GROUP)
    .map((s) => ({
      kind: "Title",
      label: s.name,
      sublabel: String(s.premiereYear),
      href: `/television/${s.slug}`,
    }));

  const d = showFacetDistributions(shows);
  const facetGroup = (
    kinds: (typeof SHOW_FACET_SEARCH)[number]["kind"][],
  ): Suggestion[] =>
    SHOW_FACET_SEARCH.filter((c) => kinds.includes(c.kind)).flatMap((c) =>
      matchEntities(d[c.distKey], needle, PER_GROUP).map(([name]) => ({
        kind: c.kind,
        label: name,
        param: c.param,
        facetKey: c.facetKey,
        value: slugifyEntity(name),
      })),
    );

  // Network is name-based (filters.networks holds canonical names, not
  // slugs) and lives outside showFacetDistributions (it's the canon
  // primary-network derivation), so it's matched separately. Search uses
  // the FULL list — the rail is what gets floored, not search.
  const networks: Suggestion[] = matchEntities(
    deriveAvailableNetworks(shows),
    needle,
    PER_GROUP,
  ).map(([name]) => ({
    kind: "Network",
    label: name,
    param: "network",
    facetKey: "networks",
    value: name,
  }));

  // Group order: people, then distributor/owner, then provenance.
  return [
    ...titles,
    ...facetGroup(["Actor", "Creator"]),
    ...networks,
    ...facetGroup(["Network group"]),
    ...facetGroup(["Language", "Country"]),
  ];
}
