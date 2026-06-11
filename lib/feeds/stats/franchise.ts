// ─────────────────────────────────────────────────────────────────
// Franchise families + the released-count qualification rule.
//
// Ported from the stats sketch (build-stats-sketch.mjs lines 514–578,
// 965–971). TMDB collections are noisy (they pad a series with
// announced-but-unreleased sequels, and group some films oddly), so
// franchise membership is a curated layer over TMDB collections:
//
//   • A film can belong to MORE THAN ONE family (Alien vs. Predator →
//     AVP counts under both).
//   • Curated families (FAMILY_BY_*) are franchises by definition.
//   • An un-curated TMDB collection qualifies only when ≥3 of its
//     members have actually been RELEASED — so "Gladiator III" padding
//     can't tip a 2-film series over the gate.
//   • Either way a family must be watched ≥2 times to register
//     (engagement floor).
//
// The franchise layer also de-skews people rankings: a person's films
// in one franchise collapse to a single "project", so franchise
// loyalty (a Mission: Impossible run) can't masquerade as taste.
//
// Pure functions, zero deps. The sketch held FAMILY_INFO as module
// state; here buildFamilies returns it and the consumers pass it in.
// ─────────────────────────────────────────────────────────────────

/** Minimal film shape the franchise rule needs. */
type FranchiseFilm = {
  tmdbId: number;
  collection: { id: number; name: string } | null;
  mine: number | null;
};

/**
 * Curated TMDB-collection → family-name(s). A collection can map to
 * multiple families (AVP → Alien AND Predator). Editorial, frozen
 * 2026-06-07 (Malcolm).
 */
export const FAMILY_BY_COLLECTION: Record<number, string[]> = {
  8091: ["Alien"],
  135416: ["Alien"],
  1434946: ["Alien"], // Alien + Prometheus + Romulus
  115762: ["Alien", "Predator"], // AVP — counts under both
  399: ["Predator"],
  404609: ["John Wick"],
};

/** Curated TMDB-film-id → family-name(s), for films with no TMDB collection. */
export const FAMILY_BY_FILM: Record<number, string[]> = {
  541671: ["John Wick"], // Ballerina (no TMDB collection)
};

/**
 * The family keys a film belongs to. Curated names win; an un-curated
 * collection falls back to a synthetic "col:<id>" key (resolved to a
 * display name in buildFamilies). A film with no collection and no
 * curated entry belongs to no family.
 */
export function familiesOf(f: FranchiseFilm): string[] {
  const out: string[] = [];
  if (FAMILY_BY_FILM[f.tmdbId]) out.push(...FAMILY_BY_FILM[f.tmdbId]);
  if (f.collection) {
    if (FAMILY_BY_COLLECTION[f.collection.id]) {
      out.push(...FAMILY_BY_COLLECTION[f.collection.id]);
    } else {
      out.push("col:" + f.collection.id);
    }
  }
  return [...new Set(out)];
}

/** One family's membership + whether it clears the qualification gate. */
export type FamilyInfo = {
  name: string;
  watched: number;
  curated: boolean;
  total: number;
  qualifies: boolean;
};

/** key → FamilyInfo, as buildFamilies returns it. */
export type FamilyInfoMap = Record<string, FamilyInfo>;

/**
 * Build the family table from the enriched films. `releasedTotal` maps
 * a collection id to its count of RELEASED member films (see
 * releasedTotalFromCollectionDetails) — the released count, not TMDB's
 * raw total, is what an un-curated collection must clear (≥3).
 * Qualifies iff `watched ≥ 2 && (curated || releasedTotal ≥ 3)`.
 */
export function buildFamilies(
  films: FranchiseFilm[],
  releasedTotal: Record<number, number> = {},
): FamilyInfoMap {
  const info: FamilyInfoMap = {};
  for (const f of films) {
    for (const k of familiesOf(f)) {
      const name = k.startsWith("col:") ? f.collection?.name || k : k;
      info[k] ??= { name, watched: 0, curated: !k.startsWith("col:"), total: 0, qualifies: false };
      info[k].watched++;
      const rt = f.collection ? releasedTotal[f.collection.id] : 0;
      if (rt) info[k].total = Math.max(info[k].total, rt);
    }
  }
  for (const v of Object.values(info)) {
    v.qualifies = v.watched >= 2 && (v.curated || v.total >= 3);
  }
  return info;
}

/**
 * Released-member count per collection, from the collectionDetails
 * table — a member counts as released when its year is ≤ the current
 * year. This is the input to buildFamilies' qualification gate.
 */
export function releasedTotalFromCollectionDetails(
  collectionDetails: Record<number, { parts: { year: string }[] }>,
  currentYear: number,
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [id, d] of Object.entries(collectionDetails)) {
    out[Number(id)] = (d.parts || []).filter(
      (p) => p.year && Number(p.year) <= currentYear,
    ).length;
  }
  return out;
}

/**
 * A film's de-skew project key: its first QUALIFYING franchise family,
 * else the film itself ("f<id>"). Used to collapse a person's
 * same-franchise films into one project for the deskewed ranking.
 */
export function projectKeyOf(f: FranchiseFilm, familyInfo: FamilyInfoMap): string {
  const q = familiesOf(f).filter((k) => familyInfo[k]?.qualifies);
  return q.length ? q[0] : "f" + f.tmdbId;
}

/** The two-column result a de-skewed people contrast tile renders. */
export type DeskewContrast = {
  /** Most-logged: [label, rawFilmCount]. */
  most: [string, number][];
  /** Highest-rated (≥ majorN distinct projects), shrunk per-project. */
  major: { k: string; films: number; n: number; adj: number }[];
};

/**
 * Franchise-de-skewed contrast for PEOPLE (actors / directors /
 * writers). Most-logged stays an honest raw film count; highest-rated
 * averages the person's per-PROJECT ratings (same-franchise films
 * collapse to one project) and shrinks toward `mean`, gated on
 * distinct-project count ≥ majorN.
 */
export function contrastDeskew<T extends FranchiseFilm>(
  items: T[],
  keyFn: (it: T) => string[],
  m: number,
  topN: number,
  majorN: number,
  mean: number,
  familyInfo: FamilyInfoMap,
  label: (k: string) => string = (k) => k,
): DeskewContrast {
  // Per key: total film count + ratings grouped by project.
  const P: Record<string, { films: number; proj: Record<string, number[]> }> = {};
  for (const f of items) {
    const proj = projectKeyOf(f, familyInfo);
    for (const k of keyFn(f)) {
      if (!k) continue;
      P[k] ??= { films: 0, proj: {} };
      P[k].films++;
      (P[k].proj[proj] ??= []).push(f.mine ?? 0);
    }
  }
  const stats = Object.entries(P).map(([k, v]) => {
    // One rating per project (the project's mean), then the person's
    // mean across projects — shrunk toward the prior.
    const pr = Object.values(v.proj).map((a) => a.reduce((s, x) => s + x, 0) / a.length);
    const n = pr.length;
    const raw = pr.reduce((s, x) => s + x, 0) / n;
    return { k: label(k), films: v.films, n, adj: (n / (n + m)) * raw + (m / (n + m)) * mean };
  });
  const most: [string, number][] = stats
    .slice()
    .sort((a, b) => b.films - a.films || b.adj - a.adj)
    .slice(0, topN)
    .map((x): [string, number] => [x.k, x.films]);
  const major = stats
    .filter((x) => x.n >= majorN)
    .sort((a, b) => b.adj - a.adj)
    .slice(0, topN);
  return { most, major };
}
