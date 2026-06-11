// Unit tests for franchise families + the released-count qualification
// gate + the people de-skew.

import { describe, expect, it } from "vitest";
import {
  buildFamilies,
  contrastDeskew,
  familiesOf,
  projectKeyOf,
  releasedTotalFromCollectionDetails,
} from "./franchise";

const film = (
  tmdbId: number,
  collection: { id: number; name: string } | null,
  mine: number | null = 4,
) => ({ tmdbId, collection, mine });

describe("familiesOf", () => {
  it("maps a curated-by-film id (no TMDB collection)", () => {
    expect(familiesOf(film(541671, null))).toEqual(["John Wick"]);
  });
  it("maps a curated collection to multiple families (AVP)", () => {
    expect(familiesOf(film(1, { id: 115762, name: "AVP" }))).toEqual([
      "Alien",
      "Predator",
    ]);
  });
  it("falls back to a synthetic col:<id> key for un-curated collections", () => {
    expect(familiesOf(film(2, { id: 99999, name: "Foo Series" }))).toEqual([
      "col:99999",
    ]);
  });
  it("returns nothing for a standalone film", () => {
    expect(familiesOf(film(3, null))).toEqual([]);
  });
});

describe("buildFamilies", () => {
  it("qualifies a curated family at watched ≥ 2", () => {
    const info = buildFamilies([film(404609, { id: 404609, name: "JW" }), film(541671, null)]);
    expect(info["John Wick"].watched).toBe(2);
    expect(info["John Wick"].qualifies).toBe(true);
  });
  it("gates an un-curated collection on released-count ≥ 3", () => {
    const films = [
      film(10, { id: 500, name: "Two-fer" }),
      film(11, { id: 500, name: "Two-fer" }),
    ];
    // releasedTotal 2 → not qualified even though watched 2
    expect(buildFamilies(films, { 500: 2 })["col:500"].qualifies).toBe(false);
    // releasedTotal 3 → qualified
    expect(buildFamilies(films, { 500: 3 })["col:500"].qualifies).toBe(true);
  });
  it("does not qualify a single watch", () => {
    const info = buildFamilies([film(404609, { id: 404609, name: "JW" })]);
    expect(info["John Wick"].qualifies).toBe(false);
  });
});

describe("releasedTotalFromCollectionDetails", () => {
  it("counts only members released on or before the current year", () => {
    const cd = {
      7: { parts: [{ year: "2019" }, { year: "2023" }, { year: "2027" }] },
    };
    expect(releasedTotalFromCollectionDetails(cd, 2026)).toEqual({ 7: 2 });
  });
});

describe("projectKeyOf", () => {
  it("returns the qualifying family, else the film itself", () => {
    const info = buildFamilies([film(404609, { id: 404609, name: "JW" }), film(541671, null)]);
    expect(projectKeyOf(film(541671, null), info)).toBe("John Wick");
    expect(projectKeyOf(film(777, null), info)).toBe("f777");
  });
});

describe("contrastDeskew", () => {
  it("collapses a person's same-franchise films into one project", () => {
    // Two John Wick films (rated 4 and 2) by actor X → one project,
    // project mean 3. m=1, prior=5 → adj = (1/2)·3 + (1/2)·5 = 4.
    // films count stays the honest raw 2.
    const jw1 = { ...film(404609, { id: 404609, name: "JW" }, 4), actor: "X" };
    const jw2 = { ...film(541671, null, 2), actor: "X" };
    const info = buildFamilies([jw1, jw2]);
    const out = contrastDeskew(
      [jw1, jw2],
      (f) => [f.actor],
      1,
      8,
      1,
      5,
      info,
    );
    expect(out.most).toEqual([["X", 2]]);
    expect(out.major[0]).toMatchObject({ k: "X", films: 2, n: 1, adj: 4 });
  });
});
