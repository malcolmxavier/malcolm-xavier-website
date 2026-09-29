// Tests for essayNeighbors — the newer/older selector behind the
// bottom-of-essay navigation. The boundaries are the whole risk: an
// off-by-one here doesn't throw, it quietly links the wrong essay or
// drops a card, and the detail pages are prerendered so nothing at
// runtime would surface it.
//
// Expectations are derived from the live registry rather than typed out,
// so registering a seventh essay doesn't break the suite — what's being
// pinned is the RELATIONSHIP (newest has no newer, adjacent entries
// point at each other), not today's corpus.

import { describe, expect, it } from "vitest";
import {
  ESSAYS,
  essayNeighbors,
  essaysByPillar,
  WRITING_PILLAR_SLUGS,
} from "./essays";

// ESSAYS is newest-first, so index 0 is the newest essay and the last
// index is the oldest.
const newest = ESSAYS[0];
const oldest = ESSAYS[ESSAYS.length - 1];

describe("essayNeighbors — global scope", () => {
  it("gives the newest essay an older neighbour and no newer one", () => {
    const { newer, older } = essayNeighbors(newest, "all");
    expect(newer).toBeUndefined();
    expect(older?.slug).toBe(ESSAYS[1].slug);
  });

  it("gives the oldest essay a newer neighbour and no older one", () => {
    const { newer, older } = essayNeighbors(oldest, "all");
    expect(older).toBeUndefined();
    expect(newer?.slug).toBe(ESSAYS[ESSAYS.length - 2].slug);
  });

  it("points a middle essay at both of its array neighbours", () => {
    // Every interior essay: newer is the entry before it, older the
    // entry after it. Sweeping the whole middle rather than sampling one
    // means an off-by-one can't hide in a single lucky index.
    for (let i = 1; i < ESSAYS.length - 1; i++) {
      const { newer, older } = essayNeighbors(ESSAYS[i], "all");
      expect(newer?.slug).toBe(ESSAYS[i - 1].slug);
      expect(older?.slug).toBe(ESSAYS[i + 1].slug);
    }
  });

  it("orders neighbours by postDate, newest first", () => {
    // The direction words have to match the dates, not just the array:
    // a newer neighbour's postDate must not be earlier than the essay's.
    for (const essay of ESSAYS) {
      const { newer, older } = essayNeighbors(essay, "all");
      if (newer) expect(newer.postDate >= essay.postDate).toBe(true);
      if (older) expect(older.postDate <= essay.postDate).toBe(true);
    }
  });
});

describe("essayNeighbors — pillar scope", () => {
  it("yields neither side in a pillar holding one essay", () => {
    // A single-essay pillar is the case that has to render as no cards
    // at all rather than as one card pointing at the essay you're on.
    const solo = WRITING_PILLAR_SLUGS.filter(
      (p) => essaysByPillar(p).length === 1,
    );
    expect(solo.length).toBeGreaterThan(0);
    for (const pillar of solo) {
      const { newer, older } = essayNeighbors(essaysByPillar(pillar)[0], pillar);
      expect(newer).toBeUndefined();
      expect(older).toBeUndefined();
    }
  });

  it("walks only the pillar's own essays at its boundaries", () => {
    const deepest = [...WRITING_PILLAR_SLUGS].sort(
      (a, b) => essaysByPillar(b).length - essaysByPillar(a).length,
    )[0];
    const inPillar = essaysByPillar(deepest);
    expect(inPillar.length).toBeGreaterThan(1);

    // Newest in the pillar: no newer, and its older neighbour is the
    // pillar's second entry — NOT whatever sits beside it in the hub.
    const first = essayNeighbors(inPillar[0], deepest);
    expect(first.newer).toBeUndefined();
    expect(first.older?.slug).toBe(inPillar[1].slug);

    // Oldest in the pillar: no older.
    const last = essayNeighbors(inPillar[inPillar.length - 1], deepest);
    expect(last.older).toBeUndefined();
    expect(last.newer?.slug).toBe(inPillar[inPillar.length - 2].slug);

    // Every neighbour a pillar scope returns belongs to that pillar.
    for (const essay of inPillar) {
      const { newer, older } = essayNeighbors(essay, deepest);
      expect(newer?.pillar ?? deepest).toBe(deepest);
      expect(older?.pillar ?? deepest).toBe(deepest);
    }
  });

  it("yields neither side when the scope isn't the essay's pillar", () => {
    // Defensive: the surface never asks this (it scopes to the essay's
    // own pillar), and the answer has to be "no neighbours" rather than
    // a guess at a position in a list the essay isn't in.
    const other = WRITING_PILLAR_SLUGS.find((p) => p !== newest.pillar);
    expect(other).toBeDefined();
    const { newer, older } = essayNeighbors(newest, other!);
    expect(newer).toBeUndefined();
    expect(older).toBeUndefined();
  });
});
