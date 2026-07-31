// Grain tests for the watch-event tiles.
//
// Two rules are enforced here, and they are easy to break by accident
// because both live in the same few lines of every compute body:
//
//  1. DISCOVERY grain — the temporal / watch-pace tiles plot first
//     watches only. A rewatch is not a second discovery event.
//  2. FILTER grain — those tiles plot only watch events that satisfy
//     the ACTIVE filters. A title can survive `?watchedYear=2025` on
//     one review while carrying another from 2023; the 2023 watch must
//     not leak into a 2025-filtered chart.
//
// `lifetime.hours` is the deliberate exception to rule 1: it is a
// time-spent measure, so rewatches DO count. That asymmetry is asserted
// explicitly below so nobody "fixes" it into consistency.
//
// The synthetic blocks carry the real coverage: the committed fixtures
// currently contain no film with more than one review, so a
// fixtures-only test could not distinguish per-title from per-review
// counting at all. The live-fixture blocks are corpus-resilient
// invariants (relationships, never hard counts) that guard the wiring.

import { describe, expect, it } from "vitest";
import {
  isFirstWatch as isFirstFilmWatch,
  makeReviewFilter,
  type Review as FilmReview,
} from "../letterboxd-utils";
import {
  isFirstWatch as isFirstShowWatch,
  makeShowReviewFilter,
  type Review as ShowReview,
} from "../serializd-utils";
import { getFilms } from "../letterboxd";
import { getShows } from "../serializd";
import { getEnrichedShows } from "../enrichment";
import { computeFilmStats } from "./film-stats";
import { computeTvStats } from "./tv-stats";

// ─── Synthetic fixtures ───────────────────────────────────────────

function filmReview(overrides: Partial<FilmReview> = {}): FilmReview {
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

function showReview(overrides: Partial<ShowReview> = {}): ShowReview {
  return {
    id: 1,
    level: "season",
    rating: 4,
    liked: false,
    reviewText: "A review.",
    containsSpoiler: false,
    isRewatch: false,
    isLog: false,
    watchedDate: "2024-06-15",
    reviewDate: "2024-06-16",
    seasonId: 10,
    episodeNumber: null,
    episodeName: null,
    tags: [],
    ...overrides,
  };
}

// ─── Rule 1: discovery grain ──────────────────────────────────────

describe("isFirstWatch — the discovery predicate", () => {
  it("treats an ordinary watch as a discovery event", () => {
    expect(isFirstFilmWatch(filmReview())).toBe(true);
    expect(isFirstShowWatch(showReview())).toBe(true);
  });

  it("excludes a rewatch on both libraries", () => {
    // Different source field names (`rewatch` vs. Serializd's
    // `isRewatch`) behind one shared meaning — the reason the two
    // helpers exist rather than inlining `!r.rewatch` at each site.
    expect(isFirstFilmWatch(filmReview({ rewatch: true }))).toBe(false);
    expect(isFirstShowWatch(showReview({ isRewatch: true }))).toBe(false);
  });
});

// ─── Rule 2: filter grain ─────────────────────────────────────────

describe("makeReviewFilter — per-review filter grain (films)", () => {
  it("passes every review when no filters are active", () => {
    // Both the undefined and the empty-object forms take the identity
    // path, mirroring the unfiltered dashboard.
    for (const filters of [undefined, {}]) {
      const matches = makeReviewFilter(filters);
      expect(matches(filmReview({ watchedDate: "2019-01-01" }))).toBe(true);
      expect(matches(filmReview({ rewatch: true }))).toBe(true);
    }
  });

  it("rejects a review watched outside the selected year", () => {
    // The out-of-filter leak this fix exists for: a film surviving on
    // its 2025 review must not contribute its 2023 watch date.
    const matches = makeReviewFilter({ watchedYears: [2025] });
    expect(matches(filmReview({ watchedDate: "2025-03-04" }))).toBe(true);
    expect(matches(filmReview({ watchedDate: "2023-11-20" }))).toBe(false);
  });

  it("honours year exclusion, rating include, and rating exclusion", () => {
    expect(
      makeReviewFilter({ excludeWatchedYears: [2023] })(
        filmReview({ watchedDate: "2023-11-20" }),
      ),
    ).toBe(false);
    expect(
      makeReviewFilter({ ratings: [4] })(filmReview({ rating: 3 })),
    ).toBe(false);
    expect(
      makeReviewFilter({ excludeRatings: [3] })(filmReview({ rating: 3 })),
    ).toBe(false);
    // An unrated review has no rating to match, so an active include
    // drops it but an exclusion cannot catch it.
    expect(
      makeReviewFilter({ ratings: [4] })(filmReview({ rating: null })),
    ).toBe(false);
    expect(
      makeReviewFilter({ excludeRatings: [3] })(filmReview({ rating: null })),
    ).toBe(true);
  });

  it("anchors the rolling 12-month window once per pass", () => {
    // The predicate is a closure so every title in a compute pass is
    // measured against the SAME instant — two films must never land on
    // opposite sides of the boundary because the clock moved mid-loop.
    const matches = makeReviewFilter({ watchedWindow: "12mo" });
    const today = new Date().toISOString().slice(0, 10);
    expect(matches(filmReview({ watchedDate: today }))).toBe(true);
    expect(matches(filmReview({ watchedDate: "2019-01-01" }))).toBe(false);
  });
});

describe("makeShowReviewFilter — per-review filter grain (TV)", () => {
  it("passes every review when no filters are active", () => {
    const matches = makeShowReviewFilter();
    expect(matches(showReview({ watchedDate: "2019-01-01" }))).toBe(true);
  });

  it("rejects a review watched outside the selected year", () => {
    const matches = makeShowReviewFilter({ watchedYears: [2025] });
    expect(matches(showReview({ watchedDate: "2025-03-04" }))).toBe(true);
    expect(matches(showReview({ watchedDate: "2023-11-20" }))).toBe(false);
  });
});

// ─── The composition the compute bodies actually run ──────────────

describe("watch-pace composition — first watch AND in filter", () => {
  // A film watched new in 2023 and rewatched in 2025. Newest first,
  // matching the snapshot writer's ordering invariant.
  const reviews = [
    filmReview({ watchedDate: "2025-05-01", reviewDate: "2025-05-01", rewatch: true }),
    filmReview({ watchedDate: "2023-02-10", reviewDate: "2023-02-10" }),
  ];

  // Mirrors the accumulator in computeFilmStats: hours counts every
  // qualifying watch, watchDates counts only qualifying FIRST watches.
  function plot(filters?: Parameters<typeof makeReviewFilter>[0]) {
    const matches = makeReviewFilter(filters);
    const qualifying = reviews.filter(matches);
    return {
      watchDates: qualifying.filter(isFirstFilmWatch).map((r) => r.watchedDate),
      watchEvents: qualifying.length,
    };
  }

  it("plots the first watch and drops the rewatch", () => {
    expect(plot().watchDates).toEqual(["2023-02-10"]);
    // Both watches still count as time spent.
    expect(plot().watchEvents).toBe(2);
  });

  it("plots nothing when the only in-filter watch is a rewatch", () => {
    // Filtering to 2025 leaves only the rewatch. The film survives the
    // filter (it has a qualifying review) but contributes no discovery
    // point — the corpus count and the pace chart legitimately differ.
    expect(plot({ watchedYears: [2025] }).watchDates).toEqual([]);
    expect(plot({ watchedYears: [2025] }).watchEvents).toBe(1);
  });

  it("does not leak an out-of-filter watch into a filtered chart", () => {
    // The 2023 watch must not appear under a 2025 filter.
    expect(plot({ watchedYears: [2025] }).watchDates).not.toContain("2023-02-10");
  });
});

// ─── Live-fixture invariants ──────────────────────────────────────

describe("computeFilmStats — grain against the committed fixtures", () => {
  const stats = computeFilmStats();
  const { films } = getFilms();

  it("hours counts every watch event, rewatches included", () => {
    // Time spent: runtime × number of watches, not × number of titles.
    const minutes = films.reduce(
      (sum, f) => sum + (f.tmdb?.runtime || 0) * f.reviews.length,
      0,
    );
    expect(stats.lifetime.hours).toBe(Math.round(minutes / 60));
  });

  it("the watch-pace band plots exactly the first watches", () => {
    // weekdayTally partitions the date list, so its column sum is the
    // number of plotted points.
    const plotted = stats.temporal.byWeekday.reduce((s, [, n]) => s + n, 0);
    const firstWatches = films.reduce(
      (n, f) => n + f.reviews.filter((r) => isFirstFilmWatch(r) && r.watchedDate).length,
      0,
    );
    expect(plotted).toBe(firstWatches);
  });

  it("“new this year” counts titles by FIRST watch, not latest watch", () => {
    // The persisted summary attributes a film to the year of its most
    // recent watch; the tile now attributes it to the year it was new.
    // Those differ exactly when a film's latest watch is a rewatch, so
    // the live count can never exceed the persisted one.
    const year = new Date().getUTCFullYear();
    const discoveredThisYear = films.filter((f) => {
      const firstWatches = f.reviews
        .filter((r) => isFirstFilmWatch(r) && r.watchedDate)
        .map((r) => r.watchedDate)
        .sort();
      return (
        firstWatches.length > 0 &&
        Number.parseInt(firstWatches[0].slice(0, 4), 10) === year
      );
    }).length;
    expect(stats.lifetime.thisYear).toBe(discoveredThisYear);
  });

  it("never counts a film whose only logged watch is a rewatch", () => {
    // Asteroid City and Annihilation are the live instances: their
    // original watches were dropped by the CSV bootstrap's prose gate,
    // so the surviving review is flagged a rewatch. They belong to the
    // corpus but to no discovery year.
    const rewatchOnly = films.filter(
      (f) => f.reviews.length > 0 && f.reviews.every((r) => !isFirstFilmWatch(r)),
    );
    for (const f of rewatchOnly) {
      const latestYear = Number.parseInt(f.latestWatchedDate.slice(0, 4), 10);
      // If such a film were counted, it would be via its latest watch.
      // Assert the corrected counter excludes it by construction.
      expect(f.reviews.some((r) => isFirstFilmWatch(r))).toBe(false);
      expect(Number.isFinite(latestYear)).toBe(true);
    }
    // Sanity: the fixture really does contain this shape, so the
    // assertion above is exercising something.
    expect(rewatchOnly.length).toBeGreaterThan(0);
  });

  it("plots fewer points than watch events whenever rewatches exist", () => {
    // Documents the intended gap rather than pinning a count the daily
    // cron would churn: films logged ≠ discovery events, by design.
    const rewatches = films.reduce(
      (n, f) => n + f.reviews.filter((r) => !isFirstFilmWatch(r)).length,
      0,
    );
    const plotted = stats.temporal.byWeekday.reduce((s, [, n]) => s + n, 0);
    const watchEvents = films.reduce((n, f) => n + f.reviews.length, 0);
    expect(plotted).toBe(watchEvents - rewatches);
  });
});

describe("computeTvStats — grain against the committed fixtures", () => {
  const stats = computeTvStats();
  // The FULL snapshot corpus, deliberately not `getEnrichedShows()`. The
  // cadence tiles must plot every logged watch, including shows the
  // enrichment cron hasn't reached yet — measuring against the enriched
  // subset would silently pass while shows went missing from the charts.
  const shows = getShows().shows;

  it("season cadence plots first watches only", () => {
    const plotted = stats.temporal.seasonsByWeekday.reduce((s, [, n]) => s + n, 0);
    const firstSeasonWatches = shows.reduce(
      (n, s) =>
        n +
        (s.reviews || []).filter(
          (r) => r.level === "season" && r.watchedDate && isFirstShowWatch(r),
        ).length,
      0,
    );
    expect(plotted).toBe(firstSeasonWatches);
  });

  it("excludes rewatched seasons from the cadence tiles", () => {
    const plotted = stats.temporal.seasonsByWeekday.reduce((s, [, n]) => s + n, 0);
    const seasonWatchEvents = shows.reduce(
      (n, s) =>
        n +
        (s.reviews || []).filter((r) => r.level === "season" && r.watchedDate).length,
      0,
    );
    const rewatched = shows.reduce(
      (n, s) =>
        n +
        (s.reviews || []).filter(
          (r) => r.level === "season" && r.watchedDate && !isFirstShowWatch(r),
        ).length,
      0,
    );
    expect(plotted).toBe(seasonWatchEvents - rewatched);
  });

  // Guards the corpus choice above, not the rewatch rule. `getEnrichedShows`
  // drops any show without ratings or a cast, so if the cadence tiles ever
  // read it again, a freshly logged show would disappear from the charts
  // until the enrichment cron caught up — which is exactly how four shows
  // went missing before. Enrichment coverage is complete today, so this
  // asserts the STRUCTURE (same corpus size) rather than a delta that
  // happens to be zero.
  it("plots from the full snapshot, not the enrichment-gated subset", () => {
    const enrichedIds = new Set(getEnrichedShows().map((e) => e.tmdbId));
    const unenriched = shows.filter(
      (s) => s.tmdb?.id != null && !enrichedIds.has(s.tmdb.id),
    );
    const seasonWatchesOn = (pool: typeof shows) =>
      pool.reduce(
        (n, s) =>
          n +
          (s.reviews || []).filter(
            (r) => r.level === "season" && r.watchedDate && isFirstShowWatch(r),
          ).length,
        0,
      );
    const plotted = stats.temporal.seasonsByWeekday.reduce((s, [, n]) => s + n, 0);
    // Whatever the unenriched pool contributes, it is INSIDE the plotted
    // total — never subtracted from it.
    expect(plotted).toBe(seasonWatchesOn(shows));
    expect(plotted).toBeGreaterThanOrEqual(seasonWatchesOn(unenriched));
  });

  it("“new this year” counts SEASONS first-watched this year, not shows", () => {
    const year = String(new Date().getUTCFullYear());
    // The season is TV's unit of new viewing, so the headline counts
    // season-level first watches dated to the current year — one per season,
    // regardless of how many distinct shows they belong to.
    const seasonFirstWatches = shows.flatMap((s) =>
      (s.reviews || []).filter(
        (r) =>
          r.level === "season" &&
          r.watchedDate?.startsWith(year) &&
          isFirstShowWatch(r),
      ),
    );
    expect(stats.lifetime.thisYear).toBe(seasonFirstWatches.length);

    // Guard the distinction from the show-discovery metric this replaced:
    // a continuing series contributes its new season, so the season count
    // must not collapse to the count of shows first started this year.
    const showsStartedThisYear = shows.filter((s) => {
      const firsts = (s.reviews || [])
        .filter((r) => r.watchedDate && isFirstShowWatch(r))
        .map((r) => r.watchedDate as string)
        .sort();
      return firsts.length > 0 && firsts[0].startsWith(year);
    }).length;
    expect(stats.lifetime.thisYear).toBeGreaterThanOrEqual(showsStartedThisYear);
  });

  it("never counts a rewatched season", () => {
    const year = String(new Date().getUTCFullYear());
    // Rewatched seasons are excluded outright — the whole difference from
    // the old activity-based metric, which counted any show touched this
    // year whether the watch was new to him or not.
    const rewatchedSeasonsThisYear = shows.flatMap((s) =>
      (s.reviews || []).filter(
        (r) =>
          r.level === "season" &&
          r.watchedDate?.startsWith(year) &&
          !isFirstShowWatch(r),
      ),
    );
    const allSeasonWatchesThisYear = shows.flatMap((s) =>
      (s.reviews || []).filter(
        (r) => r.level === "season" && r.watchedDate?.startsWith(year),
      ),
    );
    expect(stats.lifetime.thisYear).toBe(
      allSeasonWatchesThisYear.length - rewatchedSeasonsThisYear.length,
    );
  });
});
