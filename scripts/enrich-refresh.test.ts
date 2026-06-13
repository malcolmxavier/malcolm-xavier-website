// Unit tests for the pure helpers + the 429-backoff fetch wrapper in
// enrich-refresh.mjs. These cover the field extraction and the
// resumable "needs enrichment" predicates without touching the network
// (the live MDBList/TMDB pulls are the human-in-the-loop ritual).

import { describe, expect, it, vi } from "vitest";
import {
  classifyRelease,
  enrichFixture,
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
  serializeFixture,
  showNeedsCredits,
  showNeedsMdb,
  workLists,
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

// ─── enrichFixture (the in-memory core behind the CLI + the cron) ──
//
// Driven with a mocked fetch so no network is touched. Covers the happy
// path, partial failure, the MDBList budget gate, the no-work short-
// circuit, the incremental-save hook, and the stable serialization the
// cron's GitHub commit relies on.

/** A minimal fetch Response stand-in shaped the way getJson reads it. */
function res(json: unknown, { ok = true, status = 200 } = {}) {
  return { ok, status, headers: { get: () => null }, json: async () => json };
}

/** Route a URL to a canned MDBList/TMDB payload (a fully enrichable title). */
function mockFetch(url: string) {
  if (url.includes("api.mdblist.com/tmdb/movie/")) {
    return Promise.resolve(
      res({
        ratings: [{ source: "imdb", value: 7.5 }],
        production_companies: [{ name: "A24" }],
        country: "US",
        language: "en",
        budget: 1_000_000,
      }),
    );
  }
  if (url.includes("api.themoviedb.org/3/movie/") && url.includes("release_dates")) {
    return Promise.resolve(
      res({
        results: [
          { iso_3166_1: "US", release_dates: [{ type: 3, release_date: "2024-01-01" }] },
        ],
      }),
    );
  }
  if (url.includes("api.themoviedb.org/3/movie/")) {
    return Promise.resolve(
      res({
        credits: {
          cast: [{ id: 1, name: "Lead Actor", order: 0 }],
          crew: [{ id: 2, name: "The Writer", department: "Writing", job: "Screenplay" }],
        },
        belongs_to_collection: null,
      }),
    );
  }
  if (url.includes("api.mdblist.com/tmdb/show/")) {
    return Promise.resolve(
      res({
        ratings: [{ source: "imdb", value: 8 }],
        country: "US",
        language: "en",
        seasons: [{ season_number: 1, avg: 8 }],
      }),
    );
  }
  if (url.includes("api.themoviedb.org/3/tv/")) {
    return Promise.resolve(
      res({
        aggregate_credits: {
          cast: [{ id: 3, name: "TV Lead", order: 0, total_episode_count: 10 }],
        },
        created_by: [{ id: 4, name: "Show Creator" }],
      }),
    );
  }
  return Promise.resolve(res(null, { ok: false, status: 404 }));
}

// Loose maps — the .mjs core is untyped JS; these tests index freely.
type Fx = {
  films: Record<string, any>;
  shows: Record<string, any>;
  collectionDetails: Record<string, any>;
};
const emptyFixture = (): Fx => ({ films: {}, shows: {}, collectionDetails: {} });
const completeFilm = () => ({
  ratings: { imdb: 7 },
  cast: [{ id: 1, name: "X" }],
  writers: [],
  collection: null,
  release: { cls: "theatrical" },
});

describe("enrichFixture — happy path", () => {
  it("fills a new film and show from MDBList + TMDB", async () => {
    const fixture = emptyFixture();
    const { stats } = await enrichFixture({
      films: [{ tmdb: { id: 100 } }],
      shows: [{ tmdb: { id: 200 } }],
      fixture,
      mdbKey: "m",
      tmdbKey: "t",
      fetchImpl: mockFetch,
    });

    const film = fixture.films[100];
    expect(film.ratings.imdb).toBe(7.5);
    expect(film.studios).toContain("A24");
    expect(film.budget).toBe(1_000_000);
    expect(film.cast[0].name).toBe("Lead Actor");
    expect(film.writers[0].name).toBe("The Writer");
    expect(film.release.cls).toBe("theatrical");

    const show = fixture.shows[200];
    expect(show.ratings.imdb).toBe(8);
    expect(show.seasons[0].avg).toBe(8);
    expect(show.cast[0].name).toBe("TV Lead");
    expect(show.creators[0].name).toBe("Show Creator");

    expect(stats.filmsMdb).toBe(1);
    expect(stats.showsMdb).toBe(1);
  });
});

describe("enrichFixture — partial failure (MDBList down)", () => {
  it("still fills TMDB credits and never throws when MDBList 5xx's", async () => {
    const fixture = emptyFixture();
    const failMdb = (url: string) =>
      url.includes("mdblist")
        ? Promise.resolve(res(null, { ok: false, status: 503 }))
        : mockFetch(url);

    const { stats } = await enrichFixture({
      films: [{ tmdb: { id: 100 } }],
      shows: [],
      fixture,
      mdbKey: "m",
      tmdbKey: "t",
      fetchImpl: failMdb,
    });

    expect(fixture.films[100].ratings).toBeUndefined(); // MDBList pass failed
    expect(fixture.films[100].cast[0].name).toBe("Lead Actor"); // TMDB still filled
    expect(stats.filmsMdb).toBe(0);
  });
});

describe("enrichFixture — MDBList budget gate", () => {
  it("skips the rate-limited passes at budget 0 but still runs TMDB", async () => {
    const fixture = emptyFixture();
    const spy = vi.fn(mockFetch);
    const { stats } = await enrichFixture({
      films: [{ tmdb: { id: 100 } }],
      shows: [],
      fixture,
      mdbKey: "m",
      tmdbKey: "t",
      fetchImpl: spy,
      mdbBudget: 0,
    });

    expect(stats.filmsMdb).toBe(0);
    expect(fixture.films[100].ratings).toBeUndefined();
    expect(fixture.films[100].cast).toBeDefined(); // TMDB ran
    expect(spy.mock.calls.some(([u]) => String(u).includes("mdblist"))).toBe(false);
  });
});

describe("enrichFixture — nothing to do", () => {
  it("makes no network calls when the fixture is already complete", async () => {
    const fixture = { films: { "100": completeFilm() }, shows: {}, collectionDetails: {} };
    const spy = vi.fn(mockFetch);
    await enrichFixture({
      films: [{ tmdb: { id: 100 } }],
      shows: [],
      fixture,
      mdbKey: "m",
      tmdbKey: "t",
      fetchImpl: spy,
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("enrichFixture — incremental save hook", () => {
  it("invokes onBatch so the CLI can persist mid-run", async () => {
    const onBatch = vi.fn();
    await enrichFixture({
      films: [{ tmdb: { id: 100 } }],
      shows: [],
      fixture: emptyFixture(),
      mdbKey: "m",
      tmdbKey: "t",
      fetchImpl: mockFetch,
      onBatch,
    });
    expect(onBatch).toHaveBeenCalled();
  });
});

describe("workLists", () => {
  it("flags every under-enriched title and clears once filled", () => {
    const films = [{ tmdb: { id: 100 } }];
    const empty = emptyFixture();
    expect(workLists(films, [], empty).mdbFilms).toHaveLength(1);
    expect(workLists(films, [], empty).credFilms).toHaveLength(1);

    const filled = { films: { "100": completeFilm() }, shows: {}, collectionDetails: {} };
    const wl = workLists(films, [], filled);
    expect(wl.mdbFilms).toHaveLength(0);
    expect(wl.credFilms).toHaveLength(0);
    expect(wl.relFilms).toHaveLength(0);
  });
});

describe("serializeFixture", () => {
  it("orders keys and ends with a newline (byte-stable diffs)", () => {
    const out = serializeFixture({ films: { a: 1 }, shows: {}, collectionDetails: {} });
    expect(out.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(out);
    expect(Object.keys(parsed)).toEqual([
      "capturedAt",
      "meta",
      "films",
      "shows",
      "collectionDetails",
    ]);
    expect(parsed.meta.films).toBe(1);
  });
});
