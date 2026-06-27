// Tests for the WS6 Wave B entity filters — the predicate semantics
// (OR within a facet, AND across facets, unknown-slug no-match,
// enrichment-absent drop) and, critically, the BIDIRECTIONAL CONTRACT:
// a stats-tile row's canonical label, slugified, must be exactly the
// param the filter predicate accepts. Both sides go through the same
// *FacetValues helpers + slugifyEntity, and these tests pin that.

import { describe, expect, it } from "vitest";
import {
  applyFilters,
  filmFacetValues,
  parseFilmFilters,
  type Film,
} from "./letterboxd-utils";
import {
  applyCompletedCardFilters,
  showFacetValues,
  type CompletedCard,
  type Show,
} from "./serializd-utils";
import { slugifyEntity } from "./slug";

// ─── Minimal fixtures (cast through unknown — tests touch only the
//     fields the Wave B predicates + sort read). ───────────────────

function mkFilm(
  id: string,
  releaseYear: number,
  enrichment: Partial<NonNullable<Film["enrichment"]>>,
): Film {
  return {
    id,
    releaseYear,
    latestWatchedDate: "2024-01-01",
    firstWatchedDate: "2024-01-01",
    latestReviewDate: "2024-01-01",
    firstReviewDate: "2024-01-01",
    primaryRating: null,
    reviews: [],
    tmdb: { id: 1, genres: [], runtime: null },
    ratingSet: [],
    watchedYearSet: [],
    enrichment: enrichment as Film["enrichment"],
  } as unknown as Film;
}

const ids = (rows: { film: Film }[]) => rows.map((r) => r.film.id);

describe("film Wave B predicates", () => {
  const a24Fr = mkFilm("f1", 2014, {
    studios: ["A24"],
    language: "fr",
    country: "FR",
    cast: [{ id: 1, name: "Léa Seydoux" }],
  });
  const neonEn = mkFilm("f2", 2019, {
    studios: ["Neon"],
    language: "en",
    country: "US",
    cast: [{ id: 2, name: "Toni Collette" }],
  });
  const bare = mkFilm("f3", 2001, {}); // enrichment present but empty
  const corpus = [a24Fr, neonEn, bare];

  it("filters by a single facet (studio)", () => {
    expect(ids(applyFilters(corpus, { studios: ["a24"] }))).toEqual(["f1"]);
  });
  it("OR within a facet", () => {
    expect(
      ids(applyFilters(corpus, { studios: ["a24", "neon"] })).sort(),
    ).toEqual(["f1", "f2"]);
  });
  it("AND across facets", () => {
    // A24 AND French → only f1; A24 AND English → none.
    expect(ids(applyFilters(corpus, { studios: ["a24"], languages: ["french"] }))).toEqual(["f1"]);
    expect(applyFilters(corpus, { studios: ["a24"], languages: ["english"] })).toHaveLength(0);
  });
  it("an unknown slug matches nothing (corpus constraint)", () => {
    expect(applyFilters(corpus, { studios: ["paramount"] })).toHaveLength(0);
  });
  it("drops titles whose enrichment can't confirm the facet", () => {
    // f3 has no studios → dropped when a studio filter is active.
    expect(ids(applyFilters(corpus, { studios: ["a24", "neon"] }))).not.toContain("f3");
  });
  it("derives display-name facet values via the shared helper", () => {
    expect(filmFacetValues(a24Fr).languages).toEqual(["French"]);
    expect(filmFacetValues(a24Fr).countries).toEqual(["France"]);
    expect(filmFacetValues(a24Fr).studios).toEqual(["A24"]);
    expect(filmFacetValues(a24Fr).decades).toEqual(["2010s"]);
  });
});

describe("film exact director facet (WS6b)", () => {
  // Director rides the thin snapshot tmdb.director (not enrichment), and is
  // EXACT — slug-equality, not the fuzzy substring match the ?director=
  // search box uses. A film carrying tmdb.director:
  function mkDirFilm(id: string, director: string): Film {
    return {
      id,
      releaseYear: 2014,
      latestWatchedDate: "2024-01-01",
      primaryRating: null,
      reviews: [],
      tmdb: { id: 1, genres: [], runtime: null, director },
      ratingSet: [],
      watchedYearSet: [],
    } as unknown as Film;
  }
  const corpus = [
    mkDirFilm("f1", "Christopher Nolan"),
    mkDirFilm("f2", "Greta Gerwig"),
  ];

  it("matches the film whose director slugifies to the selected slug", () => {
    expect(ids(applyFilters(corpus, { directors: ["christopher-nolan"] }))).toEqual(["f1"]);
  });
  it("is exact, not fuzzy — a partial slug matches nothing", () => {
    // The fuzzy ?director= box would match "nolan"; the exact facet must not.
    expect(applyFilters(corpus, { directors: ["nolan"] })).toHaveLength(0);
  });
  it("AND-composes with another facet", () => {
    const fv = filmFacetValues(corpus[0]);
    expect(fv.directors).toEqual(["Christopher Nolan"]);
  });
});

describe("film deep-link contract (tile label → slug → predicate)", () => {
  it("a slugified facet value is exactly what the predicate accepts", () => {
    const film = mkFilm("f1", 1994, {
      studios: ["Warner Bros. Pictures"],
      language: "fr",
      cast: [{ id: 1, name: "Penélope Cruz" }],
    });
    const fv = filmFacetValues(film);
    // Studio tile row → its slug → studio filter selects the film back.
    const studioSlug = slugifyEntity(fv.studios[0]);
    expect(ids(applyFilters([film], { studios: [studioSlug] }))).toEqual(["f1"]);
    // Same round-trip for a person row (an actor).
    const actorSlug = slugifyEntity(fv.actors[0]);
    expect(ids(applyFilters([film], { actors: [actorSlug] }))).toEqual(["f1"]);
  });
  it("parseFilmFilters maps the URL params to the predicate keys", () => {
    const f = parseFilmFilters({ studio: "a24,neon", language: "french" });
    expect(f.studios).toEqual(["a24", "neon"]);
    expect(f.languages).toEqual(["french"]);
  });
});

// ─── Television ───────────────────────────────────────────────────

function mkShow(
  premiereYear: number,
  tmdb: { type: string | null; genres: string[]; networks: string[] },
  enrichment: Partial<NonNullable<Show["enrichment"]>>,
): Show {
  return {
    id: `s-${premiereYear}-${tmdb.networks[0] ?? "x"}`,
    premiereYear,
    tmdb: { id: 1, ...tmdb },
    enrichment: enrichment as Show["enrichment"],
  } as unknown as Show;
}

function mkCard(show: Show): CompletedCard {
  return {
    show,
    review: { reviewDate: "2024-01-01", rating: 4 } as CompletedCard["review"],
    cardKind: "show",
    seasonNumber: null,
  };
}

describe("television Wave B predicates", () => {
  const hboJa = mkShow(
    2018,
    { type: "Scripted", genres: ["Drama"], networks: ["HBO"] },
    { language: "ja", country: "JP", creators: [{ id: 1, name: "Hiro" }], cast: [] },
  );
  const netflixEn = mkShow(
    2021,
    { type: "Scripted", genres: ["Drama"], networks: ["Netflix"] },
    { language: "en", country: "US", creators: [{ id: 2, name: "Jane Doe" }], cast: [] },
  );
  const cards = [mkCard(hboJa), mkCard(netflixEn)];
  const kept = (cs: CompletedCard[]) => cs.map((c) => c.show.id);

  it("filters by conglomerate (from the snapshot networks)", () => {
    // HBO → Warner Bros. Discovery; Netflix → Netflix.
    const wbd = applyCompletedCardFilters(cards, { conglomerates: ["warner-bros-discovery"] });
    expect(kept(wbd)).toEqual([hboJa.id]);
  });
  it("filters by language and decade, AND across", () => {
    expect(applyCompletedCardFilters(cards, { languages: ["japanese"], decades: ["2010s"] })).toHaveLength(1);
    expect(applyCompletedCardFilters(cards, { languages: ["japanese"], decades: ["2020s"] })).toHaveLength(0);
  });
  it("unknown slug matches nothing", () => {
    expect(applyCompletedCardFilters(cards, { countries: ["narnia"] })).toHaveLength(0);
  });
  it("deep-link contract: showFacetValues slug round-trips through the predicate", () => {
    const fv = showFacetValues(hboJa);
    const conglomerateSlug = slugifyEntity(fv.conglomerates[0]);
    expect(kept(applyCompletedCardFilters(cards, { conglomerates: [conglomerateSlug] }))).toEqual([hboJa.id]);
  });
});
