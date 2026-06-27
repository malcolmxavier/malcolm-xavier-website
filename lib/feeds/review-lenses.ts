// ─────────────────────────────────────────────────────────────────
// review-lenses — curated one-tap "views" for the reviews pages. A lens
// is just a named bundle of filter/sort URL params; tapping it applies
// that bundle (replacing the current filter state), so it reads as
// "start here" editorial browsing rather than operating the filter form.
//
// Client-safe (no server imports): the shell builds the list with the
// current year injected and renders the strip.
//
// SEED SET (data-backed via existing filter params): Highest rated,
// Five-star, Best of {year}. Malcolm curates the final labels/set.
//
// WANTED BUT BLOCKED ON A SIGNAL (do not ship until the filter exists):
//   • "Comfort rewatches" — needs a ?rewatch= filter. The data exists
//     (Review.rewatch / Review.isRewatch) but parseFilmFilters /
//     parseShowFilters don't expose a rewatch param yet.
//   • "Beloved-but-underseen" — needs a log-frequency / popularity
//     signal to contrast against rating; no such filter dimension today.
// Add these as lenses once the underlying filter lands.
// ─────────────────────────────────────────────────────────────────

export type ReviewLens = {
  /** Stable id used for active-state detection. */
  id: string;
  /** Visible chip label (Malcolm's voice — placeholders for now). */
  label: string;
  /** Short description; surfaced as the chip's title/aria hint. */
  description: string;
  /** The filter/sort URL params this lens applies (exactly — applying a
   *  lens replaces the current filter state). */
  params: Record<string, string>;
};

/**
 * The lens set for a cluster. `cluster` is accepted for future
 * divergence; today both clusters share the same data-backed lenses
 * (the params are valid filter params in either shell). `currentYear`
 * is injected so "Best of {year}" tracks the calendar.
 */
export function reviewLenses(
  cluster: "films" | "television",
  currentYear: number,
): ReviewLens[] {
  void cluster;
  return [
    {
      id: "highest-rated",
      label: "Highest rated",
      description: "Everything, sorted by my rating — top down.",
      params: { sort: "rating-desc" },
    },
    {
      id: "five-star",
      label: "Five-star",
      description: "Only the perfect scores.",
      params: { rating: "5" },
    },
    {
      id: "best-of-year",
      label: `Best of ${currentYear}`,
      description: `The best of what I've watched in ${currentYear}.`,
      params: { watchedYear: String(currentYear), sort: "rating-desc" },
    },
  ];
}
