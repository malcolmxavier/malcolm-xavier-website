// Tests for the shared entity-slug vocabulary (slug.ts). This is the
// ONE vocabulary that a stats-tile row, the filter param it deep-links
// to, and (in 6b) the dedicated route all agree on — so its round-trip
// and the facetHit match are load-bearing for the whole WS6 contract.

import { describe, expect, it } from "vitest";
import { slugifyEntity, findEntityBySlug, facetHit } from "./slug";

describe("slugifyEntity", () => {
  it("lowercases, hyphenates, and trims", () => {
    expect(slugifyEntity("Warner Bros. Discovery")).toBe("warner-bros-discovery");
    expect(slugifyEntity("United States")).toBe("united-states");
    expect(slugifyEntity("  Drama  ")).toBe("drama");
  });
  it("strips diacritics so accented names slug cleanly", () => {
    expect(slugifyEntity("Penélope Cruz")).toBe("penelope-cruz");
    expect(slugifyEntity("Léa Seydoux")).toBe("lea-seydoux");
  });
  it("drops apostrophes rather than hyphenating them", () => {
    expect(slugifyEntity("Schindler's List")).toBe("schindlers-list");
    expect(slugifyEntity("O’Brien")).toBe("obrien");
  });
  it("collapses punctuation runs and the 'Indep / other' slash", () => {
    expect(slugifyEntity("Independent / other")).toBe("independent-other");
    expect(slugifyEntity("Sci-Fi & Fantasy")).toBe("sci-fi-fantasy");
  });
});

describe("findEntityBySlug", () => {
  it("round-trips a slug back to its canonical display name", () => {
    const names = ["A24", "Warner Bros. Discovery", "Neon"];
    expect(findEntityBySlug(names, "warner-bros-discovery")).toBe(
      "Warner Bros. Discovery",
    );
    expect(findEntityBySlug(names, "a24")).toBe("A24");
  });
  it("returns null for an unknown slug (the corpus constraint)", () => {
    expect(findEntityBySlug(["A24"], "paramount")).toBeNull();
  });
});

describe("facetHit", () => {
  it("matches when any candidate slugifies into the selected set", () => {
    expect(facetHit(["a24"], ["A24", "IFC Films"])).toBe(true);
    expect(facetHit(["neon", "a24"], ["A24"])).toBe(true); // OR within
  });
  it("misses when no candidate matches", () => {
    expect(facetHit(["neon"], ["A24"])).toBe(false);
    expect(facetHit(["a24"], [])).toBe(false); // no enrichment → empty
  });
});
