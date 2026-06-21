// Unit tests for the stats-filter exclusion URL encoding (spec §7,
// Locked decision 4 — leading "!" per excluded value).

import { describe, expect, it } from "vitest";
import { parseDimension, serializeDimension } from "./filter-url";

describe("parseDimension", () => {
  it("empty / nullish input → empty arrays", () => {
    expect(parseDimension(undefined)).toEqual({ include: [], exclude: [] });
    expect(parseDimension(null)).toEqual({ include: [], exclude: [] });
    expect(parseDimension("")).toEqual({ include: [], exclude: [] });
  });

  it("include-only list", () => {
    expect(parseDimension("horror,thriller")).toEqual({
      include: ["horror", "thriller"],
      exclude: [],
    });
  });

  it("exclude-only list (the spec's ?country=!us,!uk)", () => {
    expect(parseDimension("!us,!uk")).toEqual({
      include: [],
      exclude: ["us", "uk"],
    });
  });

  it("mixed include + exclude in one dimension", () => {
    expect(parseDimension("horror,!us")).toEqual({
      include: ["horror"],
      exclude: ["us"],
    });
  });

  it("tolerates whitespace, empty tokens, and a bare marker", () => {
    expect(parseDimension(" horror , , !us , ! ")).toEqual({
      include: ["horror"],
      exclude: ["us"],
    });
  });

  it("de-dupes within each bucket, first occurrence wins", () => {
    expect(parseDimension("horror,horror,!us,!us")).toEqual({
      include: ["horror"],
      exclude: ["us"],
    });
  });
});

describe("serializeDimension", () => {
  it("includes bare, excludes prefixed; includes first", () => {
    expect(serializeDimension(["horror"], ["us", "uk"])).toBe("horror,!us,!uk");
  });

  it("empty arrays → empty string (caller drops the param)", () => {
    expect(serializeDimension([], [])).toBe("");
  });

  it("exclude-only", () => {
    expect(serializeDimension([], ["us", "uk"])).toBe("!us,!uk");
  });

  it("trims and drops empty slugs", () => {
    expect(serializeDimension([" horror ", ""], [" us "])).toBe("horror,!us");
  });
});

describe("round-trip stability", () => {
  it("parse → serialize → parse is a fixpoint", () => {
    const raw = "horror,thriller,!us,!uk";
    const once = parseDimension(raw);
    const serialized = serializeDimension(once.include, once.exclude);
    expect(serialized).toBe(raw);
    expect(parseDimension(serialized)).toEqual(once);
  });
});
