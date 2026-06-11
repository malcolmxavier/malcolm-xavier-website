// Unit tests for the temporal primitives. Dates chosen so the
// expected buckets are verifiable (2024-01-01 was a Monday).

import { describe, expect, it } from "vitest";
import {
  dayOfYear,
  doySeries,
  monthTally,
  recentYears,
  weekdayTally,
  yearOf,
} from "./temporal";

describe("dayOfYear / yearOf", () => {
  it("computes UTC day-of-year and year", () => {
    expect(dayOfYear("2026-01-01")).toBe(1);
    expect(dayOfYear("2026-02-01")).toBe(32); // Jan has 31 days
    expect(yearOf("2026-06-11")).toBe(2026);
  });
});

describe("doySeries", () => {
  it("builds a cumulative curve per year from [1,0]", () => {
    const out = doySeries(["2025-01-03", "2025-01-01"]);
    expect(out).toEqual([
      { year: "2025", points: [[1, 0], [1, 1], [3, 2]] },
    ]);
  });
});

describe("weekdayTally", () => {
  it("tallies Monday-first", () => {
    // 2024-01-01 = Monday, 2024-01-02 = Tuesday.
    const out = weekdayTally(["2024-01-01", "2024-01-02", "2024-01-01"]);
    expect(out[0]).toEqual(["Mon", 2]);
    expect(out[1]).toEqual(["Tue", 1]);
    expect(out[6]).toEqual(["Sun", 0]);
  });
});

describe("monthTally", () => {
  it("tallies Jan-first", () => {
    const out = monthTally(["2026-03-15", "2026-03-20", "2026-12-01"]);
    expect(out[2]).toEqual(["Mar", 2]);
    expect(out[11]).toEqual(["Dec", 1]);
    expect(out[0]).toEqual(["Jan", 0]);
  });
});

describe("recentYears", () => {
  it("returns the most recent n years ascending", () => {
    const dates = ["2019-01-01", "2021-01-01", "2023-01-01", "2025-01-01"];
    expect(recentYears(dates, 3)).toEqual([2021, 2023, 2025]);
  });
});
