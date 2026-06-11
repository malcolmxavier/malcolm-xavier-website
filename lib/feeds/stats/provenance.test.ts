// Unit tests for language/country normalization + budget/era buckets.

import { describe, expect, it } from "vitest";
import {
  budgetTierLabel,
  countryName,
  languageName,
  releaseEraLabel,
} from "./provenance";

describe("countryName / languageName", () => {
  it("case-merges then maps the code to a display name", () => {
    // Films store "US", shows store "us" — both resolve the same.
    expect(countryName("US")).toBe("United States");
    expect(countryName("us")).toBe("United States");
    expect(countryName("gb")).toBe("UK");
    expect(languageName("JA")).toBe("Japanese");
    expect(languageName("en")).toBe("English");
  });
  it("passes unmapped codes through", () => {
    expect(countryName("zz")).toBe("ZZ");
    expect(languageName("xx")).toBe("xx");
  });
});

describe("budgetTierLabel", () => {
  it("buckets on the <5M / <30M / <100M / ≥100M boundaries", () => {
    expect(budgetTierLabel(4_000_000)).toBe("micro <$5M");
    expect(budgetTierLabel(5_000_000)).toBe("indie $5–30M"); // boundary is exclusive below
    expect(budgetTierLabel(50_000_000)).toBe("mid $30–100M");
    expect(budgetTierLabel(200_000_000)).toBe("blockbuster >$100M");
  });
});

describe("releaseEraLabel", () => {
  it("buckets into <2010 / 2010s / 2020s", () => {
    expect(releaseEraLabel(2009)).toBe("<2010");
    expect(releaseEraLabel(2015)).toBe("2010s");
    expect(releaseEraLabel(2020)).toBe("2020s");
  });
});
