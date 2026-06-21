// Tests for the exclusion-aware URL parsing (STATS-FILTERS §7, build
// step 5). parseFilmFilters / parseShowFilters split each dimension's
// param into include + exclude slugs via the leading-"!" encoding. This
// is the shared predicate layer both the stats dashboards and the reviews
// surfaces read (§11) — so these tests also pin BACKWARD COMPATIBILITY:
// a param with no "!" must parse exactly as it did before (include-only,
// no exclude* fields set).

import { describe, expect, it } from "vitest";
import { parseFilmFilters } from "./letterboxd-utils";
import { parseShowFilters } from "./serializd-utils";

describe("parseFilmFilters — exclusion encoding", () => {
  it("splits a mixed include/exclude dimension", () => {
    const f = parseFilmFilters({ genre: "horror,thriller,!comedy" });
    expect(f.genres).toEqual(["horror", "thriller"]);
    expect(f.excludeGenres).toEqual(["comedy"]);
  });

  it("handles an all-exclude dimension (the complement)", () => {
    const f = parseFilmFilters({ country: "!us,!uk" });
    expect(f.countries).toBeUndefined();
    expect(f.excludeCountries).toEqual(["us", "uk"]);
  });

  it("splits numeric ratings on both sides and validates each", () => {
    const f = parseFilmFilters({ rating: "4.5,!1,!99" });
    expect(f.ratings).toEqual([4.5]);
    // 99 is not a valid rating → dropped; 1 survives as an exclusion.
    expect(f.excludeRatings).toEqual([1]);
  });

  it("validates runtime buckets on the exclude side too", () => {
    const f = parseFilmFilters({ runtime: "lt90,!bogus,!gt150" });
    expect(f.runtimeBuckets).toEqual(["lt90"]);
    expect(f.excludeRuntimeBuckets).toEqual(["gt150"]);
  });

  it("splits watched years on both sides (the stats rail's exclude cycle)", () => {
    const f = parseFilmFilters({ watchedYear: "2024,!2023,!nope" });
    expect(f.watchedYears).toEqual([2024]);
    // "nope" coerces to NaN → dropped; 2023 survives as an exclusion.
    expect(f.excludeWatchedYears).toEqual([2023]);
  });

  it("supports an exclude-only watched year (no include set)", () => {
    const f = parseFilmFilters({ watchedYear: "!2023" });
    expect(f.watchedYears).toBeUndefined();
    expect(f.excludeWatchedYears).toEqual([2023]);
  });

  it("carries exclusion across the high-cardinality entity facets", () => {
    const f = parseFilmFilters({
      actor: "!christopher-nolan",
      studio: "a24,!warner-bros",
    });
    expect(f.excludeActors).toEqual(["christopher-nolan"]);
    expect(f.studios).toEqual(["a24"]);
    expect(f.excludeStudios).toEqual(["warner-bros"]);
  });

  it("is backward compatible: no '!' → include-only, no exclude fields", () => {
    const f = parseFilmFilters({ genre: "horror", country: "us,uk" });
    expect(f.genres).toEqual(["horror"]);
    expect(f.countries).toEqual(["us", "uk"]);
    expect(f.excludeGenres).toBeUndefined();
    expect(f.excludeCountries).toBeUndefined();
  });
});

describe("parseShowFilters — exclusion encoding", () => {
  it("splits a mixed include/exclude dimension", () => {
    const f = parseShowFilters({ genre: "drama,!comedy" });
    expect(f.genres).toEqual(["drama"]);
    expect(f.excludeGenres).toEqual(["comedy"]);
  });

  it("carries exclusion on networks and entity facets", () => {
    const f = parseShowFilters({
      network: "hbo-max,!netflix",
      creator: "!vince-gilligan",
    });
    expect(f.networks).toEqual(["hbo-max"]);
    expect(f.excludeNetworks).toEqual(["netflix"]);
    expect(f.excludeCreators).toEqual(["vince-gilligan"]);
  });

  it("is backward compatible: no '!' → include-only", () => {
    const f = parseShowFilters({ genre: "drama", network: "hbo-max" });
    expect(f.genres).toEqual(["drama"]);
    expect(f.networks).toEqual(["hbo-max"]);
    expect(f.excludeGenres).toBeUndefined();
    expect(f.excludeNetworks).toBeUndefined();
  });
});
