// Shared shape for a SearchOmnibox suggestion. Lives in its own
// client-safe module (no "server-only", no "use client") so both the
// server search layer (lib/feeds/entity-typeahead.ts) and the client
// combobox (SearchOmnibox.tsx) import the same type without crossing the
// server/client boundary.

export type Suggestion = {
  /** Group label shown as the listbox section heading + the kind tag. */
  kind: string;
  /** Display name. */
  label: string;
  /** Secondary text (e.g. a film's year). */
  sublabel?: string;
  /** Present on Title suggestions — selecting navigates here. */
  href?: string;
  /** Present on facet suggestions — the URL param to write. */
  param?: string;
  /** Present on facet suggestions — the FilmFilters/ShowFilters key the
   *  shell toggles (e.g. "actors"). Absent for the director query param,
   *  which the shell sets as a free-text query rather than a slug array. */
  facetKey?: string;
  /** Present on facet suggestions — slug (slug-based facets) or canonical
   *  name (the film director query). */
  value?: string;
};
