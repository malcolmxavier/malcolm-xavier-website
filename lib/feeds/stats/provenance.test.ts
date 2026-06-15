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
  it("the curated override wins over ICU (friendly/short names)", () => {
    // ICU would render these "United Kingdom" / "Palestinian Territories";
    // the override map keeps the shorter facet labels (and slug stability).
    expect(countryName("GB")).toBe("UK");
    expect(countryName("PS")).toBe("Palestine");
  });
  it("resolves unmapped-but-valid ISO codes via Intl (no raw codes)", () => {
    // The codes that used to leak through as "NL" / "ga" now resolve to
    // full names — the stray-long-tail fix.
    expect(countryName("NL")).toBe("Netherlands");
    expect(countryName("TW")).toBe("Taiwan");
    expect(languageName("ga")).toBe("Irish");
    expect(languageName("hi")).toBe("Hindi");
  });
  it("maps TMDB's non-ISO codes ICU can't resolve", () => {
    expect(languageName("xx")).toBe("No language");
    expect(languageName("cn")).toBe("Cantonese");
  });
  it("falls back to the raw code for a malformed/unknown code", () => {
    // 3-letter region code ICU rejects → raw code, not a crash.
    expect(countryName("zzz")).toBe("ZZZ");
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
