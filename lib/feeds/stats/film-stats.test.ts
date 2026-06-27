// Wiring tests for the film dashboard numbers.
//
// These read the LIVE committed snapshots + enrichment fixture, which
// grow as the daily cron lands new reviews — so the assertions are
// corpus-RESILIENT (orderings, floors, canon-key checks, label shapes)
// rather than exact counts that would break CI on every snapshot bump.
// They verify the wiring is right (correct keyFn, canon, reader join).
//
// The exact faithful-port match to the stats sketch was verified at
// port time (2026-06-11), and the math itself is locked by the
// corpus-independent primitive unit tests (shrinkage/franchise/etc.).
//
// Captured reference values (2026-06-11, for context):
//   films 766 · hours 1340 · avg 2.96 · conglomerate Independent 544 /
//   Disney 58 / Sony 23 · English 675 · US 566 · Tom Cruise 12 ·
//   Ridley Scott 7 · David Koepp 8 · Alien 9 ≥ Predator 8 ·
//   world lean +0.44 · theatrical premium > 0.

import { describe, expect, it } from "vitest";
import { computeFilmStats, filmTileSurvival } from "./film-stats";

const s = computeFilmStats();
const asMap = (rows: [string, number][]) => Object.fromEntries(rows);

describe("film lifetime", () => {
  it("is a sane, growing corpus", () => {
    expect(s.lifetime.films).toBeGreaterThanOrEqual(760);
    expect(s.lifetime.hours).toBeGreaterThan(1200);
    expect(s.lifetime.avgRating).toBeGreaterThan(2.5);
    expect(s.lifetime.avgRating).toBeLessThan(3.5);
  });
});

describe("film conglomerate rollup", () => {
  it("rolls studios up to the right parents, Independent leading", () => {
    expect(s.conglomerate.most[0][0]).toBe("Independent / other");
    const m = asMap(s.conglomerate.most);
    expect(m.Disney).toBeGreaterThan(40);
    expect(m.Disney).toBeGreaterThan(m.Sony ?? 0);
  });
});

describe("film languages + countries", () => {
  it("ranks English / United States first via the canon labels", () => {
    expect(s.languages.most[0][0]).toBe("English");
    expect(asMap(s.languages.most).English).toBeGreaterThan(650);
    expect(s.countries.most[0][0]).toBe("United States");
    expect(asMap(s.countries.most)["United States"]).toBeGreaterThan(540);
    expect(s.overlap.languages).toBeGreaterThan(20);
    expect(s.overlap.countries).toBeGreaterThan(25);
  });
});

describe("film people (franchise de-skew)", () => {
  it("surfaces the expected top names with their de-skewed counts", () => {
    expect(asMap(s.actors.most)["Tom Cruise"]).toBeGreaterThanOrEqual(10);
    expect(asMap(s.directors.most)["Ridley Scott"]).toBeGreaterThanOrEqual(6);
    expect(asMap(s.writers.most)["David Koepp"]).toBeGreaterThanOrEqual(7);
  });
});

describe("film franchises", () => {
  it("qualifies curated families, Alien ≥ Predator, Ballerina folds into John Wick", () => {
    const m = asMap(s.franchises.most);
    expect(m.Alien).toBeGreaterThanOrEqual(8);
    expect(m.Alien).toBeGreaterThanOrEqual(m.Predator);
    expect(m["John Wick"]).toBeGreaterThanOrEqual(4);
  });
});

describe("film world lean + theatrical premium", () => {
  it("leans toward world cinema and theatrical", () => {
    expect(s.worldLean.nonEnglishVsEnglish).toBeGreaterThan(0);
    expect(s.worldLean.pctInternational).toBeGreaterThan(15);
    // wideCount + nonCount = every film with a known release class.
    expect(s.theatrical.wideCount).toBeGreaterThan(s.theatrical.nonCount);
    expect(s.theatrical.premium).toBeGreaterThan(0);
  });
});

// Finite-number guard reused across the new chart-data fields — the
// rendered HTML must never carry NaN/Infinity (the WS5 verification gate).
const finite = (n: number) => Number.isFinite(n);

describe("film you-vs-world", () => {
  it("compares against critics and crowd on independent coverage", () => {
    const { critics, crowd } = s.youVsWorld;
    expect(critics.count).toBeGreaterThan(50);
    // Metascore is a strict subset of Letterboxd in a Letterboxd-sourced
    // corpus, so the crowd track always covers at least as many films.
    expect(crowd.count).toBeGreaterThanOrEqual(critics.count);
    expect(finite(critics.avg)).toBe(true);
    expect(finite(crowd.avg)).toBe(true);

    for (const gap of [critics, crowd]) {
      expect(gap.hotTakes.length).toBeLessThanOrEqual(6);
      expect(gap.darlings.length).toBeLessThanOrEqual(6);
      // The two lists are symmetric in size (k each) and never share a film
      // (top-k and bottom-k can't overlap while k ≤ n/2).
      expect(gap.hotTakes.length).toBe(gap.darlings.length);
      const hot = new Set(gap.hotTakes.map((r) => r.slug));
      expect(gap.darlings.some((r) => hot.has(r.slug))).toBe(false);
      // Hot takes lead with positive deltas; darlings are the inverse.
      if (gap.hotTakes.length && gap.darlings.length) {
        expect(gap.hotTakes[0].delta).toBeGreaterThan(gap.darlings[0].delta);
      }
    }
  });
});

describe("film diverging genre", () => {
  it("ranks most-logged genres first with finite deltas", () => {
    expect(s.divergingGenre.length).toBeLessThanOrEqual(12);
    expect(s.divergingGenre.length).toBeGreaterThan(5);
    for (let i = 1; i < s.divergingGenre.length; i++) {
      expect(s.divergingGenre[i - 1].count).toBeGreaterThanOrEqual(
        s.divergingGenre[i].count,
      );
    }
    for (const g of s.divergingGenre) expect(finite(g.delta)).toBe(true);
  });
});

describe("film overlap pairs", () => {
  it("ranks language·country pairs, English·US leading", () => {
    expect(s.overlap.topPairs.length).toBeLessThanOrEqual(8);
    expect(s.overlap.topPairs[0][0]).toBe("English · United States");
    expect(s.overlap.pairs).toBeGreaterThanOrEqual(s.overlap.topPairs.length);
  });
});

describe("film stacked-matrix tiles", () => {
  it("release-type and budget-tier by year share the ≤2011 + per-year shape", () => {
    for (const sm of [s.releaseTypeByYear, s.budgetTierByYear]) {
      expect(sm.cats[0]).toBe("≤2011");
      // Each column row has exactly one count per stack segment, all finite.
      for (const row of sm.matrix) {
        expect(row).toHaveLength(sm.segments.length);
        for (const v of row) expect(finite(v)).toBe(true);
      }
    }
    expect(s.releaseTypeByYear.segments).toEqual([
      "Theatrical",
      "Limited",
      "Streaming",
    ]);
  });
  it("temporal weekday/month matrices are 7×years and 12×years", () => {
    expect(s.temporal.weekdayMatrix.cats).toHaveLength(7);
    expect(s.temporal.monthMatrix.cats).toHaveLength(12);
    const years = s.temporal.weekdayMatrix.segments;
    for (const row of s.temporal.weekdayMatrix.matrix)
      expect(row).toHaveLength(years.length);
  });
});

describe("film rating heatmaps", () => {
  it("budget×era and type×era cells are null or finite {v,n}", () => {
    for (const h of [s.budgetEraHeat, s.releaseTypeEraHeat]) {
      expect(h.cols).toEqual(["<2010", "2010s", "2020s"]);
      for (const row of h.cells)
        for (const cell of row) {
          if (cell === null) continue;
          expect(finite(cell.v)).toBe(true);
          expect(cell.n).toBeGreaterThan(0);
        }
    }
  });
});

// Self-reference degradation (§6): a tile collapses to a readout only when a
// filter pins ITS axis to a single value — not on the mere presence of an
// include facet. These guard the two QA findings that motivated the
// cardinality predicate: a multi-value selection must keep its chart, and a
// lone rating must suppress the (now-flat) genre-rating divergence tile. The
// self-reference flag reads only the filter cardinality, so synthetic genre /
// rating values are corpus-independent like the rest of this file.
describe("film tile self-reference", () => {
  // The set of tile ids the given filter forces to a one-value readout.
  const pinned = (filters: Parameters<typeof filmTileSurvival>[1]) =>
    new Set(
      filmTileSurvival(s, filters)
        .filter((t) => t.selfReferenced)
        .map((t) => t.id),
    );

  it("pins the genre tiles when exactly one genre is selected", () => {
    const ids = pinned({ genres: ["Horror"] });
    expect(ids.has("genres")).toBe(true);
    expect(ids.has("genres-vs-baseline")).toBe(true);
  });

  it("does NOT pin the genre tiles for a multi-genre selection", () => {
    // "Every genre except one" barely narrows the corpus and still carries a
    // real distribution — the false positive that collapsed the Taste band.
    const ids = pinned({ genres: ["Horror", "Comedy", "Drama"] });
    expect(ids.has("genres")).toBe(false);
    expect(ids.has("genres-vs-baseline")).toBe(false);
  });

  it("does NOT pin on a pure exclude (no include array)", () => {
    const ids = pinned({ excludeGenres: ["Horror"] });
    expect(ids.has("genres")).toBe(false);
    expect(ids.has("genres-vs-baseline")).toBe(false);
  });

  it("pins both rating tiles when exactly one rating is selected", () => {
    // A lone rating flattens the divergence chart to all-zero bars, so it
    // degrades alongside the rating histogram.
    const ids = pinned({ ratings: [4] });
    expect(ids.has("rating-distribution")).toBe(true);
    expect(ids.has("genres-vs-baseline")).toBe(true);
  });

  it("does NOT pin the rating tiles for a multi-rating selection", () => {
    const ids = pinned({ ratings: [4, 5] });
    expect(ids.has("rating-distribution")).toBe(false);
    expect(ids.has("genres-vs-baseline")).toBe(false);
  });

  it("leaves every tile unpinned under no filter", () => {
    expect(pinned(undefined).size).toBe(0);
  });
});
