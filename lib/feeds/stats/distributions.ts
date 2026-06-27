// ─────────────────────────────────────────────────────────────────
// Shared distribution helpers (used across film, TV, and connected).
//
// Three tile shapes recur on every dashboard and don't depend on
// film- or TV-specific fields — just language/country/rating/genre. They
// live here so all three view-models compute them identically (and one
// test covers the math), rather than each page re-deriving them.
//
// Ported from the stats sketch: overlapTile (~634), divergingGenreTile
// (~784), worldCinemaLeanTile (~605). Pure functions.
// ─────────────────────────────────────────────────────────────────

import { meanOf } from "./shrinkage";
import {
  countryName,
  languageName,
  normalizeCountry,
  normalizeLanguage,
} from "./provenance";

/** The minimum an item needs for the language × country / world-lean tiles. */
type Provenanced = {
  language: string | null;
  country: string | null;
  mine: number | null;
};

// ─── Language × country overlap ──────────────────────────────────

/** Distinct-count summary + the top pairs for the language × country tile. */
export type OverlapCounts = {
  pairs: number;
  languages: number;
  countries: number;
  /** Top-8 language·country pairs by count, labelled "Language · Country". */
  topPairs: [string, number][];
  /** The same pairs' component display names, index-aligned to topPairs, so a
   *  consumer can deep-link `?language=&country=` without parsing the "·"
   *  label. Same vocabulary (languageName/countryName) as the entity
   *  filters, so slugifyEntity of these matches the filter params. */
  topPairKeys: { language: string; country: string }[];
};

/**
 * Language × country joint distribution. Counts distinct languages,
 * countries, and language·country pairs, and ranks the top-8 pairs —
 * the joint view the separate Languages/Countries tiles can't show.
 */
export function overlapCounts(
  items: { language: string | null; country: string | null }[],
): OverlapCounts {
  const langs = new Set<string>();
  const countries = new Set<string>();
  const pairCount: Record<string, number> = {};
  for (const it of items) {
    const l = normalizeLanguage(it.language);
    const c = normalizeCountry(it.country);
    if (l) langs.add(l);
    if (c) countries.add(c);
    if (l && c) pairCount[l + "|" + c] = (pairCount[l + "|" + c] || 0) + 1;
  }
  const ranked = Object.entries(pairCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, n]) => {
      const [l, c] = k.split("|");
      return { language: languageName(l), country: countryName(c), n };
    });
  const topPairs: [string, number][] = ranked.map(
    (p): [string, number] => [`${p.language} · ${p.country}`, p.n],
  );
  const topPairKeys = ranked.map((p) => ({
    language: p.language,
    country: p.country,
  }));
  return {
    pairs: Object.keys(pairCount).length,
    languages: langs.size,
    countries: countries.size,
    topPairs,
    topPairKeys,
  };
}

// ─── Diverging genre (rating vs. baseline) ───────────────────────

/** Per-genre rating relative to the corpus baseline (shrunk). */
export type DivergingGenre = { genre: string; count: number; delta: number }[];

/**
 * How each most-logged genre rates above (+) or below (−) the corpus
 * baseline, shrunk toward it (m = 20 for film, 8 for TV) so a thin genre
 * can't swing wide. Most-logged first, top 12. Operates over plain
 * {genres, rating} rows so it works for both libraries.
 */
export function divergingGenre(
  items: { genres: string[]; rating: number | null }[],
  baseline: number,
  m = 20,
): DivergingGenre {
  const cnt: Record<string, number> = {};
  const sum: Record<string, number> = {};
  for (const it of items) {
    if (it.rating == null) continue;
    for (const g of it.genres || []) {
      cnt[g] = (cnt[g] || 0) + 1;
      sum[g] = (sum[g] || 0) + it.rating;
    }
  }
  return Object.keys(cnt)
    .map((g) => {
      const n = cnt[g];
      const adj = (n / (n + m)) * (sum[g] / n) + (m / (n + m)) * baseline;
      return { genre: g, count: n, delta: adj - baseline };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

// ─── World-cinema lean ───────────────────────────────────────────

/** Mean-rating deltas for non-English / non-US lean + % international. */
export type WorldLean = {
  nonEnglishVsEnglish: number;
  nonUsVsUs: number;
  pctInternational: number;
  // Bucket sizes behind the two deltas. A delta needs BOTH sides populated to
  // mean anything: meanOf([]) returns 0, so an empty side yields a real-looking
  // but bogus premium. The render reads these to hide a one-sided comparison
  // (only reachable under a narrow filter; the full corpus has all four).
  enCount: number;
  nonEnglishCount: number;
  usCount: number;
  nonUsCount: number;
};

/**
 * The rating premium on non-English vs. English and non-US vs. US work,
 * plus the international (non-US) share. Pooled across whatever set you
 * pass — one library or both combined.
 */
export function worldLean(items: Provenanced[]): WorldLean {
  const mineOf = (x: Provenanced) => x.mine ?? 0;
  const lang = (x: Provenanced) => normalizeLanguage(x.language);
  const ctry = (x: Provenanced) => normalizeCountry(x.country);
  const en = items.filter((x) => lang(x) === "en");
  const nonen = items.filter((x) => x.language && lang(x) !== "en");
  const us = items.filter((x) => ctry(x) === "US");
  const nonus = items.filter((x) => x.country && ctry(x) !== "US");
  return {
    nonEnglishVsEnglish: meanOf(nonen.map(mineOf)) - meanOf(en.map(mineOf)),
    nonUsVsUs: meanOf(nonus.map(mineOf)) - meanOf(us.map(mineOf)),
    pctInternational:
      us.length + nonus.length
        ? Math.round((nonus.length / (us.length + nonus.length)) * 100)
        : 0,
    enCount: en.length,
    nonEnglishCount: nonen.length,
    usCount: us.length,
    nonUsCount: nonus.length,
  };
}
