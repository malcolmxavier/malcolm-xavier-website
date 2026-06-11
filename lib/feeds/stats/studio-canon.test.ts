// Unit tests for the film studio canon + conglomerate rollup + the
// indexation allowlist.

import { describe, expect, it } from "vitest";
import {
  STUDIO_INDEX_ALLOWLIST,
  canonStudio,
  conglomerateOfStudio,
} from "./studio-canon";

describe("canonStudio", () => {
  it("merges the Fox → 20th Century rename variants", () => {
    expect(canonStudio("20th Century Fox")).toBe("20th Century Studios");
    expect(canonStudio("Fox Searchlight Pictures")).toBe("Searchlight Pictures");
  });
  it("passes unknown studios through", () => {
    expect(canonStudio("A24")).toBe("A24");
  });
});

describe("conglomerateOfStudio", () => {
  it("rolls a studio up to its parent (after canonicalizing)", () => {
    expect(conglomerateOfStudio(["20th Century Fox"])).toBe("Disney");
    expect(conglomerateOfStudio(["Columbia Pictures"])).toBe("Sony");
    expect(conglomerateOfStudio(["Lionsgate"])).toBe("Lionsgate");
  });
  it("short-circuits on the first mapped studio", () => {
    expect(conglomerateOfStudio(["A24", "Universal Pictures"])).toBe(
      "NBCUniversal",
    );
  });
  it("falls back to Independent / other", () => {
    expect(conglomerateOfStudio(["A24", "Neon"])).toBe("Independent / other");
    expect(conglomerateOfStudio([])).toBe("Independent / other");
  });
});

describe("STUDIO_INDEX_ALLOWLIST", () => {
  it("is the frozen 38-label set", () => {
    expect(STUDIO_INDEX_ALLOWLIST.size).toBe(38);
    expect(STUDIO_INDEX_ALLOWLIST.has("A24")).toBe(true);
    expect(STUDIO_INDEX_ALLOWLIST.has("Screen Ireland")).toBe(true);
    // Explicitly cut from the borderline set in PLAN.md.
    expect(STUDIO_INDEX_ALLOWLIST.has("STX")).toBe(false);
  });
});
