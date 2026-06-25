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

// Helper: look up a full tile decision by id.
function tileDec(result: ReturnType<typeof collapse>, id: string) {
  const d = result.tiles.find((t) => t.id === id);
  if (!d) throw new Error(`no decision for tile ${id}`);
  return d;
}

// Helper: look up a tile decision's rung by id.
function rung(result: ReturnType<typeof collapse>, id: string) {
  return tileDec(result, id).rung;
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

  it("degradeToReadout above floor → solo column, not a readout", () => {
    // A versus tile whose primary axis (most-logged) clears the floor but whose
    // secondary axis (highest-rated) emptied keeps its surviving column as a
    // chart with the rated side withheld (soloColumn), rather than dropping the
    // whole tile to a bare readout. Full corpus everywhere so the band stays
    // full — only actors degrades — isolating the rung from band suppression.
    const surv = fullSurvival(FILMS_TILES).map((t) =>
      t.id === "actors" ? { ...t, degradeToReadout: true } : t,
    );
    const result = collapse("films", FILMS_TILES, surv);
    // Still a chart (T0 at full corpus), flagged solo, and not suppressed.
    expect(rung(result, "actors")).toBe("T0");
    expect(tileDec(result, "actors").soloColumn).toBe(true);
    expect(tileDec(result, "actors").suppressed).toBe(false);
  });

  it("below archetype floor → T2 skeletal readout", () => {
    // actors is a versus tile (floor 3); n=2 is below it. (A non-immortal,
    // non-overridden tile, exercising the plain ARCHETYPE_FLOORS path.)
    const result = collapse("films", FILMS_TILES, [
      { id: "actors", survivingN: 2 },
    ]);
    expect(ARCHETYPE_FLOORS.versus).toBe(3);
    expect(rung(result, "actors")).toBe("T2");
  });

  it("below a per-tile floor override → T2 (genres-vs-baseline)", () => {
    // genres-vs-baseline carries a per-tile floor of 2 (escaped-genre count),
    // NOT the diverging archetype floor of 15. n=1 escaped genre is below it.
    const result = collapse("films", FILMS_TILES, [
      { id: "genres-vs-baseline", survivingN: 1 },
    ]);
    expect(rung(result, "genres-vs-baseline")).toBe("T2");
  });

  it("self-referenced non-immortal tile → forced T2 regardless of n", () => {
    // Filtering on a single genre self-references genres-vs-baseline (the
    // divergence goes degenerate), even though n is huge.
    const result = collapse("films", FILMS_TILES, [
      { id: "genres-vs-baseline", survivingN: 9_999, selfReferenced: true },
    ]);
    expect(rung(result, "genres-vs-baseline")).toBe("T2");
  });

  it("immortal tile ignores self-reference and the floor — stays a chart", () => {
    // rating-distribution / genres are navigational: each surviving bar links
    // into reviews, so they never collapse to a readout or read as "thin". A
    // self-referenced genres tile with one surviving value renders full (T0) —
    // one bar isn't thinness, it's a concentrated corpus …
    const selfRef = collapse("films", FILMS_TILES, [
      { id: "genres", survivingN: 1, selfReferenced: true },
    ]);
    expect(rung(selfRef, "genres")).toBe("T0");
    // … and only an empty selection suppresses it.
    const empty = collapse("films", FILMS_TILES, [
      { id: "genres", survivingN: 0 },
    ]);
    expect(rung(empty, "genres")).toBe("T3");
  });

  it("near floor → T1 thinned; clear headroom → T0", () => {
    // single-axis-bar floor 5, margin = ceil(5*0.4)=2 → [5,7) is T1, ≥7 T0.
    // Uses language-x-country: a non-immortal single-axis-bar tile (genres is
    // now immortal and never thins).
    const atFloor = collapse("films", FILMS_TILES, [
      { id: "language-x-country", survivingN: 5 },
    ]);
    expect(rung(atFloor, "language-x-country")).toBe("T1");

    const headroom = collapse("films", FILMS_TILES, [
      { id: "language-x-country", survivingN: 7 },
    ]);
    expect(rung(headroom, "language-x-country")).toBe("T0");
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

  it("band with no counter → footnote; suppressed tiles roll up", () => {
    // 'Cast, Crew, and Franchises' (films) is 4 versus charts and no counter.
    // Collapse all charts → footnote naming the folded breakdowns (rollup, not
    // per-tile stubs).
    const result = collapse("films", FILMS_TILES, [
      { id: "actors", survivingN: 0 },
      { id: "writers", survivingN: 0 },
      { id: "directors", survivingN: 0 },
      { id: "collections", survivingN: 0 },
    ]);
    const b = band(result, "Cast, Crew, and Franchises");
    expect(b.state).toBe("footnote");
    expect(b.hiddenTileIds).toEqual(
      expect.arrayContaining(["actors", "writers", "directors", "collections"]),
    );
  });

  it("rating-gap counters survive a collapse of the entity charts", () => {
    // The Wes-Anderson case: filtering to one director thins the cast/crew
    // charts, but the comparison counters live in their own counters-only band
    // ('How I Stack Up'), which can't collapse — the trigger needs ≥1 chart
    // tile. So the comparison stays even when the breakdowns above it fold.
    const result = collapse("films", FILMS_TILES, [
      { id: "actors", survivingN: 0 },
      { id: "writers", survivingN: 0 },
      { id: "directors", survivingN: 0 },
      { id: "collections", survivingN: 0 },
      { id: "me-vs-critics", survivingN: 9 },
      { id: "me-vs-people", survivingN: 11 },
    ]);
    expect(band(result, "Cast, Crew, and Franchises").state).toBe("footnote");
    expect(band(result, "How I Stack Up").state).toBe("full");
    expect(rung(result, "me-vs-critics")).toBe("T0");
    expect(rung(result, "me-vs-people")).toBe("T0");
    expect(tileDec(result, "me-vs-critics").suppressed).toBe(false);
  });

  it("versus tile keeps its surviving column when only the rated side thins", () => {
    // Primary (most-logged) clears the floor; secondary (highest-rated) is
    // below it → soloColumn, still a chart (T0/T1), NOT a readout (T2).
    const result = collapse("films", FILMS_TILES, [
      { id: "actors", survivingN: 12, degradeToReadout: true },
    ]);
    const t = tileDec(result, "actors");
    expect(t.soloColumn).toBe(true);
    expect(["T0", "T1"]).toContain(t.rung);
  });

  it("a solo-column versus tile counts toward band survival", () => {
    // actors renders solo (its rated side thinned) + writers full = 2 surviving
    // charts of 4 → band stays full. Were solo not counted as a surviving
    // chart, only 1 would survive and the band would collapse.
    const result = collapse("films", FILMS_TILES, [
      { id: "actors", survivingN: 12, degradeToReadout: true },
      { id: "writers", survivingN: 8 },
      { id: "directors", survivingN: 0 },
      { id: "collections", survivingN: 0 },
    ]);
    expect(band(result, "Cast, Crew, and Franchises").state).toBe("full");
    expect(tileDec(result, "actors").soloColumn).toBe(true);
    expect(tileDec(result, "actors").suppressed).toBe(false);
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
  it("tiny corpus (N ≤ 3) → reviews handoff (films)", () => {
    // The page verdict is now a raw corpus-size gate: the `lifetime`
    // band-counter's surviving-n at or below HANDOFF_MAX_N (3) hands off,
    // because the slice can't fill a chart. Taste also folds here, but that
    // no longer drives the verdict — only the corpus count does.
    const result = collapse("films", FILMS_TILES, [
      { id: "lifetime", survivingN: 3 },
      { id: "genres", survivingN: 2 },
      { id: "genres-vs-baseline", survivingN: 0 },
    ]);
    expect(result.verdict).toBe("reviews-handoff");
  });

  it("corpus just above the gate (N = 4) → dashboard (films)", () => {
    // One above the threshold keeps the dashboard, even with a flat Taste
    // claim tile — the boundary case that proves the gate is raw-N, not Taste.
    const result = collapse("films", FILMS_TILES, [
      { id: "lifetime", survivingN: 4 },
      { id: "genres", survivingN: 2 },
      { id: "genres-vs-baseline", survivingN: 0 },
    ]);
    expect(result.verdict).toBe("dashboard");
  });

  it("rich corpus with a flat taste claim tile → dashboard, not handoff (films)", () => {
    // THE behavior change: a deep corpus whose genres-vs-baseline went flat
    // (below its escaped-genre floor) used to eject to reviews. Under the raw-N
    // gate it keeps the dashboard — the page is still full of click-targets.
    const result = collapse("films", FILMS_TILES, [
      { id: "lifetime", survivingN: 5_000 },
      { id: "genres", survivingN: 8 },
      { id: "genres-vs-baseline", survivingN: 0 },
    ]);
    expect(rung(result, "genres")).toBe("T0");
    expect(result.verdict).toBe("dashboard");
  });

  it("self-referenced taste tiles with a rich corpus → dashboard (films)", () => {
    // Filtering BY one genre self-references the Taste tiles (forced T2) but
    // the corpus is deep → keep the dashboard. The verdict reads the corpus
    // count, so a forced-T2 Taste rung never triggers a handoff.
    const result = collapse("films", FILMS_TILES, [
      { id: "lifetime", survivingN: 360 },
      { id: "genres", survivingN: 12, selfReferenced: true },
      { id: "genres-vs-baseline", survivingN: 6, selfReferenced: true },
    ]);
    expect(result.verdict).toBe("dashboard");
  });

  it("zero corpus → reviews handoff, subsumed by the N ≤ 3 gate (films)", () => {
    const result = collapse("films", FILMS_TILES, [
      { id: "lifetime", survivingN: 0 },
    ]);
    expect(result.verdict).toBe("reviews-handoff");
  });

  it("tiny corpus (N ≤ 3) → reviews handoff (television)", () => {
    // Television shares the same raw-N gate. (Its Taste tiles still use the
    // original floors pending the TV walkthrough, but they no longer drive the
    // verdict.)
    const result = collapse("television", TV_TILES, [
      { id: "lifetime", survivingN: 2 },
      { id: "genres", survivingN: 0 },
      { id: "genres-vs-baseline", survivingN: 0 },
    ]);
    expect(result.verdict).toBe("reviews-handoff");
  });

  it("healthy corpus → dashboard (television)", () => {
    const result = collapse("television", TV_TILES, [
      { id: "lifetime", survivingN: 200 },
      { id: "genres", survivingN: 0 },
      { id: "genres-vs-baseline", survivingN: 0 },
    ]);
    expect(result.verdict).toBe("dashboard");
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
