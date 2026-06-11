// ─────────────────────────────────────────────────────────────────
// Film studio canonicalization + conglomerate rollup.
//
// Sibling to network-canon.ts (TV). Ported verbatim from the stats
// sketch (build-stats-sketch.mjs lines 665–689) so the film studio /
// conglomerate dashboards agree with one studio vocabulary, the same
// way the network canon does for TV.
//
// Also home to STUDIO_INDEX_ALLOWLIST — the curated membership gate
// for which film studios earn a dedicated indexed /films/studio/[slug]
// route (consumed by WS6). It lives here because it's studio config
// and shares the canonical names the rollup produces. Frozen in PLAN.md
// (2026-06-10): the one facet type where a pure count floor fails, so
// studio indexes iff `studio ∈ allowlist AND count ≥ 5`.
//
// Pure data + pure functions, zero deps — safe anywhere.
// ─────────────────────────────────────────────────────────────────

/**
 * Studio-name variant → canonical studio. Collapses TMDB's many
 * production-company spellings (and the Fox→20th-Century rename) into
 * one label. Anything not listed passes through via canonStudio().
 */
export const STUDIO_ALIAS: Record<string, string> = {
  "20th Century Fox": "20th Century Studios",
  "Twentieth Century-Fox Productions": "20th Century Studios",
  "Fox 2000 Pictures": "20th Century Studios",
  "20th Century Animation": "20th Century Studios",
  "Fox Searchlight Pictures": "Searchlight Pictures",
  "Walt Disney Productions": "Walt Disney Pictures",
};

/** Canonicalize a single raw studio name. Unknown names pass through. */
export function canonStudio(studio: string): string {
  return STUDIO_ALIAS[studio] || studio;
}

/**
 * Canonical studio → parent conglomerate. Unmapped studios (A24,
 * Neon, Blumhouse, Plan B, etc.) fall to "Independent / other" via
 * conglomerateOfStudio().
 */
export const STUDIO_PARENT: Record<string, string> = {
  "20th Century Studios": "Disney",
  "Searchlight Pictures": "Disney",
  "Walt Disney Pictures": "Disney",
  "Walt Disney Animation Studios": "Disney",
  "Marvel Studios": "Disney",
  "Lucasfilm Ltd.": "Disney",
  Lucasfilm: "Disney",
  Pixar: "Disney",
  "Warner Bros. Pictures": "Warner Bros. Discovery",
  "New Line Cinema": "Warner Bros. Discovery",
  "Castle Rock Entertainment": "Warner Bros. Discovery",
  "HBO Films": "Warner Bros. Discovery",
  "DC Studios": "Warner Bros. Discovery",
  "Universal Pictures": "NBCUniversal",
  "Focus Features": "NBCUniversal",
  "DreamWorks Animation": "NBCUniversal",
  Illumination: "NBCUniversal",
  "Working Title Films": "NBCUniversal",
  Paramount: "Paramount",
  "Paramount Pictures": "Paramount",
  "Paramount Animation": "Paramount",
  "Nickelodeon Movies": "Paramount",
  "Columbia Pictures": "Sony",
  "Sony Pictures": "Sony",
  "TriStar Pictures": "Sony",
  "Screen Gems": "Sony",
  "Amazon MGM Studios": "Amazon MGM",
  "Metro-Goldwyn-Mayer": "Amazon MGM",
  "United Artists": "Amazon MGM",
  "Orion Pictures": "Amazon MGM",
  "Apple Studios": "Apple",
  "Apple Original Films": "Apple",
  Lionsgate: "Lionsgate",
  "Summit Entertainment": "Lionsgate",
};

/**
 * Roll a film up to the conglomerate that owns one of its studios.
 * Iterates the studio list, canonicalizing each, and returns the first
 * mapped parent — short-circuit so the primary studio wins. Returns
 * "Independent / other" when nothing maps.
 */
export function conglomerateOfStudio(studios: string[]): string {
  for (const s of studios) {
    const parent = STUDIO_PARENT[canonStudio(s)];
    if (parent) return parent;
  }
  return "Independent / other";
}

/**
 * Curated allowlist of studios that earn a dedicated indexed route
 * (the membership half of the studio indexation gate; the substance
 * half is count ≥ 5). Canonical names — match against canonStudio()
 * output. 38 labels, frozen 2026-06-10 (PLAN.md). Manually maintained
 * and effectively static; TMDB lists production companies, not
 * searcher-facing studios, so a count floor alone can't separate
 * labels from co-financiers — hence the allowlist.
 */
export const STUDIO_INDEX_ALLOWLIST: ReadonlySet<string> = new Set([
  "A24",
  "Universal",
  "Paramount",
  "Warner Bros.",
  "Columbia",
  "20th Century Studios",
  "Searchlight",
  "Focus Features",
  "Lionsgate",
  "Amazon MGM",
  "Apple Studios",
  "Lucasfilm",
  "New Line",
  "TriStar",
  "Orion",
  "Summit",
  "Miramax",
  "StudioCanal",
  "Toho",
  "Legendary",
  "Amblin",
  "Neon",
  "Blumhouse",
  "Annapurna",
  "Plan B",
  "Skydance",
  "Film4",
  "BBC Films",
  "Working Title",
  "Black Bear",
  "Regency",
  "TSG Entertainment",
  "FilmNation",
  "Scott Free",
  "Thunder Road",
  "Vertigo",
  "Indian Paintbrush",
  "Screen Ireland",
]);
