// Unit tests for the pure helpers + the 429-backoff fetch wrapper in
// enrich-refresh.mjs. These cover the field extraction and the
// resumable "needs enrichment" predicates without touching the network
// (the live MDBList/TMDB pulls are the human-in-the-loop ritual).

import { describe, expect, it, vi } from "vitest";
import {
  classifyRelease,
  extractCollection,
  extractFilmCast,
  extractTvCast,
  extractWriters,
  filmNeedsCredits,
  filmNeedsMdb,
  filmNeedsRelease,
  getJson,
  namesOf,
  ratingsOf,
  seasonsOf,
  showNeedsCredits,
  showNeedsMdb,
} from "./enrich-refresh.mjs";

describe("ratingsOf", () => {
  it("normalizes MDBList's source names and fills gaps with null", () => {
    const m = {
      ratings: [
        { source: "imdb", value: 8.3 },
        { source: "popcorn", value: 88 }, // → rtAudience
        { source: "metacriticuser", value: 8.7 }, // → metacriticUser
      ],
    };
    expect(ratingsOf(m)).toEqual({
      imdb: 8.3,
      metacritic: null,
      metacriticUser: 8.7,
      tomatoes: null,
      rtAudience: 88,
      letterboxd: null,
      trakt: null,
    });
  });
});

describe("namesOf", () => {
  it("handles strings and {name}, dropping falsy", () => {
    expect(namesOf(["A", { name: "B" }, { name: null }, null])).toEqual(["A", "B"]);
    expect(namesOf(undefined)).toEqual([]);
  });
});

describe("extractFilmCast / extractTvCast", () => {
  it("sorts by billing order and caps at 20", () => {
    const cast = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      name: `A${i}`,
      order: 24 - i,
    }));
    const out = extractFilmCast({ cast });
    expect(out).toHaveLength(20);
    expect(out[0]).toEqual({ id: 24, name: "A24" }); // lowest order first
  });
  it("carries episode counts for TV", () => {
    const out = extractTvCast({
      cast: [{ id: 1, name: "Lead", order: 0, total_episode_count: 50 }],
    });
    expect(out[0]).toEqual({ id: 1, name: "Lead", eps: 50 });
  });
});

describe("extractWriters", () => {
  it("keeps writing-dept writing jobs, dedupes, drops source-material credits", () => {
    const crew = [
      { id: 1, name: "Screenwriter", department: "Writing", job: "Screenplay" },
      { id: 1, name: "Screenwriter", department: "Writing", job: "Story" }, // dup id
      { id: 2, name: "Novelist", department: "Writing", job: "Novel" }, // source → drop
      { id: 3, name: "Director", department: "Directing", job: "Director" }, // drop
    ];
    expect(extractWriters(crew)).toEqual([{ id: 1, name: "Screenwriter" }]);
  });
});

describe("extractCollection", () => {
  it("returns {id,name} or null", () => {
    expect(extractCollection({ belongs_to_collection: { id: 9, name: "Saga" } })).toEqual({
      id: 9,
      name: "Saga",
    });
    expect(extractCollection({ belongs_to_collection: null })).toBeNull();
  });
});

describe("classifyRelease", () => {
  const wrap = (region: string, type: number, date = "2020-01-01") => ({
    results: [{ iso_3166_1: region, release_dates: [{ type, release_date: date }] }],
  });
  it("classifies theatrical / limited / streaming / unknown", () => {
    expect(classifyRelease(wrap("US", 3)).cls).toBe("theatrical");
    expect(classifyRelease(wrap("US", 2)).cls).toBe("limited");
    expect(classifyRelease(wrap("US", 4)).cls).toBe("streaming");
    expect(classifyRelease({ results: [] }).cls).toBe("unknown");
  });
  it("computes the theatrical→digital gap in days", () => {
    const r = {
      results: [
        {
          iso_3166_1: "US",
          release_dates: [
            { type: 3, release_date: "2020-01-01" },
            { type: 4, release_date: "2020-01-31" },
          ],
        },
      ],
    };
    expect(classifyRelease(r).gap).toBe(30);
  });
});

describe("seasonsOf", () => {
  it("maps MDBList seasons to {n,avg}", () => {
    expect(seasonsOf({ seasons: [{ season_number: 1, avg: 81 }] })).toEqual([
      { n: 1, avg: 81 },
    ]);
    expect(seasonsOf({})).toEqual([]);
  });
});

describe("needs-enrichment predicates (resumability)", () => {
  it("films", () => {
    expect(filmNeedsMdb(undefined)).toBe(true);
    expect(filmNeedsMdb({ ratings: null })).toBe(true);
    expect(filmNeedsMdb({ ratings: { imdb: 8 } })).toBe(false);

    expect(filmNeedsCredits({ cast: [], writers: [], collection: null })).toBe(true);
    expect(filmNeedsCredits({ cast: [{ id: 1, name: "x" }], writers: [] })).toBe(true); // collection undefined
    expect(
      filmNeedsCredits({ cast: [{ id: 1, name: "x" }], writers: [], collection: null }),
    ).toBe(false);

    expect(filmNeedsRelease({})).toBe(true);
    expect(filmNeedsRelease({ release: { cls: "theatrical" } })).toBe(false);
  });
  it("shows", () => {
    expect(showNeedsMdb({ ratings: null })).toBe(true);
    expect(showNeedsCredits({ cast: [{ id: 1, name: "x", eps: 5 }] })).toBe(true); // creators undefined
    expect(showNeedsCredits({ cast: [{ id: 1, name: "x", eps: 5 }], creators: [] })).toBe(
      false,
    );
  });
});

describe("getJson — one 429 backoff then retry", () => {
  it("honors Retry-After once, then succeeds", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      if (calls === 1) {
        return {
          status: 429,
          ok: false,
          headers: { get: () => "0" }, // 0s wait → fast test
        };
      }
      return { status: 200, ok: true, json: async () => ({ done: true }) };
    });
    const out = await getJson("https://example.test/x", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toEqual({ done: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("returns null on a non-OK, non-429 response", async () => {
    const fetchImpl = vi.fn(async () => ({ status: 404, ok: false }));
    expect(
      await getJson("https://example.test/y", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).toBeNull();
  });
  it("returns null when fetch throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    expect(
      await getJson("https://example.test/z", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).toBeNull();
  });
});
