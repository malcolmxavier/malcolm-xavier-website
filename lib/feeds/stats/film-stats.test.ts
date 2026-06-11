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
import { computeFilmStats } from "./film-stats";

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
