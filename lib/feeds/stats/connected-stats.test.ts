// Wiring tests for the connected (cross-brand) numbers. Corpus-
// resilient (see film-stats.test.ts header). Captured reference
// (2026-06-11): films 766 · season avg 3.23 > film avg · crossover
// Nicole Kidman (9f·2t) 11 / Mark Ruffalo (8f·2t) 10 · combined
// English 824 / US 700 · world lean +0.40.

import { describe, expect, it } from "vitest";
import { computeConnectedStats } from "./connected-stats";

const s = computeConnectedStats();
const asMap = (rows: [string, number][]) => Object.fromEntries(rows);

describe("connected head-to-head", () => {
  it("compares the full film corpus to rated seasons (seasons rated higher)", () => {
    expect(s.headToHead.filmsLogged).toBeGreaterThanOrEqual(760);
    expect(s.headToHead.seasonsLogged).toBeGreaterThan(100);
    expect(s.headToHead.seasonAvg).toBeGreaterThan(s.headToHead.filmAvg);
  });
});

describe("connected crossover actors", () => {
  it("gates symmetrically and labels each with the film·TV split", () => {
    expect(s.crossoverActors.total).toBeGreaterThanOrEqual(5);
    // Every label carries the "Nf·Mt" split, e.g. "Nicole Kidman (9f·2t)".
    for (const [label] of s.crossoverActors.most) {
      expect(label).toMatch(/^.+ \(\d+f·\d+t\)$/);
    }
    // The top crossover name should be present (it leads by combined count).
    const names = s.crossoverActors.most.map(([l]) => l);
    expect(names.some((l) => l.startsWith("Nicole Kidman"))).toBe(true);
  });
});

describe("connected combined languages + countries", () => {
  it("pools film + TV (combined English ≈ film + TV) and ranks them first", () => {
    expect(s.languages.most[0][0]).toBe("English");
    // Pooled English ≥ the film side alone (675 at capture).
    expect(asMap(s.languages.most).English).toBeGreaterThan(800);
    expect(s.countries.most[0][0]).toBe("United States");
    expect(asMap(s.countries.most)["United States"]).toBeGreaterThan(680);
  });
});

describe("connected world-cinema lean (pooled)", () => {
  it("holds the world-cinema lean across both libraries", () => {
    expect(s.worldLean.nonEnglishVsEnglish).toBeGreaterThan(0);
    expect(s.worldLean.pctInternational).toBeGreaterThan(15);
  });
});
