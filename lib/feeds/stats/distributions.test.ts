// Exact, corpus-independent unit tests for the shared distribution
// helpers. Inputs are hand-constructed so every expected value is
// computable by hand — this locks the math; the per-page *-stats tests
// assert the same functions stay sane against the live fixture.

import { describe, expect, it } from "vitest";
import { divergingGenre, overlapCounts, worldLean } from "./distributions";

describe("overlapCounts", () => {
  it("counts distinct languages, countries, and pairs, and ranks the top pairs", () => {
    const out = overlapCounts([
      { language: "en", country: "US" },
      { language: "en", country: "US" },
      { language: "ja", country: "JP" },
      { language: "fr", country: null }, // language only — no pair
      { language: null, country: "GB" }, // country only — no pair
    ]);
    expect(out.languages).toBe(3); // en, ja, fr
    expect(out.countries).toBe(3); // US, JP, GB
    expect(out.pairs).toBe(2); // en|US, ja|JP
    expect(out.topPairs).toEqual([
      ["English · United States", 2],
      ["Japanese · Japan", 1],
    ]);
  });
});

describe("divergingGenre", () => {
  it("shrinks each genre toward the baseline and sorts by count", () => {
    // A: n=2, mean=4 → adj = (2/4)·4 + (2/4)·3 = 3.5 → delta +0.5
    // B: n=1, mean=4 → adj = (1/3)·4 + (2/3)·3 = 3.333 → delta +0.333
    const out = divergingGenre(
      [
        { genres: ["A"], rating: 5 },
        { genres: ["A"], rating: 3 },
        { genres: ["B"], rating: 4 },
      ],
      3, // baseline
      2, // m
    );
    expect(out[0]).toEqual({ genre: "A", count: 2, delta: 0.5 });
    expect(out[1].genre).toBe("B");
    expect(out[1].count).toBe(1);
    expect(out[1].delta).toBeCloseTo(1 / 3, 6);
  });
  it("ignores rows with a null rating", () => {
    const out = divergingGenre(
      [
        { genres: ["A"], rating: null },
        { genres: ["A"], rating: 4 },
      ],
      3,
      1,
    );
    expect(out[0].count).toBe(1); // the null row didn't count
  });
});

describe("worldLean", () => {
  it("computes the non-English / non-US premiums and international share", () => {
    const out = worldLean([
      { language: "en", country: "US", mine: 3 },
      { language: "ja", country: "JP", mine: 5 },
      { language: "fr", country: "FR", mine: 4 },
    ]);
    // English [3] vs non-English [5,4]=4.5 → +1.5; same split on country.
    expect(out.nonEnglishVsEnglish).toBeCloseTo(1.5, 6);
    expect(out.nonUsVsUs).toBeCloseTo(1.5, 6);
    expect(out.pctInternational).toBe(67); // 2 of 3
  });
  it("returns 0 international share on an empty set (no divide-by-zero)", () => {
    expect(worldLean([]).pctInternational).toBe(0);
  });
});
