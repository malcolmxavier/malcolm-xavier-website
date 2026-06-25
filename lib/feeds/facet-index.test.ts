// Tests for facet-index.ts — the ONE floor/allowlist gate that
// generateStaticParams, the sitemap, the reviews canonical handoff, and the
// stats deep-links all share. These pin: the per-type count floors, the
// studio allowlist∧5 exception, and the invariant that isIndexable* agrees
// exactly with the indexable-names list (so "a value gets a route" and "the
// reviews page hands off to that route" can't diverge).

import { describe, expect, it } from "vitest";
import {
  indexableFilmFacetNames,
  indexableTvFacetNames,
  isIndexableFilmFacet,
  isIndexableTvFacet,
  indexableFilmCollections,
  indexableFilmCollectionNames,
  filmsInFilmFamily,
  indexableTvCollections,
  indexableTvCollectionNames,
  showsInTvFamily,
  filmFacetForBasePath,
  tvFacetForBasePath,
  resolveFilmFacet,
  resolveTvFacet,
  filmCollectionMemberSort,
  tvCollectionMemberSort,
  FILM_FACET_PIN_KEY,
  TV_FACET_PIN,
  FILM_FACET_BASEPATH,
  TV_FACET_BASEPATH,
  curatedFilmEntityFacets,
  curatedShowEntityFacets,
  curatedTvRailNetworks,
  FILM_FACET_FLOORS,
  TV_FACET_FLOORS,
  makeFilmFacetHref,
  makeTvFacetHref,
} from "./facet-index";
import { filmEntityFacets } from "./letterboxd-utils";
import { showEntityFacets, deriveAvailableNetworks } from "./serializd-utils";
import type { Film } from "./letterboxd-utils";
import type { Show } from "./serializd-utils";
import { primaryNetwork } from "./stats/network-canon";

// ─── Minimal fixtures (cast through unknown — only the fields the facet
//     distributions read). ──────────────────────────────────────────

function mkFilm(
  id: string,
  releaseYear: number,
  director: string | null,
  enrichment: Partial<NonNullable<Film["enrichment"]>> = {},
): Film {
  return {
    id,
    releaseYear,
    tmdb: { id: 1, genres: [], runtime: null, director },
    enrichment: enrichment as Film["enrichment"],
  } as unknown as Film;
}

function mkShow(
  id: string,
  premiereYear: number,
  tmdb: { type: string | null; networks: string[] },
  enrichment: Partial<NonNullable<Show["enrichment"]>> = {},
): Show {
  return {
    id,
    premiereYear,
    tmdb: { id: 1, genres: [], ...tmdb },
    enrichment: enrichment as Show["enrichment"],
  } as unknown as Show;
}

// Build n films sharing one studio (allowlist membership is by canonical name).
function studioFilms(studio: string, n: number, startId = 0): Film[] {
  return Array.from({ length: n }, (_, i) =>
    mkFilm(`${studio}-${startId + i}`, 2014, null, { studios: [studio] }),
  );
}

describe("film studio indexation (allowlist ∧ count ≥ 5)", () => {
  // A24 + Neon are both on the allowlist; "Indie Backers" is not.
  const films = [
    ...studioFilms("A24", 5), //   allowlisted, count 5  → indexes
    ...studioFilms("Neon", 4), //  allowlisted, count 4  → sub-floor, excluded
    ...studioFilms("Indie Backers", 6), // count 6 but NOT allowlisted → excluded
  ];

  it("indexes an allowlisted studio that clears the floor", () => {
    expect(indexableFilmFacetNames("studios", films)).toEqual(["A24"]);
  });
  it("excludes an allowlisted studio below the floor", () => {
    expect(isIndexableFilmFacet("studios", "Neon", films)).toBe(false);
  });
  it("excludes a non-allowlisted studio even above the floor", () => {
    expect(isIndexableFilmFacet("studios", "Indie Backers", films)).toBe(false);
  });
});

describe("film director indexation (count ≥ 3)", () => {
  const films = [
    mkFilm("a", 2010, "Greta Gerwig"),
    mkFilm("b", 2017, "Greta Gerwig"),
    mkFilm("c", 2019, "Greta Gerwig"), // count 3 → indexes
    mkFilm("d", 2020, "One Hit Wonder"),
    mkFilm("e", 2021, "One Hit Wonder"), // count 2 → sub-floor
  ];
  it("indexes a director at the floor, excludes one below it", () => {
    expect(indexableFilmFacetNames("directors", films)).toEqual(["Greta Gerwig"]);
    expect(isIndexableFilmFacet("directors", "One Hit Wonder", films)).toBe(false);
  });
});

describe("tv network indexation (count ≥ 5, primary network)", () => {
  const shows = [
    ...Array.from({ length: 5 }, (_, i) =>
      mkShow(`hbo-${i}`, 2018, { type: "Scripted", networks: ["HBO"] }),
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      mkShow(`nf-${i}`, 2021, { type: "Scripted", networks: ["Netflix"] }),
    ),
  ];
  // The route keys on the canonical PRIMARY network, so derive the expected
  // names the same way the gate does rather than hardcoding canon output.
  const hbo = primaryNetwork(["HBO"])!;
  const netflix = primaryNetwork(["Netflix"])!;

  it("indexes a network at the floor, excludes one below it", () => {
    expect(isIndexableTvFacet("networks", hbo, shows)).toBe(true);
    expect(isIndexableTvFacet("networks", netflix, shows)).toBe(false);
  });
});

describe("tv type indexation (count ≥ 2)", () => {
  const shows = [
    mkShow("a", 2018, { type: "Scripted", networks: ["HBO"] }),
    mkShow("b", 2019, { type: "Scripted", networks: ["HBO"] }), // 2 → indexes
    mkShow("c", 2020, { type: "Documentary", networks: ["PBS"] }), // 1 → sub-floor
  ];
  it("indexes a type at the floor, excludes one below it", () => {
    expect(indexableTvFacetNames("types", shows)).toContain("Scripted");
    expect(isIndexableTvFacet("types", "Documentary", shows)).toBe(false);
  });
});

describe("isIndexable agrees with the indexable-names list (handoff parity)", () => {
  // The reviews canonical handoff hands off iff the value has a route; the
  // route exists iff the value is in the generateStaticParams list. Both go
  // through these helpers, so membership must be identical — this is the
  // load-bearing invariant against drift.
  const films = [
    ...studioFilms("A24", 6),
    mkFilm("z", 2000, "Greta Gerwig"),
    mkFilm("y", 2001, "Greta Gerwig"),
    mkFilm("x", 2002, "Greta Gerwig"),
  ];
  it("film: every indexable name reports indexable, and a non-member doesn't", () => {
    for (const name of indexableFilmFacetNames("studios", films)) {
      expect(isIndexableFilmFacet("studios", name, films)).toBe(true);
    }
    expect(isIndexableFilmFacet("studios", "Nonexistent Studio", films)).toBe(false);
  });
});

// ─── Film collections (franchise families → /films/collections/[slug]) ───
//
// The route vocabulary is the CURATED family name (stats/franchise.ts), not
// the raw TMDB collection name. These pin: curated families qualify on the
// curated flag (John Wick folds in Ballerina, which has no TMDB collection);
// un-curated collections qualify only on released-count ≥ 3; and either way
// a family needs ≥ FRANCHISE_ROUTE_FLOOR logged films to earn a route.

// A film carrying just the fields the franchise rule reads: a distinct TMDB
// id (drives the curated FAMILY_BY_FILM lookup), an optional collection ref,
// and a rating.
function mkColFilm(
  tmdbId: number,
  rating: number,
  collection: { id: number; name: string } | null,
): Film {
  return {
    id: `tmdb-${tmdbId}`,
    primaryRating: rating,
    tmdb: { id: tmdbId, genres: [], runtime: null, director: null },
    enrichment: collection
      ? ({ tmdbId, collection: { ...collection, total: 0 }, mine: rating } as Film["enrichment"])
      : ({ tmdbId, collection: null, mine: rating } as Film["enrichment"]),
  } as unknown as Film;
}

describe("film collections — curated family qualification", () => {
  // The John Wick collection (TMDB 404609 → curated "John Wick") plus
  // Ballerina (TMDB 541671, no collection, curated into John Wick via
  // FAMILY_BY_FILM). 4 logged → clears the route floor.
  const JOHN_WICK = { id: 404609, name: "John Wick: The Collection" };
  const films = [
    mkColFilm(1001, 4.5, JOHN_WICK),
    mkColFilm(1002, 4.0, JOHN_WICK),
    mkColFilm(1003, 3.5, JOHN_WICK),
    mkColFilm(541671, 4.0, null), // Ballerina — curated into John Wick
  ];

  it("groups a curated family under its family name, not the TMDB name", () => {
    const names = indexableFilmCollectionNames(films, {}, 2026);
    expect(names).toContain("John Wick");
    expect(names).not.toContain("John Wick: The Collection");
  });

  it("counts every member of the family, including the curated-in film", () => {
    const jw = indexableFilmCollections(films, {}, 2026).find(
      (c) => c.name === "John Wick",
    );
    expect(jw?.count).toBe(4);
  });

  it("membership resolves the family by key — Ballerina included", () => {
    const members = filmsInFilmFamily(films, "John Wick");
    expect(members.map((f) => f.id).sort()).toEqual([
      "tmdb-1001",
      "tmdb-1002",
      "tmdb-1003",
      "tmdb-541671",
    ]);
  });
});

describe("film collections — un-curated collection gates on released count", () => {
  const SAGA = { id: 9999, name: "Test Saga Collection" };
  const films = [
    mkColFilm(2001, 4.0, SAGA),
    mkColFilm(2002, 3.0, SAGA),
    mkColFilm(2003, 3.5, SAGA),
  ];
  // Three released members → the collection qualifies as a franchise.
  const detailsReleased = {
    9999: {
      name: "Test Saga Collection",
      total: 3,
      parts: [{ year: "2000" }, { year: "2005" }, { year: "2010" }],
    },
  } as unknown as Parameters<typeof indexableFilmCollections>[1];
  // Only two released members → fails the franchise gate even with 3 logged.
  const detailsUnreleased = {
    9999: {
      name: "Test Saga Collection",
      total: 3,
      parts: [{ year: "2000" }, { year: "2005" }, { year: "2099" }],
    },
  } as unknown as Parameters<typeof indexableFilmCollections>[1];

  it("indexes an un-curated collection with ≥3 released members", () => {
    expect(indexableFilmCollectionNames(films, detailsReleased, 2026)).toContain(
      "Test Saga Collection",
    );
  });

  it("excludes it when fewer than 3 members have actually released", () => {
    expect(
      indexableFilmCollectionNames(films, detailsUnreleased, 2026),
    ).not.toContain("Test Saga Collection");
  });
});

describe("film collections — route floor (≥3 logged) excludes thin families", () => {
  const JOHN_WICK = { id: 404609, name: "John Wick: The Collection" };
  // A curated family qualifies as a franchise, but only 2 logged films — it
  // shows on the stats tile (≥2) yet earns no thin route page (<3).
  const films = [mkColFilm(3001, 4.0, JOHN_WICK), mkColFilm(3002, 4.0, JOHN_WICK)];
  it("a 2-film curated family gets no route", () => {
    expect(indexableFilmCollectionNames(films, {}, 2026)).not.toContain(
      "John Wick",
    );
  });
});

// ─── TV collections (curated franchise families → /television/collections) ─
//
// Fully hand-curated (no TMDB signal). These pin: parent membership is
// DERIVED (a Bravo-verse subcollection show also counts under Bravo), the
// route floor is 2 (no padding noise to guard against), and a show absent
// from the curated map belongs to no family (e.g. The Valley: Persian Style).

// A show carrying just the TMDB id the curated map keys on.
function mkColShow(tmdbId: number): Show {
  return {
    id: `tmdb-tv-${tmdbId}`,
    premiereYear: 2020,
    tmdb: { id: tmdbId, genres: [], type: "Reality", networks: ["Bravo"] },
  } as unknown as Show;
}

describe("tv collections — curated hierarchy + derived parent membership", () => {
  const shows = [
    // 9-1-1 universe (3 shows, no parent)
    mkColShow(75219),
    mkColShow(89393),
    mkColShow(284838),
    // Bravo › Real Housewives (Atlanta + Beverly Hills = 2 here)
    mkColShow(17380),
    mkColShow(32390),
    // Bravo › Vanderpump Rules (Vanderpump Rules + The Valley = 2)
    mkColShow(61581),
    mkColShow(247758),
    // The Valley: Persian Style — standalone, no family
    mkColShow(290884),
  ];

  it("indexes 9-1-1, Real Housewives, Vanderpump Rules, and the Bravo parent", () => {
    const names = indexableTvCollectionNames(shows);
    expect(names).toEqual(
      expect.arrayContaining([
        "9-1-1",
        "The Real Housewives",
        "Vanderpump Rules",
        "Bravo",
      ]),
    );
  });

  it("derives the Bravo parent count as the union of its subcollections", () => {
    const bravo = indexableTvCollections(shows).find((c) => c.name === "Bravo");
    // 2 Real Housewives + 2 Vanderpump Rules = 4, none double-counted.
    expect(bravo?.count).toBe(4);
    expect(bravo?.parent).toBeUndefined();
  });

  it("a subcollection show also belongs to its parent (The Valley → Bravo)", () => {
    const bravoIds = showsInTvFamily(shows, "bravo").map((s) => s.id);
    expect(bravoIds).toContain("tmdb-tv-247758"); // The Valley
    const vprIds = showsInTvFamily(shows, "vanderpump-rules").map((s) => s.id);
    expect(vprIds).toContain("tmdb-tv-247758");
    expect(vprIds).not.toContain("tmdb-tv-290884"); // Persian Style standalone
  });

  it("an un-curated show belongs to no routable family", () => {
    expect(showsInTvFamily(shows, "bravo").map((s) => s.id)).not.toContain(
      "tmdb-tv-290884",
    );
  });
});

describe("tv collections — route floor (≥2) excludes thin families", () => {
  // Only one Real Housewives show logged: the family (and, alone, Bravo)
  // falls below the floor.
  const shows = [mkColShow(17380)];
  it("a 1-show family gets no route", () => {
    expect(indexableTvCollectionNames(shows)).toEqual([]);
  });
});

// ─── Facet-route → filter-replay resolvers (shared by the facet routes AND
//     the detail-page neighbour resolvers) ───────────────────────────────

describe("facetForBasePath — URL segment → facet key", () => {
  it("maps every film basePath back to its facet, round-trip", () => {
    for (const [facet, bp] of Object.entries(FILM_FACET_BASEPATH)) {
      expect(filmFacetForBasePath(bp)).toBe(facet);
    }
  });
  it("maps every tv basePath back to its facet, round-trip", () => {
    for (const [facet, bp] of Object.entries(TV_FACET_BASEPATH)) {
      expect(tvFacetForBasePath(bp)).toBe(facet);
    }
  });
  it("returns null for non-facet segments (genre, collections, junk)", () => {
    expect(filmFacetForBasePath("genre")).toBeNull();
    expect(filmFacetForBasePath("collections")).toBeNull();
    expect(tvFacetForBasePath("collections")).toBeNull();
    expect(tvFacetForBasePath("nonsense")).toBeNull();
  });
});

describe("film pin key is identity (slug-based pinning)", () => {
  it("each facet pins its own FilmFilters key", () => {
    expect(FILM_FACET_PIN_KEY.actors).toBe("actors");
    expect(FILM_FACET_PIN_KEY.directors).toBe("directors");
    expect(FILM_FACET_PIN_KEY.studios).toBe("studios");
  });
});

describe("tv pin config — name-based vs slug-based", () => {
  it("network + type pin by canonical name; others by slug", () => {
    expect(TV_FACET_PIN.networks.nameBased).toBe(true);
    expect(TV_FACET_PIN.types.nameBased).toBe(true);
    expect(TV_FACET_PIN.actors.nameBased).toBeUndefined();
    expect(TV_FACET_PIN.creators.pinKey).toBe("creators");
  });
});

describe("resolveFilmFacet / resolveTvFacet — slug → canonical name among indexables", () => {
  const films = [
    mkFilm("a", 2010, "Greta Gerwig"),
    mkFilm("b", 2017, "Greta Gerwig"),
    mkFilm("c", 2019, "Greta Gerwig"), // count 3 → indexable
    mkFilm("d", 2020, "One Hit Wonder"), // count 1 → sub-floor
  ];
  it("resolves an indexable slug to its name + count", () => {
    expect(resolveFilmFacet("directors", films, "greta-gerwig")).toEqual({
      name: "Greta Gerwig",
      count: 3,
    });
  });
  it("returns null for a sub-floor (non-routable) slug", () => {
    expect(resolveFilmFacet("directors", films, "one-hit-wonder")).toBeNull();
  });
  it("returns null for an unknown slug", () => {
    expect(resolveFilmFacet("directors", films, "nobody")).toBeNull();
  });
  it("tv: resolves a name-based network slug to its canonical name", () => {
    const shows = Array.from({ length: 5 }, (_, i) =>
      mkShow(`hbo-${i}`, 2018, { type: "Scripted", networks: ["HBO"] }),
    );
    const hbo = primaryNetwork(["HBO"])!;
    expect(resolveTvFacet("networks", shows, slugify(hbo))?.name).toBe(hbo);
  });
});

describe("collection member comparators — release/premiere year asc, then title/name", () => {
  it("film: orders by release year asc, ties broken by title", () => {
    const a = { releaseYear: 2014, title: "B" } as unknown as Film;
    const b = { releaseYear: 2017, title: "A" } as unknown as Film;
    const c = { releaseYear: 2014, title: "A" } as unknown as Film;
    expect([a, b, c].sort(filmCollectionMemberSort).map((f) => f.title)).toEqual([
      "A",
      "B",
      "A",
    ]);
    expect([b, a].sort(filmCollectionMemberSort)[0].releaseYear).toBe(2014);
  });
  it("tv: orders by premiere year asc, ties broken by name", () => {
    const a = { premiereYear: 2020, name: "Z" } as unknown as Show;
    const b = { premiereYear: 2012, name: "Q" } as unknown as Show;
    expect([a, b].sort(tvCollectionMemberSort).map((s) => s.name)).toEqual([
      "Q",
      "Z",
    ]);
  });
});

// Local slugify mirroring slugifyEntity for the network test above.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Rail curation (floors reused for the sidebar, named facets only) ──
// The curated rail wrappers reuse the LOCKED indexation floors to trim the
// long tail off ONLY the facets Malcolm named (language + country both
// clusters; network TV). Every other rail must pass through untouched. The
// search omnibox stays full — only the rail is curated.

describe("curatedFilmEntityFacets (floors language + country, rest untouched)", () => {
  // 7 films: English×3 / French×2 / German×2; US×5 / Germany×2.
  // Film floors: languages ≥3, countries ≥5.
  const films = [
    mkFilm("a", 2015, null, { language: "en", country: "US" }),
    mkFilm("b", 2016, null, { language: "en", country: "US" }),
    mkFilm("c", 2017, null, { language: "en", country: "US" }),
    mkFilm("d", 2018, null, { language: "fr", country: "US" }),
    mkFilm("e", 2019, null, { language: "fr", country: "US" }),
    mkFilm("f", 2020, null, { language: "de", country: "DE" }),
    mkFilm("g", 2021, null, { language: "de", country: "DE" }),
  ];
  const full = filmEntityFacets(films);
  const curated = curatedFilmEntityFacets(films);

  it("keeps only languages at/above the floor", () => {
    const lang = curated.find((g) => g.key === "languages")!;
    // English (3) clears the floor of 3; French (2) and German (2) don't.
    expect(lang.options.every(([, c]) => c >= FILM_FACET_FLOORS.languages)).toBe(
      true,
    );
    expect(lang.options.map(([n]) => n)).toEqual(["English"]);
  });

  it("keeps only countries at/above the floor", () => {
    const country = curated.find((g) => g.key === "countries")!;
    // US (5) clears the floor of 5; Germany (2) doesn't.
    expect(
      country.options.every(([, c]) => c >= FILM_FACET_FLOORS.countries),
    ).toBe(true);
    expect(country.options.map(([n]) => n)).toEqual(["United States"]);
  });

  it("leaves every non-floored rail byte-identical to the full set", () => {
    for (const g of curated) {
      if (g.key === "languages" || g.key === "countries") continue;
      const fullGroup = full.find((f) => f.key === g.key)!;
      expect(g).toEqual(fullGroup);
    }
  });

  it("is a subset of the full rail (never invents options)", () => {
    for (const g of curated) {
      const fullGroup = full.find((f) => f.key === g.key)!;
      const fullNames = new Set(fullGroup.options.map(([n]) => n));
      expect(g.options.every(([n]) => fullNames.has(n))).toBe(true);
    }
  });
});

describe("curatedShowEntityFacets (floors language + country, rest untouched)", () => {
  // TV floors: languages ≥2, countries ≥3.
  const shows = [
    mkShow("a", 2015, { type: "Scripted", networks: ["HBO"] }, {
      language: "en",
      country: "US",
    }),
    mkShow("b", 2016, { type: "Scripted", networks: ["HBO"] }, {
      language: "en",
      country: "US",
    }),
    mkShow("c", 2017, { type: "Scripted", networks: ["HBO"] }, {
      language: "en",
      country: "US",
    }),
    mkShow("d", 2018, { type: "Scripted", networks: ["BBC"] }, {
      language: "ko",
      country: "KR",
    }),
  ];
  const full = showEntityFacets(shows);
  const curated = curatedShowEntityFacets(shows);

  it("floors languages and countries to the TV thresholds", () => {
    const lang = curated.find((g) => g.key === "languages")!;
    const country = curated.find((g) => g.key === "countries")!;
    expect(lang.options.every(([, c]) => c >= TV_FACET_FLOORS.languages)).toBe(
      true,
    );
    expect(
      country.options.every(([, c]) => c >= TV_FACET_FLOORS.countries),
    ).toBe(true);
    // English (3) and US (3) clear; Korean (1) and South Korea (1) don't.
    expect(lang.options.map(([n]) => n)).toEqual(["English"]);
    expect(country.options.map(([n]) => n)).toEqual(["United States"]);
  });

  it("leaves every non-floored rail untouched", () => {
    for (const g of curated) {
      if (g.key === "languages" || g.key === "countries") continue;
      expect(g).toEqual(full.find((f) => f.key === g.key)!);
    }
  });
});

describe("curatedTvRailNetworks (network floor; search stays full)", () => {
  const shows = [
    ...Array.from({ length: 5 }, (_, i) =>
      mkShow(`hbo-${i}`, 2018, { type: "Scripted", networks: ["HBO"] }),
    ),
    ...Array.from({ length: 2 }, (_, i) =>
      mkShow(`nf-${i}`, 2021, { type: "Scripted", networks: ["Netflix"] }),
    ),
  ];
  const full = deriveAvailableNetworks(shows);
  const railed = curatedTvRailNetworks(shows);

  it("drops networks below the floor of 5", () => {
    expect(railed.every(([, c]) => c >= TV_FACET_FLOORS.networks)).toBe(true);
    // HBO (5) survives; Netflix (2) is floored off the rail.
    const names = railed.map(([n]) => n);
    expect(names).toContain(primaryNetwork(["HBO"])!);
    expect(names).not.toContain(primaryNetwork(["Netflix"])!);
  });

  it("is a subset of the full network derivation (which search uses)", () => {
    const fullNames = new Set(full.map(([n]) => n));
    expect(railed.every(([n]) => fullNames.has(n))).toBe(true);
    // The full list still carries the sub-floor network for the omnibox.
    expect(fullNames.has(primaryNetwork(["Netflix"])!)).toBe(true);
  });
});

// ─── makeFilmFacetHref — the ONE value→href resolver both the stats tiles
//     and the detail page consume, so the slug + route-vs-?param= decision
//     can't drift (the ?genre= no-op bug came from two inline copies). ──
describe("makeFilmFacetHref", () => {
  // Writer A sits on three films → clears the writers floor (3) → route.
  // Writer B appears once → sub-floor → ?param= fallback. "Lead Director"
  // rides all three → clears the directors floor (3) → route.
  const corpus = [
    mkFilm("a", 2020, "Lead Director", {
      writers: [
        { id: 1, name: "Writer A" },
        { id: 2, name: "Writer B" },
      ],
    }),
    mkFilm("b", 2021, "Lead Director", { writers: [{ id: 1, name: "Writer A" }] }),
    mkFilm("c", 2022, "Lead Director", { writers: [{ id: 1, name: "Writer A" }] }),
  ];
  const href = makeFilmFacetHref(corpus);

  it("routes an indexable entity to its dedicated facet route", () => {
    expect(href("writers", "Writer A")).toBe("/films/writer/writer-a");
  });

  it("falls back to the noindex ?param= filter for a sub-floor entity", () => {
    expect(href("writers", "Writer B")).toBe("/films/reviews?writer=writer-b");
  });

  it("routes an indexable director but uses the fuzzy ?director= search below floor", () => {
    expect(href("directors", "Lead Director")).toBe(
      "/films/director/lead-director",
    );
    // Sub-floor / unknown director → the fuzzy name search (encoded), NOT a
    // slug param — the exact director facet has no ?param= form.
    expect(href("directors", "Some One")).toBe(
      "/films/reviews?director=Some%20One",
    );
  });

  it("always routes a genre to its dedicated route", () => {
    expect(href("genres", "Science Fiction")).toBe(
      "/films/genre/science-fiction",
    );
  });

  it("uses the ?param= form for facets with no dedicated route", () => {
    expect(href("releaseTypes", "Streaming")).toBe(
      "/films/reviews?releaseType=streaming",
    );
    expect(href("budgetTiers", "Big budget")).toBe(
      "/films/reviews?budgetTier=big-budget",
    );
    expect(href("conglomerates", "Warner Bros. Discovery")).toBe(
      "/films/reviews?conglomerate=warner-bros-discovery",
    );
  });
});

// ─── makeTvFacetHref — the TV sibling: the ONE resolver the /television/stats
//     tiles AND the per-show detail block consume, so the same drift the
//     ?genre= no-op exposed on films can't reappear on television. ──────────
describe("makeTvFacetHref", () => {
  // HBO rides 5 shows → clears the networks floor (5) → route; Netflix on 1 →
  // sub-floor → NAME-based ?network= fallback. "Scripted" on ≥2 → type route;
  // "Documentary" on 1 → name-based type fallback. "Lead Creator" on 2 → the
  // creators floor (2) → route; "Solo Creator" on 1 → slug ?param= fallback.
  const corpus = [
    ...Array.from({ length: 4 }, (_, i) =>
      mkShow(`hbo-${i}`, 2018, { type: "Scripted", networks: ["HBO"] }),
    ),
    mkShow(
      "hbo-lead",
      2019,
      { type: "Scripted", networks: ["HBO"] },
      { creators: [{ id: 1, name: "Lead Creator" }] },
    ),
    mkShow(
      "nf",
      2021,
      { type: "Scripted", networks: ["Netflix"] },
      {
        creators: [
          { id: 1, name: "Lead Creator" },
          { id: 2, name: "Solo Creator" },
        ],
      },
    ),
    mkShow("pbs", 2020, { type: "Documentary", networks: ["PBS"] }),
  ];
  const href = makeTvFacetHref(corpus);
  // The route keys on the canonical PRIMARY network, so derive the expected
  // names the way the gate does rather than hardcoding canon output.
  const hbo = primaryNetwork(["HBO"])!;
  const netflix = primaryNetwork(["Netflix"])!;

  it("routes an indexable network, name-fallbacks a sub-floor one", () => {
    expect(href("networks", hbo)).toBe(`/television/network/${slugify(hbo)}`);
    // Sub-floor network keeps the NAME-based param (encoded, not slugified) —
    // parseShowFilters reads ?network= verbatim.
    expect(href("networks", netflix)).toBe(
      `/television/reviews?network=${encodeURIComponent(netflix)}`,
    );
  });

  it("routes an indexable type, name-fallbacks a sub-floor one", () => {
    expect(href("types", "Scripted")).toBe("/television/type/scripted");
    expect(href("types", "Documentary")).toBe(
      "/television/reviews?type=Documentary",
    );
  });

  it("routes an indexable creator, slug-fallbacks a sub-floor one", () => {
    expect(href("creators", "Lead Creator")).toBe(
      "/television/creator/lead-creator",
    );
    expect(href("creators", "Solo Creator")).toBe(
      "/television/reviews?creator=solo-creator",
    );
  });

  it("always routes a genre to its dedicated route", () => {
    expect(href("genres", "Science Fiction")).toBe(
      "/television/genre/science-fiction",
    );
  });

  it("uses the ?param= form for conglomerate (no dedicated route)", () => {
    expect(href("conglomerates", "Warner Bros. Discovery")).toBe(
      "/television/reviews?conglomerate=warner-bros-discovery",
    );
  });
});
