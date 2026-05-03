// ─────────────────────────────────────────────────────────────────
// Tests for the pure helpers in lib/feeds/letterboxd-utils.ts.
//
// Covers the brittle correctness paths a regression would silently
// break:
//   • applyFilters — qualifying-review selection, per-review filter
//     interactions, sort dimensions and tiebreakers, leap-year-safe
//     12-month window
//   • parseFilmFilters / parseFilmSort — URL → typed shape, bounds
//     clamp, mutual exclusion, garbage tolerance
//   • paginate — clamp behavior at empty/over/under
//   • slugifyGenre / findGenreBySlug — the genre-route lookup pair
//   • formatters — rating/runtime/date/year display contracts
//
// Pure-function only — no Node FS, no fetch. The snapshot reading
// path in letterboxd.ts isn't covered here (it'd require fixture
// fs mocking and the snapshot read path is exercised every render
// in dev anyway).
// ─────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import {
  applyFilters,
  findGenreBySlug,
  formatRating,
  formatRuntime,
  formatWatchedDate,
  paginate,
  parseFilmFilters,
  parseFilmSort,
  slugifyGenre,
  yearFromIso,
  type Film,
  type Review,
} from "./letterboxd-utils";

// ─── Fixture factories ───────────────────────────────────────────

/**
 * Build a Review with sensible defaults. Override only the fields
 * that matter for the test so the assertion focus stays on the
 * dimension under test.
 */
function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    watchedDate: "2024-06-15",
    reviewDate: "2024-06-16",
    rating: 4,
    rewatch: false,
    containsSpoilers: false,
    reviewText: "A review.",
    tags: [],
    ...overrides,
  };
}

/**
 * Build a Film with sensible defaults. Reviews default to a single
 * watch event; pass `reviews: [...]` to override. Aggregates derive
 * from the supplied reviews when those defaults would be wrong
 * (firstWatchedDate / latestWatchedDate / primaryRating /
 * watchedYearSet / ratingSet).
 */
function makeFilm(overrides: Partial<Film> = {}): Film {
  const reviews =
    overrides.reviews ??
    [makeReview()];
  // Newest-first by reviewDate (the snapshot writer's invariant).
  const sortedReviews = [...reviews].sort((a, b) =>
    b.reviewDate.localeCompare(a.reviewDate),
  );
  const watchedDates = sortedReviews
    .map((r) => r.watchedDate)
    .sort();
  const ratings = sortedReviews
    .map((r) => r.rating)
    .filter((r): r is number => r !== null);
  const watchedYears = sortedReviews.map((r) =>
    Number.parseInt(r.watchedDate.slice(0, 4), 10),
  );
  return {
    id: "tmdb-100",
    letterboxdSlug: "test-film",
    letterboxdUrl: "https://letterboxd.com/malxavi/film/test-film/",
    title: "Test Film",
    releaseYear: 2024,
    firstWatchedDate: watchedDates[0] ?? "",
    latestWatchedDate: watchedDates[watchedDates.length - 1] ?? "",
    firstReviewDate: sortedReviews[sortedReviews.length - 1]?.reviewDate ?? "",
    latestReviewDate: sortedReviews[0]?.reviewDate ?? "",
    primaryRating: sortedReviews[0]?.rating ?? null,
    liked: false,
    reviews: sortedReviews,
    tmdb: {
      id: 100,
      posterPath: "/test.jpg",
      backdropPath: "/back.jpg",
      genres: ["Drama"],
      runtime: 95,
      director: "Director",
    },
    posterUrl: "https://image.tmdb.org/t/p/w342/test.jpg",
    posterFallbackUrl: "https://image.tmdb.org/t/p/w342/test.jpg",
    ratingSet: [...new Set(ratings)].sort((a, b) => a - b),
    watchedYearSet: [...new Set(watchedYears)].sort((a, b) => a - b),
    ...overrides,
  };
}

// ─── slugifyGenre / findGenreBySlug ──────────────────────────────

describe("slugifyGenre", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugifyGenre("Horror")).toBe("horror");
    expect(slugifyGenre("Science Fiction")).toBe("science-fiction");
    expect(slugifyGenre("TV Movie")).toBe("tv-movie");
  });

  it("strips characters that aren't alphanumeric or hyphen", () => {
    expect(slugifyGenre("Action & Adventure")).toBe("action--adventure");
    expect(slugifyGenre("Sci-Fi!")).toBe("sci-fi");
  });
});

describe("findGenreBySlug", () => {
  const dist = { Horror: 287, Drama: 412, "TV Movie": 4 };

  it("returns the genre name for a matching slug", () => {
    expect(findGenreBySlug(dist, "horror")).toBe("Horror");
    expect(findGenreBySlug(dist, "tv-movie")).toBe("TV Movie");
  });

  it("returns null when no genre matches the slug", () => {
    expect(findGenreBySlug(dist, "comedy")).toBeNull();
    expect(findGenreBySlug({}, "horror")).toBeNull();
  });
});

// ─── parseFilmFilters ────────────────────────────────────────────

describe("parseFilmFilters", () => {
  it("parses rating CSV into numeric set", () => {
    expect(parseFilmFilters({ rating: "4,4.5,5" })).toMatchObject({
      ratings: [4, 4.5, 5],
    });
  });

  it("drops invalid ratings silently (not in the 0.5-step set)", () => {
    // 7 isn't a valid Letterboxd rating; tampering with the URL
    // shouldn't crash the page, it should just drop the bad value.
    expect(parseFilmFilters({ rating: "4,7,foo" })).toMatchObject({
      ratings: [4],
    });
  });

  it("clamps releaseYearMin/Max to [1900, currentYear+5]", () => {
    // 99999 is outside the bound; should drop, not propagate.
    const result = parseFilmFilters({
      releaseYearMin: "99999",
      releaseYearMax: "2020",
    });
    expect(result.releaseYearMin).toBeUndefined();
    expect(result.releaseYearMax).toBe(2020);
  });

  it("rejects releaseYear values below 1900", () => {
    expect(parseFilmFilters({ releaseYearMin: "1850" })).toEqual({});
  });

  it("watchedYears wins over watchedWindow when both present", () => {
    // Discriminated union enforces mutual exclusion at the type
    // level; the parser also has to pick one when URL params are
    // tampered with. watchedYears is more specific.
    const result = parseFilmFilters({
      watchedYear: "2024,2026",
      watchedWindow: "12mo",
    });
    expect(result).toEqual({ watchedYears: [2024, 2026] });
    expect("watchedWindow" in result).toBe(false);
  });

  it("returns empty object on empty input", () => {
    expect(parseFilmFilters({})).toEqual({});
  });

  it("returns watchedWindow alone when only that param is set", () => {
    expect(parseFilmFilters({ watchedWindow: "12mo" })).toEqual({
      watchedWindow: "12mo",
    });
  });
});

// ─── parseFilmSort ───────────────────────────────────────────────

describe("parseFilmSort", () => {
  it("returns the URL value when it's a valid FilmSort", () => {
    expect(parseFilmSort({ sort: "rating-desc" })).toBe("rating-desc");
    expect(parseFilmSort({ sort: "first-review-asc" })).toBe(
      "first-review-asc",
    );
  });

  it("falls back to default for invalid input", () => {
    expect(parseFilmSort({ sort: "bogus" })).toBe("latest-watched-desc");
    expect(parseFilmSort({})).toBe("latest-watched-desc");
  });
});

// ─── applyFilters ────────────────────────────────────────────────

describe("applyFilters — per-film filters", () => {
  it("drops films outside releaseYear range", () => {
    const films = [
      makeFilm({ id: "a", title: "Old", releaseYear: 1995 }),
      makeFilm({ id: "b", title: "New", releaseYear: 2024 }),
    ];
    const out = applyFilters(films, {
      releaseYearMin: 2000,
      releaseYearMax: 2030,
    });
    expect(out.map((f) => f.film.id)).toEqual(["b"]);
  });

  it("drops films whose genres don't intersect the filter set", () => {
    const films = [
      makeFilm({
        id: "h",
        tmdb: {
          ...makeFilm().tmdb!,
          genres: ["Horror"],
        },
      }),
      makeFilm({
        id: "d",
        tmdb: {
          ...makeFilm().tmdb!,
          genres: ["Drama"],
        },
      }),
    ];
    const out = applyFilters(films, { genres: ["Horror"] });
    expect(out.map((f) => f.film.id)).toEqual(["h"]);
  });

  it("perReviewFilterActive=false when only per-film filters are set", () => {
    const films = [makeFilm({ id: "a" })];
    const [applied] = applyFilters(films, { genres: ["Drama"] });
    expect(applied.perReviewFilterActive).toBe(false);
    // qualifyingReview is the most recent review by default.
    expect(applied.qualifyingReview).toBe(films[0].reviews[0]);
    expect(applied.cardRating).toBe(films[0].primaryRating);
  });
});

describe("applyFilters — per-review filters", () => {
  it("ratings filter keeps only films with a matching review", () => {
    const films = [
      makeFilm({
        id: "two-watch",
        reviews: [
          makeReview({ rating: 2, reviewDate: "2024-01-01" }),
          makeReview({ rating: 4, reviewDate: "2024-06-01" }),
        ],
      }),
      makeFilm({
        id: "one-low",
        reviews: [makeReview({ rating: 2, reviewDate: "2024-03-01" })],
      }),
    ];
    const out = applyFilters(films, { ratings: [4] });
    expect(out.map((f) => f.film.id)).toEqual(["two-watch"]);
  });

  it("qualifyingReview is the most recent review that satisfies the filter", () => {
    const films = [
      makeFilm({
        id: "rewatched",
        reviews: [
          // Newest first — index 0 is a 2★ rewatch in 2025;
          // index 1 is a 4★ original watch in 2024. Filter
          // ratings=4 should pick index 1.
          makeReview({
            rating: 2,
            reviewDate: "2025-04-01",
            watchedDate: "2025-04-01",
            rewatch: true,
          }),
          makeReview({
            rating: 4,
            reviewDate: "2024-06-01",
            watchedDate: "2024-06-01",
          }),
        ],
      }),
    ];
    const [applied] = applyFilters(films, { ratings: [4] });
    expect(applied.qualifyingReview?.rating).toBe(4);
    expect(applied.cardRating).toBe(4);
    expect(applied.positionDate).toBe("2024-06-01");
    expect(applied.perReviewFilterActive).toBe(true);
  });

  it("watchedYears filter matches review.watchedDate (not reviewDate)", () => {
    // Festival/diary-lag case: watched 2024, reviewed 2025. The
    // filter should match watchedYears=[2024], not [2025].
    const films = [
      makeFilm({
        id: "festival",
        reviews: [
          makeReview({
            watchedDate: "2024-09-15",
            reviewDate: "2025-03-01",
            rating: 5,
          }),
        ],
      }),
    ];
    expect(
      applyFilters(films, { watchedYears: [2024] }).map((f) => f.film.id),
    ).toEqual(["festival"]);
    expect(
      applyFilters(films, { watchedYears: [2025] }).map((f) => f.film.id),
    ).toEqual([]);
  });

  it("watchedWindow=12mo uses calendar-year subtraction (leap-safe)", () => {
    // Anchor "now" to 2025-02-28 so the 12mo cutoff is 2024-02-28.
    // A watch on 2024-02-29 would fall outside a 365-day window
    // (which would compute 2024-03-01) but should be inside the
    // calendar-year window (2024-02-28 ≤ 2024-02-29).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-28T12:00:00Z"));
    try {
      const films = [
        makeFilm({
          id: "leap",
          reviews: [
            makeReview({ watchedDate: "2024-02-29", reviewDate: "2024-02-29" }),
          ],
        }),
      ];
      const out = applyFilters(films, { watchedWindow: "12mo" });
      expect(out.map((f) => f.film.id)).toEqual(["leap"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops films whose reviews are all outside the watchedWindow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T00:00:00Z"));
    try {
      const films = [
        makeFilm({
          id: "old",
          reviews: [
            makeReview({ watchedDate: "2020-01-01", reviewDate: "2020-01-01" }),
          ],
        }),
      ];
      expect(applyFilters(films, { watchedWindow: "12mo" })).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("applyFilters — sort dimensions", () => {
  const films = [
    makeFilm({
      id: "a",
      releaseYear: 2020,
      reviews: [
        makeReview({
          watchedDate: "2024-06-01",
          reviewDate: "2024-06-01",
          rating: 5,
        }),
      ],
    }),
    makeFilm({
      id: "b",
      releaseYear: 2024,
      reviews: [
        makeReview({
          watchedDate: "2025-01-01",
          reviewDate: "2025-01-01",
          rating: 3,
        }),
      ],
    }),
    makeFilm({
      id: "c",
      releaseYear: 2018,
      reviews: [
        makeReview({
          watchedDate: "2023-09-01",
          reviewDate: "2023-09-01",
          rating: 4,
        }),
      ],
    }),
  ];

  it("latest-watched-desc orders newest-watched first", () => {
    const out = applyFilters(films, {}, "latest-watched-desc");
    expect(out.map((f) => f.film.id)).toEqual(["b", "a", "c"]);
  });

  it("rating-desc orders highest-rated first", () => {
    const out = applyFilters(films, {}, "rating-desc");
    expect(out.map((f) => f.film.id)).toEqual(["a", "c", "b"]);
  });

  it("rating-desc tiebreaks equal ratings by latestWatchedDate desc", () => {
    const tied = [
      makeFilm({
        id: "older-tie",
        reviews: [
          makeReview({
            watchedDate: "2023-01-01",
            reviewDate: "2023-01-01",
            rating: 4,
          }),
        ],
      }),
      makeFilm({
        id: "newer-tie",
        reviews: [
          makeReview({
            watchedDate: "2025-01-01",
            reviewDate: "2025-01-01",
            rating: 4,
          }),
        ],
      }),
    ];
    const out = applyFilters(tied, {}, "rating-desc");
    expect(out.map((f) => f.film.id)).toEqual(["newer-tie", "older-tie"]);
  });

  it("rating-asc puts unrated films at the bottom (not top)", () => {
    const mixed = [
      makeFilm({
        id: "rated-low",
        reviews: [makeReview({ rating: 1 })],
      }),
      makeFilm({
        id: "unrated",
        reviews: [makeReview({ rating: null })],
        primaryRating: null,
      }),
    ];
    const out = applyFilters(mixed, {}, "rating-asc");
    expect(out.map((f) => f.film.id)).toEqual(["rated-low", "unrated"]);
  });

  it("release-year-desc orders by releaseYear", () => {
    const out = applyFilters(films, {}, "release-year-desc");
    expect(out.map((f) => f.film.id)).toEqual(["b", "a", "c"]);
  });
});

// ─── paginate ────────────────────────────────────────────────────

describe("paginate", () => {
  it("returns the requested slice with metadata", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const result = paginate(items, 2, 10);
    expect(result.current).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(result.totalPages).toBe(3);
    expect(result.totalResults).toBe(25);
    expect(result.page).toBe(2);
  });

  it("clamps an over-requested page to totalPages", () => {
    const items = [1, 2, 3, 4, 5];
    const result = paginate(items, 99, 2);
    expect(result.page).toBe(3);
    expect(result.current).toEqual([5]);
  });

  it("clamps page < 1 to 1", () => {
    const result = paginate([1, 2, 3], 0, 2);
    expect(result.page).toBe(1);
    expect(result.current).toEqual([1, 2]);
  });

  it("returns totalPages=1 for empty input", () => {
    const result = paginate([], 1, 10);
    expect(result.totalPages).toBe(1);
    expect(result.totalResults).toBe(0);
    expect(result.current).toEqual([]);
  });
});

// ─── Formatters ──────────────────────────────────────────────────

describe("formatRating", () => {
  it("renders integer ratings as solid stars", () => {
    expect(formatRating(3)).toBe("★★★");
    expect(formatRating(5)).toBe("★★★★★");
  });

  it("appends ½ for half-step ratings", () => {
    expect(formatRating(3.5)).toBe("★★★½");
    expect(formatRating(0.5)).toBe("½");
  });

  it("returns null for unrated (not empty string)", () => {
    // Convention: null in == null out. An empty string would
    // create a zero-width DOM text node and confuse equality
    // checks downstream.
    expect(formatRating(null)).toBeNull();
  });
});

describe("formatRuntime", () => {
  it("renders sub-hour as Nm", () => {
    expect(formatRuntime(45)).toBe("45m");
    expect(formatRuntime(59)).toBe("59m");
  });

  it("renders hour-only when minutes are zero", () => {
    expect(formatRuntime(60)).toBe("1h");
    expect(formatRuntime(180)).toBe("3h");
  });

  it("renders hours and minutes for mixed durations", () => {
    expect(formatRuntime(95)).toBe("1h 35m");
    expect(formatRuntime(135)).toBe("2h 15m");
  });

  it("returns empty string for null", () => {
    expect(formatRuntime(null)).toBe("");
  });
});

describe("formatWatchedDate", () => {
  it("formats a date-only ISO as 'Mon D, YYYY' in UTC", () => {
    // UTC anchoring: a server west of GMT must NOT shift this to
    // the previous day. The function forces timeZone: "UTC" for
    // exactly this reason.
    expect(formatWatchedDate("2026-04-30")).toBe("Apr 30, 2026");
    expect(formatWatchedDate("2024-02-29")).toBe("Feb 29, 2024");
  });
});

describe("yearFromIso", () => {
  it("returns the UTC year of an ISO date", () => {
    expect(yearFromIso("2026-01-01")).toBe(2026);
    expect(yearFromIso("1999-12-31")).toBe(1999);
  });
});
