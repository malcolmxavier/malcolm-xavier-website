// Wiring tests for the TV dashboard numbers. Corpus-resilient (see
// film-stats.test.ts header for the rationale). Captured reference
// (2026-06-11): shows 156 · avg show 3.01 / season 3.23 / episode 3.38 ·
// networks Netflix 39 / HBO/Max 28 · conglomerate Netflix 40 / WBD 31 ·
// O-T Fagbenle 4 · Ryan Murphy 6 · English 149 · US 134.

import { describe, expect, it } from "vitest";
import { computeTvStats } from "./tv-stats";

const s = computeTvStats();
const asMap = (rows: [string, number][]) => Object.fromEntries(rows);

describe("tv lifetime (per-level)", () => {
  it("keeps the levels separate, episodes rated most generously", () => {
    expect(s.lifetime.shows).toBeGreaterThanOrEqual(150);
    for (const v of [s.lifetime.avgShow, s.lifetime.avgSeason, s.lifetime.avgEpisode]) {
      expect(v).toBeGreaterThan(2.5);
      expect(v).toBeLessThan(4);
    }
    // The miniseries-aware per-level split: episode ≥ season ≥ show.
    expect(s.lifetime.avgEpisode).toBeGreaterThan(s.lifetime.avgShow);
  });
});

describe("tv network rollup (canonical primary network)", () => {
  it("merges HBO/Max/Showtime and ranks Netflix first", () => {
    expect(s.networks.most[0][0]).toBe("Netflix");
    const keys = s.networks.most.map(([k]) => k);
    // Canon merge: the raw variants must never surface as their own rows.
    expect(keys).not.toContain("HBO");
    expect(keys).not.toContain("Max");
    expect(keys).toContain("HBO / Max");
  });
});

describe("tv conglomerate rollup", () => {
  it("rolls networks up to their parents", () => {
    const m = asMap(s.conglomerate.most);
    expect(m.Netflix).toBeGreaterThan(30);
    expect(m["Warner Bros. Discovery"]).toBeGreaterThan(20);
  });
});

describe("tv people (scripted only)", () => {
  it("surfaces top actors + creators, source authors demoted", () => {
    expect(asMap(s.actors.most)["O-T Fagbenle"]).toBeGreaterThanOrEqual(3);
    expect(s.creators.most[0][0]).toBe("Ryan Murphy");
    expect(asMap(s.creators.most)["Ryan Murphy"]).toBeGreaterThanOrEqual(5);
  });
});

describe("tv languages + countries", () => {
  it("ranks English / United States first", () => {
    expect(s.languages.most[0][0]).toBe("English");
    expect(s.countries.most[0][0]).toBe("United States");
  });
});
