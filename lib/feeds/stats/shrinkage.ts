// ─────────────────────────────────────────────────────────────────
// Bayesian shrinkage — the core ranking math.
//
// Ported verbatim from the stats sketch (build-stats-sketch.mjs lines
// 49–61, 497–509, 737). The shrinkage formula regresses each
// category's own mean rating toward a global prior in proportion to
// how few times it was logged:
//
//   adj = (v / (v + m)) · categoryMean + (m / (v + m)) · priorMean
//
// where v = times logged, m = the prior weight (the larger m, the more
// a thin category is pulled toward the prior). This stops a single
// 5★ outlier (e.g. one film in some genre) from topping the "highest
// rated" lists. `m` is a parameter — callers pass 3–20 by context.
//
// Pure functions, zero deps. The sketch coupled the label step to its
// ISO-name maps; here the optional `label` function decouples that so
// this module stays provenance-agnostic.
// ─────────────────────────────────────────────────────────────────

/** Mean rating from a {ratingKey: count} distribution map. */
export function avgFromDist(dist: Record<string, number>): number {
  let s = 0;
  let c = 0;
  for (const [k, n] of Object.entries(dist)) {
    const v = Number.parseFloat(k);
    if (!Number.isFinite(v)) continue;
    s += v * n;
    c += n;
  }
  return c ? s / c : 0;
}

/** Arithmetic mean of a number array (0 on empty — matches the sketch). */
export function meanOf(a: number[]): number {
  return a.reduce((s, x) => s + x, 0) / (a.length || 1);
}

/** Raw count ranking: entries sorted by count desc, optionally capped. */
export function rank(
  map: Record<string, number>,
  cap?: number,
): [string, number][] {
  const e = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return cap ? e.slice(0, cap) : e;
}

/**
 * Shrinkage rank over pre-tallied count/sum maps. Keeps categories
 * logged at least `minN` times, shrinks each toward `mean`, and
 * returns the top `topN` as [category, adjustedRating] sorted desc.
 */
export function shrinkRank(
  cnt: Record<string, number>,
  sum: Record<string, number>,
  m: number,
  minN: number,
  topN: number,
  mean: number,
): [string, number][] {
  return Object.keys(cnt)
    .filter((k) => cnt[k] >= minN)
    .map((k): [string, number] => {
      const v = cnt[k];
      return [k, (v / (v + m)) * (sum[k] / v) + (m / (v + m)) * mean];
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

/** The two-column "logged vs. rated" result a contrast tile renders. */
export type Contrast = {
  /** Most-logged: [label, count], ties broken by adjusted rating. */
  most: [string, number][];
  /** Highest-rated among entities logged ≥ majorN times. */
  major: { k: string; v: number; adj: number }[];
};

/**
 * Tally items by category (keyFn can return multiple keys per item),
 * summing each item's value, then produce both the most-logged ranking
 * and the shrinkage-rated ranking. `valueFn` extracts the rating to
 * average (usually the logger's own rating); `label` optionally maps a
 * raw key to a display label (e.g. ISO code → country name).
 *
 * Mirrors the sketch's contrastE: `most` is by raw count (count ties
 * broken by adjusted rating so the columns stay coherent), `major` is
 * by adjusted rating gated on ≥ majorN logs.
 */
export function contrastE<T>(
  items: T[],
  keyFn: (it: T) => string[],
  valueFn: (it: T) => number,
  m: number,
  topN: number,
  majorN: number,
  mean: number,
  label: (k: string) => string = (k) => k,
): Contrast {
  const cnt: Record<string, number> = {};
  const sum: Record<string, number> = {};
  for (const it of items) {
    for (const k of keyFn(it)) {
      if (!k) continue;
      cnt[k] = (cnt[k] || 0) + 1;
      sum[k] = (sum[k] || 0) + valueFn(it);
    }
  }
  const adjOf = (k: string): number => {
    const v = cnt[k];
    return (v / (v + m)) * (sum[k] / v) + (m / (v + m)) * mean;
  };
  const most: [string, number][] = Object.keys(cnt)
    .sort((a, b) => cnt[b] - cnt[a] || adjOf(b) - adjOf(a))
    .slice(0, topN)
    .map((k): [string, number] => [label(k), cnt[k]]);
  const major = Object.keys(cnt)
    .map((k) => ({ k: label(k), v: cnt[k], adj: adjOf(k) }))
    .filter((x) => x.v >= majorN)
    .sort((a, b) => b.adj - a.adj)
    .slice(0, topN);
  return { most, major };
}

/**
 * Shrink a single cell (a list of ratings) toward a grid mean — used
 * by the heatmap tiles. Returns the shrunk value + the cell count, or
 * null for an empty cell (so the renderer can leave it blank).
 */
export function shrinkCell(
  a: number[],
  gmean: number,
  m: number,
): { v: number; n: number } | null {
  if (!a.length) return null;
  const raw = a.reduce((s, v) => s + v, 0) / a.length;
  return { v: (a.length / (a.length + m)) * raw + (m / (a.length + m)) * gmean, n: a.length };
}
