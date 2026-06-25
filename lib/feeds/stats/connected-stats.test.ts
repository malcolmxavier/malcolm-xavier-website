// Wiring tests for the connected (cross-brand) numbers. Corpus-
// resilient (see film-stats.test.ts header). Captured reference
// (2026-06-11): films 766 · season avg 3.23 > film avg · crossover
// Nicole Kidman (9f·2t) 11 / Mark Ruffalo (8f·2t) 10 · combined
// English 824 / US 700 · world lean +0.40.

import { describe, expect, it } from "vitest";
import {
  computeConnectedStats,
  connectedTileSurvival,
  parseConnectedFilters,
  carryConnectedParams,
} from "./connected-stats";

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

describe("connected overlap + conglomerate", () => {
  it("ranks combined language·country pairs, English·US leading", () => {
    expect(s.overlap.topPairs[0][0]).toBe("English · United States");
  });
  it("stacks Film vs TV per conglomerate, low→high, ≤8 columns", () => {
    expect(s.conglomerate.segments).toEqual(["Film", "TV"]);
    expect(s.conglomerate.cats.length).toBeLessThanOrEqual(8);
    const totals = s.conglomerate.matrix.map((r) => r[0] + r[1]);
    // Displayed ascending, so totals are non-decreasing left→right.
    for (let i = 1; i < totals.length; i++)
      expect(totals[i]).toBeGreaterThanOrEqual(totals[i - 1]);
    // Each column is a [film, TV] pair.
    for (const row of s.conglomerate.matrix) expect(row).toHaveLength(2);
  });
});

describe("connected cadence (film vs television by month)", () => {
  it("groups twelve months into film/TV bars, each stacked by year", () => {
    const m = s.temporal.monthMediumYear;
    expect(m.cats).toHaveLength(12);
    expect(m.groups).toEqual(["Film", "Television"]);
    expect(m.segments.length).toBeGreaterThan(0);
    for (const seg of m.segments) expect(seg).toMatch(/^\d{4}$/); // year labels
    // matrix is [month][medium][year].
    expect(m.matrix).toHaveLength(12);
    for (const month of m.matrix) {
      expect(month).toHaveLength(2); // film + television
      for (const stack of month) expect(stack).toHaveLength(m.segments.length);
    }
    // Films outnumber rated seasons overall, so the film bars dominate.
    const sum = (mi: number) =>
      m.matrix.reduce((a, mo) => a + mo[mi].reduce((x, y) => x + y, 0), 0);
    expect(sum(0)).toBeGreaterThan(sum(1));
  });
  it("weekday matrix stacks Films vs Seasons", () => {
    expect(s.temporal.weekdayMatrix.cats).toHaveLength(7);
    expect(s.temporal.weekdayMatrix.segments).toEqual(["Films", "Seasons"]);
  });
});

describe("connected degradation (Part C)", () => {
  it("the full corpus is a healthy dashboard — every tile a chart", () => {
    expect(s.collapse.verdict).toBe("dashboard");
    for (const t of s.collapse.tiles) expect(t.rung).toBe("T0");
  });

  it("connectedTileSurvival maps each tile to its structural unit", () => {
    const corpusN = s.headToHead.filmsLogged + s.headToHead.seasonsLogged;
    const surv = connectedTileSurvival(s, corpusN);
    const byId = Object.fromEntries(surv.map((t) => [t.id, t]));
    // Counters ride the pooled corpus.
    expect(byId["films-vs-television"].survivingN).toBe(corpusN);
    // The dumbbell counts shared genres (6 at capture, ≥ its floor of 2).
    expect(byId["genres-film-vs-tv"].survivingN).toBe(s.genreFilmVsTv.length);
    expect(byId["genres-film-vs-tv"].survivingN).toBeGreaterThanOrEqual(2);
    // The bar counts surviving language·country pairs.
    expect(byId["language-x-country"].survivingN).toBe(s.overlap.topPairs.length);
  });

  it("a single-genre filter self-references the dumbbell", () => {
    const surv = connectedTileSurvival(s, 1000, { genres: ["Drama"] });
    const dumbbell = surv.find((t) => t.id === "genres-film-vs-tv");
    expect(dumbbell?.selfReferenced).toBe(true);
  });

  it("a genre filter narrows the pooled corpus", () => {
    const drama = computeConnectedStats(parseConnectedFilters({ genre: "Drama" }));
    expect(drama.headToHead.filmsLogged).toBeLessThan(s.headToHead.filmsLogged);
    expect(drama.headToHead.filmsLogged).toBeGreaterThan(0);
  });
});

describe("parseConnectedFilters", () => {
  it("parses the shared bounded + omnibox dims", () => {
    const f = parseConnectedFilters({
      rating: "4",
      genre: "Drama",
      watchedYear: "2026",
      actor: "nicole-kidman",
      language: "french",
    });
    expect(f.ratings).toEqual([4]);
    expect(f.genres).toEqual(["Drama"]);
    expect(f.watchedYears).toEqual([2026]);
    expect(f.actors).toEqual(["nicole-kidman"]);
    expect(f.languages).toEqual(["french"]);
  });

  it("ignores cluster-only params it doesn't report on (studio, network)", () => {
    const f = parseConnectedFilters({ studio: "a24", network: "HBO / Max", genre: "Drama" });
    expect(f.genres).toEqual(["Drama"]);
    // Film-only / TV-only dims never narrow connected.
    expect((f as { studios?: string[] }).studios).toBeUndefined();
    expect((f as { networks?: string[] }).networks).toBeUndefined();
  });
});

describe("carryConnectedParams", () => {
  it("keeps the shared dims and drops cluster-only params", () => {
    const active = new URLSearchParams();
    active.set("genre", "Drama");
    active.set("rating", "4");
    active.set("studio", "a24"); // film-only — must not cross over
    active.set("network", "HBO / Max"); // TV-only — must not cross over
    const qs = carryConnectedParams(active);
    expect(qs).toContain("genre=Drama");
    expect(qs).toContain("rating=4");
    expect(qs).not.toContain("studio");
    expect(qs).not.toContain("network");
  });

  it("returns an empty string when no shared dims are active", () => {
    const active = new URLSearchParams();
    active.set("studio", "a24");
    expect(carryConnectedParams(active)).toBe("");
  });
});
