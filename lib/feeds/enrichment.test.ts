// ─────────────────────────────────────────────────────────────────
// Integration tests for the enrichment reader.
//
// These exercise the real committed fixture + the real snapshots
// (no mocks) so they double as a coverage + no-drift guard: the reader
// must join `mine` from the live snapshot (never a stale fixture
// value), and every enriched entry must resolve to a snapshot identity.
// ─────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { getFilms } from "./letterboxd";
import { getShows } from "./serializd";
import {
  getCollectionDetails,
  getEnrichedFilms,
  getEnrichedShows,
} from "./enrichment";

describe("getEnrichedFilms", () => {
  const films = getEnrichedFilms();

  it("loads the bulk of the corpus with identity joined", () => {
    // 764 film entries in the fixture; nearly all resolve to a
    // snapshot film. Loose floor so a few unmatched ids don't fail.
    expect(films.length).toBeGreaterThan(700);
    for (const f of films) {
      expect(Number.isFinite(f.tmdbId)).toBe(true);
      expect(typeof f.title).toBe("string");
      expect(Number.isFinite(f.year)).toBe(true);
      expect(Array.isArray(f.genres)).toBe(true);
    }
  });

  it("joins `mine` from the snapshot primaryRating (no drift)", () => {
    // Build the canonical rating map straight from the snapshot and
    // assert every enriched film's `mine` matches it — proving the
    // strip-and-rejoin design (the fixture carries no `mine`).
    const byId = new Map<number, number | null>();
    for (const f of getFilms().films) {
      if (f.tmdb) byId.set(f.tmdb.id, f.primaryRating);
    }
    for (const f of films) {
      expect(f.mine).toBe(byId.get(f.tmdbId));
    }
  });

  it("carries the enrichment delta (ratings or cast present)", () => {
    for (const f of films) {
      const hasEnrichment = Boolean(f.ratings) || f.cast.length > 0;
      expect(hasEnrichment).toBe(true);
    }
  });
});

describe("getEnrichedShows", () => {
  const shows = getEnrichedShows();

  it("loads shows with snapshot identity + enrichment", () => {
    expect(shows.length).toBeGreaterThan(140);
    for (const s of shows) {
      expect(Number.isFinite(s.tmdbId)).toBe(true);
      expect(typeof s.name).toBe("string");
      expect(Array.isArray(s.networks)).toBe(true);
      expect(typeof s.isMiniseries).toBe("boolean");
    }
  });

  it("joins `mine` from the snapshot primaryRating (no drift)", () => {
    const byId = new Map<number, number | null>();
    for (const s of getShows().shows) {
      if (s.tmdb) byId.set(s.tmdb.id, s.primaryRating);
    }
    for (const s of shows) {
      expect(s.mine).toBe(byId.get(s.tmdbId));
    }
  });
});

describe("getCollectionDetails", () => {
  it("exposes collection membership keyed by numeric id", () => {
    const cd = getCollectionDetails();
    expect(Object.keys(cd).length).toBeGreaterThan(50);
    // Indiana Jones Collection (id 84) was a representative entry.
    const indy = cd[84];
    expect(indy?.name).toContain("Indiana Jones");
    expect(Array.isArray(indy?.parts)).toBe(true);
  });
});
