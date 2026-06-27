// Tests for review-lenses.ts — the curated one-tap "Start here" views.
// A lens is a named bundle of filter/sort URL params; these pin the seed
// set, the param correctness (so a lens actually filters the way it
// claims), and that "Best of {year}" tracks the injected calendar year.

import { describe, expect, it } from "vitest";
import { reviewLenses } from "./review-lenses";

describe("reviewLenses", () => {
  it("returns the three data-backed seed lenses, in order", () => {
    const ids = reviewLenses("films", 2026).map((l) => l.id);
    expect(ids).toEqual(["highest-rated", "five-star", "best-of-year"]);
  });

  it("emits valid filter/sort params per lens", () => {
    const byId = Object.fromEntries(
      reviewLenses("television", 2026).map((l) => [l.id, l.params]),
    );
    expect(byId["highest-rated"]).toEqual({ sort: "rating-desc" });
    expect(byId["five-star"]).toEqual({ rating: "5" });
    expect(byId["best-of-year"]).toEqual({
      watchedYear: "2026",
      sort: "rating-desc",
    });
  });

  it("tracks the injected year in the best-of-year lens (label + param)", () => {
    const lens = reviewLenses("films", 2024).find(
      (l) => l.id === "best-of-year",
    )!;
    expect(lens.label).toBe("Best of 2024");
    expect(lens.params.watchedYear).toBe("2024");
  });

  it("gives every lens a non-empty label and description", () => {
    for (const l of reviewLenses("films", 2026)) {
      expect(l.label.length).toBeGreaterThan(0);
      expect(l.description.length).toBeGreaterThan(0);
    }
  });

  it("does NOT ship the signal-blocked lenses yet", () => {
    const ids = reviewLenses("television", 2026).map((l) => l.id);
    // Comfort rewatches + beloved-but-underseen are documented as blocked
    // on a missing filter signal — they must not appear until that lands.
    expect(ids).not.toContain("comfort-rewatches");
    expect(ids).not.toContain("beloved-underseen");
  });
});
