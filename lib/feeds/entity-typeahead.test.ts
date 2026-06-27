// Tests for entity-typeahead.ts — the server-side search backing the
// reviews SearchOmnibox. Two layers:
//   • matchEntities / norm — the pure ranking primitive (substring-only,
//     prefix-first, count tiebreak, alpha tiebreak, diacritic-folding).
//   • searchFilmSuggestions / searchShowSuggestions — smoke tests against
//     the real committed corpus, pinning the shape the omnibox consumes
//     (grouped suggestions, no `count` field after the 2026-06-17 drop).

import { describe, expect, it } from "vitest";
import {
  matchEntities,
  norm,
  searchFilmSuggestions,
  searchShowSuggestions,
} from "./entity-typeahead";

describe("norm", () => {
  it("lowercases and strips diacritics", () => {
    expect(norm("Peñélope")).toBe("penelope");
    expect(norm("Almodóvar")).toBe("almodovar");
    expect(norm("ÀÉÎÕÜ")).toBe("aeiou");
  });
});

describe("matchEntities", () => {
  // [name, count] options, deliberately out of every useful order so the
  // ranking has to do the work.
  const options: [string, number][] = [
    ["Greta Gerwig", 3], // substring "g" but not prefix
    ["Gaspar Noé", 5], // prefix "g", higher count
    ["Gus Van Sant", 5], // prefix "g", same count → alpha after Gaspar
    ["Bong Joon-ho", 9], // no "g"-prefix; contains "g" via "Bong"
    ["Agnès Varda", 2], // contains "g" (diacritic in name)
  ];

  it("returns only substring hits", () => {
    // "xyz" matches nothing.
    expect(matchEntities(options, "xyz", 10)).toEqual([]);
  });

  it("ranks prefix matches ahead of mere substring matches", () => {
    const names = matchEntities(options, "g", 10).map(([n]) => n);
    // The three prefix-"g" names come before the substring-only ones.
    expect(names.slice(0, 3)).toEqual([
      "Gaspar Noé",
      "Gus Van Sant",
      "Greta Gerwig",
    ]);
    // Substring-only names (Bong, Agnès) trail.
    expect(names.slice(3)).toEqual(["Bong Joon-ho", "Agnès Varda"]);
  });

  it("breaks prefix ties by count, then alphabetically", () => {
    // Gaspar (5) and Gus (5) both prefix-match at the same count → alpha.
    // Greta (3) is a prefix match too but lower count → after both.
    const names = matchEntities(options, "g", 3).map(([n]) => n);
    expect(names).toEqual(["Gaspar Noé", "Gus Van Sant", "Greta Gerwig"]);
  });

  it("folds diacritics in both needle and option", () => {
    // "agnes" (no accent) must find "Agnès Varda".
    expect(matchEntities(options, "agnes", 10).map(([n]) => n)).toContain(
      "Agnès Varda",
    );
  });

  it("respects the limit", () => {
    expect(matchEntities(options, "g", 2)).toHaveLength(2);
  });
});

// ─── Corpus smoke tests ───────────────────────────────────────────
// These run against the real committed snapshot, so they assert shape
// and invariants rather than exact names (which drift as logs accrue).

describe("searchFilmSuggestions (live corpus)", () => {
  it("returns nothing below the 2-char floor", () => {
    expect(searchFilmSuggestions("a")).toEqual([]);
    expect(searchFilmSuggestions(" ")).toEqual([]);
  });

  it("groups results and every suggestion is well-formed", () => {
    const results = searchFilmSuggestions("the");
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect(typeof s.kind).toBe("string");
      expect(typeof s.label).toBe("string");
      // Titles carry an href; facets carry a param + value.
      if (s.kind === "Title") {
        expect(s.href).toBeTruthy();
      } else {
        expect(s.param).toBeTruthy();
        expect(s.value).toBeTruthy();
      }
    }
  });

  it("no longer surfaces a count field (dropped 2026-06-17)", () => {
    for (const s of searchFilmSuggestions("the")) {
      expect("count" in s).toBe(false);
    }
  });

  it("titles sort prefix-first", () => {
    // Whatever the corpus, a title that starts with the needle should rank
    // above one that merely contains it.
    const titles = searchFilmSuggestions("the").filter(
      (s) => s.kind === "Title",
    );
    const firstNonPrefix = titles.findIndex(
      (s) => !norm(s.label).startsWith("the"),
    );
    const lastPrefix = titles.reduce(
      (acc, s, i) => (norm(s.label).startsWith("the") ? i : acc),
      -1,
    );
    // If both kinds are present, all prefixes precede all non-prefixes.
    if (firstNonPrefix !== -1 && lastPrefix !== -1) {
      expect(lastPrefix).toBeLessThan(firstNonPrefix);
    }
  });
});

describe("searchShowSuggestions (live corpus)", () => {
  it("returns nothing below the 2-char floor", () => {
    expect(searchShowSuggestions("a")).toEqual([]);
  });

  it("groups results, no count field, facets carry param+value", () => {
    const results = searchShowSuggestions("the");
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect("count" in s).toBe(false);
      if (s.kind !== "Title") {
        expect(s.param).toBeTruthy();
        expect(s.value).toBeTruthy();
      }
    }
  });
});
