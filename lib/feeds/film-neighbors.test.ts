// Tests for the film detail-page neighbour resolver. These pin the NEW
// dispatch logic: which `from` pathname maps to which arm, that the
// collection arm walks release order (the locked §C decision), that the
// facet arm pins by slug, and that bad/empty input falls through to null
// (so the caller uses chronological neighbours).

import { describe, expect, it } from "vitest";
import {
  findFilmContextualNeighbors,
  describeFilmFilterContext,
  type FilmNeighborCorpus,
} from "./film-neighbors";
import { indexableFilmCollections } from "./facet-index";
import type { Film } from "./letterboxd-utils";

// A film carrying the fields the resolver's arms read: id/slug/title +
// releaseYear (collection order), latestWatchedDate (reviews/facet sort),
// tmdb.director (the director facet, slug-compared), and the collection
// enrichment (curated-family membership).
function mkFilm(opts: {
  id: string;
  tmdbId: number;
  releaseYear: number;
  latestWatchedDate: string;
  director?: string | null;
  collection?: { id: number; name: string } | null;
}): Film {
  return {
    id: opts.id,
    letterboxdSlug: opts.id,
    title: opts.id,
    releaseYear: opts.releaseYear,
    latestWatchedDate: opts.latestWatchedDate,
    firstWatchedDate: opts.latestWatchedDate,
    primaryRating: 4,
    watchedYearSet: [],
    reviews: [],
    genres: [],
    tmdb: {
      id: opts.tmdbId,
      genres: [],
      runtime: null,
      director: opts.director ?? null,
    },
    enrichment:
      opts.collection !== undefined
        ? ({
            tmdbId: opts.tmdbId,
            collection: opts.collection
              ? { ...opts.collection, total: 0 }
              : null,
            mine: 4,
          } as Film["enrichment"])
        : undefined,
  } as unknown as Film;
}

const emptyCorpus = (films: Film[]): FilmNeighborCorpus => ({
  films,
  genreDistribution: {},
  collections: [],
});

describe("collection arm — walks the family in release order (§C)", () => {
  // The curated John Wick family (TMDB collection 404609) + Ballerina
  // (541671, curated in). Release years deliberately out of array order to
  // prove the comparator (not insertion order) drives prev/next.
  const JW = { id: 404609, name: "John Wick: The Collection" };
  const films = [
    mkFilm({ id: "jw3", tmdbId: 1003, releaseYear: 2019, latestWatchedDate: "2024-01-01", collection: JW }),
    mkFilm({ id: "jw1", tmdbId: 1001, releaseYear: 2014, latestWatchedDate: "2024-02-01", collection: JW }),
    mkFilm({ id: "jw2", tmdbId: 1002, releaseYear: 2017, latestWatchedDate: "2024-03-01", collection: JW }),
    mkFilm({ id: "ballerina", tmdbId: 541671, releaseYear: 2025, latestWatchedDate: "2024-04-01", collection: null }),
  ];
  const corpus: FilmNeighborCorpus = {
    films,
    genreDistribution: {},
    collections: indexableFilmCollections(films, {}, 2026),
  };

  it("newer = previous release, older = next release", () => {
    // Release order: jw1(2014) jw2(2017) jw3(2019) ballerina(2025).
    const n = findFilmContextualNeighbors("jw2", "/films/collections/john-wick", corpus);
    expect(n?.newer?.id).toBe("jw1");
    expect(n?.older?.id).toBe("jw3");
  });

  it("null neighbour at the boundaries", () => {
    const first = findFilmContextualNeighbors("jw1", "/films/collections/john-wick", corpus);
    expect(first?.newer).toBeNull();
    expect(first?.older?.id).toBe("jw2");
    const last = findFilmContextualNeighbors("ballerina", "/films/collections/john-wick", corpus);
    expect(last?.older).toBeNull();
    expect(last?.newer?.id).toBe("jw3");
  });

  it("breadcrumb names the collection", () => {
    expect(describeFilmFilterContext("/films/collections/john-wick", corpus)).toBe(
      "John Wick",
    );
  });
});

describe("facet arm — pins by slug, walks the facet's filtered set", () => {
  // Three Greta Gerwig films + one other; watch dates set so the default
  // latest-watched-desc order is deterministic.
  const films = [
    mkFilm({ id: "lady-bird", tmdbId: 1, releaseYear: 2017, latestWatchedDate: "2024-03-01", director: "Greta Gerwig" }),
    mkFilm({ id: "barbie", tmdbId: 2, releaseYear: 2023, latestWatchedDate: "2024-02-01", director: "Greta Gerwig" }),
    mkFilm({ id: "little-women", tmdbId: 3, releaseYear: 2019, latestWatchedDate: "2024-01-01", director: "Greta Gerwig" }),
    mkFilm({ id: "dune", tmdbId: 4, releaseYear: 2021, latestWatchedDate: "2024-04-01", director: "Denis Villeneuve" }),
  ];

  it("neighbours are scoped to the pinned director, in watch order", () => {
    // latest-watched-desc among Gerwig: lady-bird(03) barbie(02) little-women(01).
    const n = findFilmContextualNeighbors(
      "barbie",
      "/films/director/greta-gerwig",
      emptyCorpus(films),
    );
    expect(n?.newer?.id).toBe("lady-bird");
    expect(n?.older?.id).toBe("little-women");
  });

  it("a film outside the facet isn't a neighbour (dune excluded)", () => {
    const n = findFilmContextualNeighbors(
      "little-women",
      "/films/director/greta-gerwig",
      emptyCorpus(films),
    );
    // little-women is the oldest Gerwig watch → older is null, not dune.
    expect(n?.older).toBeNull();
  });
});

describe("reviews arm — full corpus in watch order", () => {
  const films = [
    mkFilm({ id: "a", tmdbId: 1, releaseYear: 2020, latestWatchedDate: "2024-03-01" }),
    mkFilm({ id: "b", tmdbId: 2, releaseYear: 2021, latestWatchedDate: "2024-02-01" }),
    mkFilm({ id: "c", tmdbId: 3, releaseYear: 2022, latestWatchedDate: "2024-01-01" }),
  ];
  it("walks latest-watched-desc across the whole corpus", () => {
    const n = findFilmContextualNeighbors("b", "/films/reviews", emptyCorpus(films));
    expect(n?.newer?.id).toBe("a");
    expect(n?.older?.id).toBe("c");
  });
  it("the bare /films path resolves too", () => {
    const n = findFilmContextualNeighbors("b", "/films", emptyCorpus(films));
    expect(n?.newer?.id).toBe("a");
  });
});

describe("null fallthrough — caller uses chronological neighbours", () => {
  const films = [mkFilm({ id: "a", tmdbId: 1, releaseYear: 2020, latestWatchedDate: "2024-01-01" })];
  const corpus = emptyCorpus(films);
  it("no from → null", () => {
    expect(findFilmContextualNeighbors("a", undefined, corpus)).toBeNull();
  });
  it("unrecognized pathname → null", () => {
    expect(findFilmContextualNeighbors("a", "/about", corpus)).toBeNull();
  });
  it("unknown facet segment → null", () => {
    expect(findFilmContextualNeighbors("a", "/films/nonsense/x", corpus)).toBeNull();
  });
  it("film absent from the replayed set → null", () => {
    expect(findFilmContextualNeighbors("ghost", "/films/reviews", corpus)).toBeNull();
  });
  it("describeFilmFilterContext is null for the bare grid with no filters", () => {
    expect(describeFilmFilterContext("/films/reviews", corpus)).toBeNull();
  });
});
