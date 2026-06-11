// Unit tests for the Bayesian shrinkage primitives. Inputs are small
// enough that every expected value is hand-computable from the formula
// adj = (v/(v+m))·mean_cat + (m/(v+m))·prior.

import { describe, expect, it } from "vitest";
import {
  avgFromDist,
  contrastE,
  meanOf,
  rank,
  shrinkCell,
  shrinkRank,
} from "./shrinkage";

describe("avgFromDist", () => {
  it("means a rating→count distribution, ignoring non-numeric keys", () => {
    // (4·2 + 2·1) / 3 = 10/3
    expect(avgFromDist({ "4": 2, "2": 1 })).toBeCloseTo(10 / 3, 10);
    expect(avgFromDist({})).toBe(0);
    expect(avgFromDist({ junk: 5, "5": 1 })).toBe(5);
  });
});

describe("meanOf", () => {
  it("means an array, 0 on empty", () => {
    expect(meanOf([5, 3])).toBe(4);
    expect(meanOf([])).toBe(0);
  });
});

describe("rank", () => {
  it("sorts by count desc and caps", () => {
    expect(rank({ a: 1, b: 3, c: 2 })).toEqual([
      ["b", 3],
      ["c", 2],
      ["a", 1],
    ]);
    expect(rank({ a: 1, b: 3, c: 2 }, 2)).toEqual([
      ["b", 3],
      ["c", 2],
    ]);
  });
});

describe("shrinkRank", () => {
  it("shrinks toward the prior and gates on minN", () => {
    // A: v=2, mean_cat=8/2=4, m=2, prior=3 → 0.5·4 + 0.5·3 = 3.5
    // B: v=1 < minN(2) → dropped
    const out = shrinkRank({ A: 2, B: 1 }, { A: 8, B: 5 }, 2, 2, 5, 3);
    expect(out).toEqual([["A", 3.5]]);
  });
});

describe("contrastE", () => {
  it("produces most-logged (count) and major (shrunk, gated)", () => {
    // Two genre-A items rated 5 and 3 (sum 8, v 2); one genre-B item
    // rated 4. m=2, prior=3, majorN=2.
    const items = [
      { g: ["A"], r: 5 },
      { g: ["A"], r: 3 },
      { g: ["B"], r: 4 },
    ];
    const out = contrastE(items, (it) => it.g, (it) => it.r, 2, 8, 2, 3);
    // most: A(2) before B(1)
    expect(out.most).toEqual([
      ["A", 2],
      ["B", 1],
    ]);
    // major: only A clears majorN=2; adj = 0.5·4 + 0.5·3 = 3.5
    expect(out.major).toEqual([{ k: "A", v: 2, adj: 3.5 }]);
  });

  it("applies the optional label map", () => {
    const items = [{ g: ["us"], r: 4 }];
    const out = contrastE(
      items,
      (it) => it.g,
      (it) => it.r,
      2,
      8,
      1,
      3,
      (k) => (k === "us" ? "United States" : k),
    );
    expect(out.most[0][0]).toBe("United States");
  });
});

describe("shrinkCell", () => {
  it("shrinks a cell of ratings toward the grid mean", () => {
    // [5,3] → raw 4, v=2, m=2, gmean=3 → 0.5·4 + 0.5·3 = 3.5
    expect(shrinkCell([5, 3], 3, 2)).toEqual({ v: 3.5, n: 2 });
    expect(shrinkCell([], 3, 2)).toBeNull();
  });
});
