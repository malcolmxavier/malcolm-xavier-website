// ─────────────────────────────────────────────────────────────────
// Serializd per-review editorial overrides — single parser.
//
// data/television/overrides.json carries three maps keyed by
// Serializd REVIEW id (not show id, unlike every other map in that
// file), each `"<reviewId>": true`:
//
//   • gridWithoutProse — a prose-less Show/Season review that still
//     earns a card on the /television grid.
//   • undatedReviews   — a rated review whose watchedDate is a
//     placeholder; kept out of every date-based computation.
//   • notASeason       — a Season-level review that doesn't count as
//     a season (e.g. one episode Serializd filed as Specials).
//
// Plain .mjs (same posture as serializd-mode-counts.mjs) so the
// snapshot writer and the request-time reader parse the file through
// one function. Two consumers, two shapes:
//
//   • The bootstrap reads the Sets directly when it aggregates the
//     summary and the per-show watchedYearSet, so the next refresh
//     persists numbers that already honour the overrides.
//   • lib/feeds/serializd.ts stamps them onto each Review at load
//     (`review.overrides`), so every pure helper downstream — card
//     builder, filters, stats — reads the override off the review it
//     is already holding, and the committed fixture never has to be
//     regenerated for an override edit to take effect. The stamp is
//     in-memory only; the fixture never carries it, so removing an
//     id from overrides.json can't leave a stale flag behind.
// ─────────────────────────────────────────────────────────────────

/** The three per-review override maps, in overrides.json key form. */
export const REVIEW_OVERRIDE_KEYS = /** @type {const} */ ([
  "gridWithoutProse",
  "undatedReviews",
  "notASeason",
]);

/**
 * Parse the per-review maps out of a raw overrides object into Sets
 * of numeric review ids. Fail-soft: a missing map, a `_comment` key,
 * a non-`true` value, or a non-numeric key is skipped rather than
 * thrown, so a typo in overrides.json never blanks a page or aborts
 * a refresh.
 *
 * @param {unknown} raw  parsed overrides.json (or any subset of it)
 * @returns {{ gridWithoutProse: Set<number>, undatedReviews: Set<number>, notASeason: Set<number> }}
 */
export function parseReviewOverrides(raw) {
  const source =
    typeof raw === "object" && raw !== null
      ? /** @type {Record<string, unknown>} */ (raw)
      : {};
  /** @param {unknown} map */
  const idsOf = (map) => {
    const ids = new Set();
    if (typeof map !== "object" || map === null) return ids;
    for (const [key, value] of Object.entries(map)) {
      if (key.startsWith("_")) continue;
      if (value !== true) continue;
      const id = Number.parseInt(key, 10);
      if (Number.isFinite(id)) ids.add(id);
    }
    return ids;
  };
  return {
    gridWithoutProse: idsOf(source.gridWithoutProse),
    undatedReviews: idsOf(source.undatedReviews),
    notASeason: idsOf(source.notASeason),
  };
}

/**
 * Stamp the parsed overrides onto every review they name, in place.
 * Clears any existing stamp first so the result reflects `parsed`
 * and nothing else. Reviews no override names carry no `overrides`
 * field at all.
 *
 * @param {Array<{ reviews: Array<{ id: number, overrides?: Record<string, true> }> }>} shows
 * @param {ReturnType<typeof parseReviewOverrides>} parsed
 */
export function stampReviewOverrides(shows, parsed) {
  for (const show of shows) {
    for (const review of show.reviews) {
      delete review.overrides;
      for (const key of REVIEW_OVERRIDE_KEYS) {
        if (!parsed[key].has(review.id)) continue;
        review.overrides = { ...review.overrides, [key]: true };
      }
    }
  }
}
