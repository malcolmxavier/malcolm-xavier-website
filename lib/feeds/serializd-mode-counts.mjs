// ─────────────────────────────────────────────────────────────────
// Serializd per-mode counting rule — single source of truth.
//
// The /television SummaryPanel exposes counts in three modes —
// "Shows", "Seasons", "Episodes". A miniseries occupies a single
// season but is editorially equivalent to a complete show, so
// reviewing it at either level expresses the same act of completion.
// To keep the panel honest across modes, miniseries reviews are
// double-counted: a Show review on a miniseries-pinned show is also
// counted as a Season review, and vice versa.
//
// Rule (locked 2026-05-07):
//   • Episode review            → counts in [episode]
//   • Show review (any show)    → counts in [show]
//   • Show review on miniseries → counts in [show, season]
//   • Season review (any show)  → counts in [season]
//   • Season review on miniseries → counts in [show, season]
//
// This rule applies to every per-mode count surface — lifetime
// totals (aggregateSummary in bootstrap), in-year totals
// (currentYearByLevel in page.tsx), and any future window (in-month,
// in-quarter, etc.). Card placement on the listing is a separate
// concern and stays review-driven (a Season review still renders as
// a Season card even on a miniseries-flagged show).
//
// Editorial precedent: this is a load-bearing decision for how the
// panel arithmetic reads. Any new surface that counts reviews by
// level MUST call modesForReview rather than incrementing
// buckets[r.level] directly — otherwise lifetime + in-year totals
// drift the way they did before this helper landed (lifetime Shows
// = 36 with double-count, in-year Shows = 2 without — a 5-review
// silent gap).
// ─────────────────────────────────────────────────────────────────

/**
 * Return the list of mode buckets a review contributes to. Caller
 * loops the returned array and increments each bucket once.
 *
 * `notASeason` is the per-review editorial pin from
 * data/television/overrides.json#notASeason: a Season-level entry
 * that isn't a season (one episode Serializd filed as Specials). Its
 * "season" bucket becomes "episode", since an episode is what it is:
 * the review still counts toward the episode total and the Episodes
 * distribution, and never toward seasons. The lifetime all-levels
 * distribution (bucketed outside this helper) counts it once as before.
 * Keyed by review id, never by season number—season 0 is not a rule.
 *
 * @param {"show"|"season"|"episode"} reviewLevel
 * @param {boolean} isMiniseries  — show.isMiniseries from the snapshot
 * @param {boolean} [notASeason]  — review is pinned notASeason
 * @returns {Array<"show"|"season"|"episode">}
 */
export function modesForReview(reviewLevel, isMiniseries, notASeason = false) {
  if (reviewLevel === "episode") return ["episode"];
  /** @type {Array<"show"|"season"|"episode">} */
  let modes = [];
  if (reviewLevel === "show") {
    modes = isMiniseries ? ["show", "season"] : ["show"];
  } else if (reviewLevel === "season") {
    modes = isMiniseries ? ["show", "season"] : ["season"];
  }
  return notASeason
    ? modes.map((m) => (m === "season" ? "episode" : m))
    : modes;
}
