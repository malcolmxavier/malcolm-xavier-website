// ─────────────────────────────────────────────────────────────────
// Unified people-eligibility rules (actors, creators).
//
// Ported from the stats sketch (build-stats-sketch.mjs lines 347–377).
// The single source of truth for "which names a title contributes" to
// the actor/creator rankings, shared across films, TV, and the
// cross-brand connected view so every actors surface counts the same
// way.
//
// Cast lists are TMDB billing-ordered (array position = call-sheet
// rank), so:
//   • An actor counts only if billed in the TOP 10 — a proxy for
//     lead/major billing, not a deep-bench credit.
//   • For TV, also fold in episode centrality: ≥3 episodes
//     (recurring-or-better), so a top-billed one-off guest still drops.
//   • Non-acting show types (reality, talk, news, documentary) are
//     excluded from actor/creator tiles — their "cast" are
//     participants, not actors.
//   • A curated few TMDB "creators" are pure source-material authors
//     (novelists), demoted so the creators tile reflects showrunners.
//
// Pure functions, zero deps.
// ─────────────────────────────────────────────────────────────────

/** Billing cut-off — only the top-N billed cast count toward rankings. */
export const ACTOR_BILL_TOP = 10;

/** TV episode floor — a top-billed actor also needs ≥ this many episodes. */
export const ACTOR_MIN_EPS = 3;

/** Show types whose "cast" are participants, not actors. */
export const NONACTING_TYPES: ReadonlySet<string> = new Set([
  "Reality",
  "Talk Show",
  "News",
  "Documentary",
]);

/** Genres that net a reality show even when it's typed "Miniseries" (e.g. ANTM). */
export const NONACTING_GENRES: ReadonlySet<string> = new Set([
  "Reality",
  "Talk",
  "News",
  "Documentary",
]);

/**
 * TMDB "creators" who are pure source-material authors (novelists),
 * not showrunners — demoted so the creators tile reflects who ran the
 * show. Hands-on game-origin creators and genuine co-creators who
 * handed off showrunning are kept; only pure source authors drop.
 */
export const SOURCE_AUTHOR_CREATORS: ReadonlySet<string> = new Set([
  "George R.R. Martin", // novelist — House of the Dragon, A Knight of the Seven Kingdoms
  "Carl Hiaasen", // novelist — R.J. Decker
]);

/** True when a show is scripted enough for its cast to count as actors. */
export function isActingShow(show: {
  type: string | null;
  genres: string[];
}): boolean {
  return (
    !NONACTING_TYPES.has(show.type ?? "") &&
    !(show.genres || []).some((g) => NONACTING_GENRES.has(g))
  );
}

/** Eligible film actor names: the top-10 billed. */
export function filmActorNames(film: {
  cast: { id: number; name: string }[];
}): string[] {
  return (film.cast || []).slice(0, ACTOR_BILL_TOP).map((c) => c.name);
}

/**
 * Eligible TV actor names: among the top-10 billed, those with ≥3
 * episodes. (Slice THEN filter — billing rank first, then centrality,
 * matching the sketch.)
 */
export function tvActorNames(show: {
  cast: { id: number; name: string; eps: number | null }[];
}): string[] {
  return (show.cast || [])
    .slice(0, ACTOR_BILL_TOP)
    .filter((c) => (c.eps ?? 0) >= ACTOR_MIN_EPS)
    .map((c) => c.name);
}

/** Eligible creator names: TMDB creators minus the demoted source authors. */
export function creatorNames(show: {
  creators: { id: number; name: string }[];
}): string[] {
  return (show.creators || [])
    .map((c) => c.name)
    .filter((n) => !SOURCE_AUTHOR_CREATORS.has(n));
}
