// Unit tests for the recursive collapse system (STATS-FILTERS-SPEC §6).
// Inputs are hand-constructed per-tile surviving-n so every expected rung /
// band state / verdict is computable by hand against the archetype floors.
// This is the part most worth tests — it's the logic that prevents a broken
// page (spec §10 step 2).

import { describe, expect, it } from "vitest";
import {
  ARCHETYPE_FLOORS,
  CONNECTED_TILES,
  FILMS_TILES,
  TV_TILES,
  type TileSurvival,
  collapse,
} from "./collapse";

// Helper: build a survival array where every tile in a catalog sits
// comfortably above its floor (full corpus). We pick a big n so no tile
// thins.
function fullSurvival(tiles: typeof FILMS_TILES): TileSurvival[] {
  return tiles.map((t) => ({ id: t.id, survivingN: 10_000 }));
}

// Helper: look up a tile decision by id.
function rung(result: ReturnType<typeof collapse>, id: string) {
  const d = result.tiles.find((t) => t.id === id);
  if (!d) throw new Error(`no decision for tile ${id}`);
  return d.rung;
}

function band(result: ReturnType<typeof collapse>, id: string) {
  const b = result.bands.find((x) => x.id === id);
  if (!b) throw new Error(`no band ${id}`);
  return b;
}

describe("decideRung (via collapse)", () => {
  it("full corpus → every tile T0", () => {
    const result = collapse("films", FILMS_TILES, fullSurvival(FILMS_TILES));
    for (const t of result.tiles) {
      expect(t.rung).toBe("T0");
    }
    expect(result.verdict).toBe("dashboard");
  });

  it("zero surviving → T3 (suppressed, no stub)", () => {
    const result = collapse("films", FILMS_TILES, [
      { id: "genres", survivingN: 0 },
    ]);
    expect(rung(result, "genres")).toBe("T3");
    expect(result.tiles.find((t) => t.id === "genres")!.suppressed).toBe(true);
  });

  it("below floor → T2 skeletal readout", () => {
    // diverging floor is 15; n=10 is below it.
    const result = collapse("films", FILMS_TILES, [
      { id: "genres-vs-baseline", survivingN: 10 },
    ]);
    expect(ARCHETYPE_FLOORS.diverging).toBe(15);
    expect(rung(result, "genres-vs-baseline")).toBe("T2");
  });

  it("self-referenced tile → forced T2 regardless of n", () => {
    // Filtering on genres self-references the Genres tile (one value), even
    // though n is huge.
    const result = collapse("films", FILMS_TILES, [
      { id: "genres", survivingN: 9_999, selfReferenced: true },
    ]);
    expect(rung(result, "genres")).toBe("T2");
  });

  it("near floor → T1 thinned; clear headroom → T0", () => {
    // single-axis-bar floor 5, margin = ceil(5*0.4)=2 → [5,7) is T1, ≥7 T0.
    const atFloor = collapse("films", FILMS_TILES, [
      { id: "genres", survivingN: 5 },
    ]);
    expect(rung(atFloor, "genres")).toBe("T1");

    const headroom = collapse("films", FILMS_TILES, [
      { id: "genres", survivingN: 7 },
    ]);
    expect(rung(headroom, "genres")).toBe("T0");
  });

  it("counters never thin — present (T0) or absent (T3)", () => {
    const present = collapse("films", FILMS_TILES, [
      { id: "lifetime", survivingN: 1 },
    ]);
    expect(rung(present, "lifetime")).toBe("T0");

    const absent = collapse("films", FILMS_TILES, [
      { id: "lifetime", survivingN: 0 },
    ]);
    expect(rung(absent, "lifetime")).toBe("T3");
  });
});

describe("band collapse (altitude 2)", () => {
  it("band stays full when at least half its charts survive", () => {
    // 'When I watch' (films) has 3 chart tiles: watch-pace (line, floor 20),
    // watched-by-month + watched-by-weekday (stacked, floor 10). Keep 2 of 3
    // alive → not fewer than half → full.
    const result = collapse("films", FILMS_TILES, [
      { id: "watch-pace", survivingN: 100 },
      { id: "watched-by-month", survivingN: 100 },
      { id: "watched-by-weekday", survivingN: 0 }, // T3
      // everything else defaults to 0
    ]);
    expect(band(result, "When I watch").state).toBe("full");
  });

  it("band with a robust counter → band-readout when its charts fold", () => {
    // 'The corpus' (films) owns Lifetime (counter, bandCounter) + Rating
    // distribution (single-axis-bar). Kill the bar, keep the counter alive.
    // chartTiles = [rating-distribution]; 0 survive of 1 → collapse; owns a
    // surviving robust counter → band-readout.
    const result = collapse("films", FILMS_TILES, [
      { id: "lifetime", survivingN: 5_000 },
      { id: "rating-distribution", survivingN: 0 },
    ]);
    const b = band(result, "The corpus");
    expect(b.state).toBe("band-readout");
    // The bar folds into the readout caption; the counter stays (not hidden).
    expect(b.hiddenTileIds).toContain("rating-distribution");
    expect(b.hiddenTileIds).not.toContain("lifetime");
  });

  it("band with no robust counter → footnote; suppressed tiles roll up", () => {
    // 'People and critics' (films) has 4 versus charts + a non-band counter
    // (me-vs-the-world, NOT flagged bandCounter). Collapse all charts → no
    // surviving robust *band* counter → footnote. The hidden list names the
    // folded breakdowns (footnote rollup, not per-tile stubs).
    const result = collapse("films", FILMS_TILES, [
      { id: "actors", survivingN: 0 },
      { id: "writers", survivingN: 0 },
      { id: "directors", survivingN: 0 },
      { id: "collections", survivingN: 0 },
      { id: "me-vs-the-world", survivingN: 5_000 },
    ]);
    const b = band(result, "People and critics");
    expect(b.state).toBe("footnote");
    expect(b.hiddenTileIds).toEqual(
      expect.arrayContaining(["actors", "writers", "directors", "collections"]),
    );
  });

  it("pure-counter relationships don't force a collapse on a chartless band", () => {
    // Head to head (connected) is a single counter, no chart tiles → never
    // collapses regardless of survival.
    const result = collapse("connected", CONNECTED_TILES, [
      { id: "films-vs-television", survivingN: 1 },
    ]);
    expect(band(result, "Head to head").state).toBe("full");
  });
});

describe("page verdict (altitude 3)", () => {
  it("Taste band collapse → reviews handoff (films)", () => {
    // Taste has 2 charts: genres (single-axis-bar) + genres-vs-baseline
    // (diverging). Kill both → 0 of 2 survive → collapse → handoff.
    const result = collapse("films", FILMS_TILES, [
      { id: "lifetime", survivingN: 5_000 },
      { id: "genres", survivingN: 0 },
      { id: "genres-vs-baseline", survivingN: 0 },
    ]);
    expect(band(result, "Taste").state).toBe("footnote");
    expect(result.verdict).toBe("reviews-handoff");
  });

  it("Taste surviving → dashboard, not handoff (films)", () => {
    const result = collapse("films", FILMS_TILES, [
      { id: "genres", survivingN: 50 },
      { id: "genres-vs-baseline", survivingN: 50 },
    ]);
    expect(band(result, "Taste").state).toBe("full");
    expect(result.verdict).toBe("dashboard");
  });

  it("Taste band collapse → reviews handoff (television)", () => {
    const result = collapse("television", TV_TILES, [
      { id: "genres", survivingN: 0 },
      { id: "genres-vs-baseline", survivingN: 0 },
    ]);
    expect(result.verdict).toBe("reviews-handoff");
  });

  it("connected exception — thinning never yields a reviews handoff", () => {
    // Collapse most connected chart bands. Connected must report
    // 'connected-thin', never 'reviews-handoff'.
    const result = collapse("connected", CONNECTED_TILES, [
      { id: "films-vs-television", survivingN: 5_000 }, // head-to-head stays
      // every chart tile zeroed out
    ]);
    expect(result.verdict).toBe("connected-thin");
    // Head to head counter survives so connected can still point onward.
    expect(rung(result, "films-vs-television")).toBe("T0");
  });

  it("connected with healthy charts → plain dashboard", () => {
    const result = collapse("connected", CONNECTED_TILES, fullSurvival(CONNECTED_TILES));
    expect(result.verdict).toBe("dashboard");
  });
});

describe("catalog integrity", () => {
  it("films catalog has unique tile ids and a load-bearing Taste band", () => {
    const ids = FILMS_TILES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(FILMS_TILES.some((t) => t.band === "Taste")).toBe(true);
  });

  it("every archetype in every catalog has a defined floor", () => {
    for (const cat of [FILMS_TILES, TV_TILES, CONNECTED_TILES]) {
      for (const t of cat) {
        expect(ARCHETYPE_FLOORS[t.archetype]).toBeGreaterThan(0);
      }
    }
  });
});
