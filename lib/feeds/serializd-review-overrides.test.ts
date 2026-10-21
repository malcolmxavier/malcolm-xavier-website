// ─────────────────────────────────────────────────────────────────
// Tests for the per-review editorial overrides in
// data/television/overrides.json: gridWithoutProse, undatedReviews,
// notASeason.
//
// The synthetic blocks carry the rules—each override is exercised
// through the pure helpers that read it off `review.overrides`, the
// stamp the snapshot reader applies at load. The live-fixture block
// guards the wiring: that the reader actually stamps what the file
// names, and that the summary the unfiltered pages read is the
// override-aware one rather than whatever the last refresh persisted.
// ─────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseReviewOverrides,
  stampReviewOverrides,
} from "./serializd-review-overrides.mjs";
import { modesForReview } from "./serializd-mode-counts.mjs";
import {
  applyCompletedCardFilters,
  buildCompletedCards,
  countSeasonsFirstWatchedInYear,
  firstWatchesInYearByMode,
  isFirstWatchInYear,
  isSurfacedAsCard,
  makeShowReviewFilter,
  summarizeShows,
  watchedYearSetOf,
  type Review,
  type Show,
  type TvSummary,
} from "./serializd-utils";
import { getShows } from "./serializd";
import { computeTvStats, seasonRating } from "./stats/tv-stats";
import type { EnrichedShow } from "./enrichment";

// ─── Synthetic fixtures ───────────────────────────────────────────

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 1,
    level: "season",
    rating: 4,
    liked: false,
    reviewText: "A review.",
    containsSpoiler: false,
    isRewatch: false,
    isLog: false,
    watchedDate: "2026-03-10T12:00:00Z",
    reviewDate: "2026-03-11T12:00:00Z",
    seasonId: 10,
    episodeNumber: null,
    episodeName: null,
    tags: [],
    ...overrides,
  };
}

/** Minimal show: the helpers touch reviews, seasons, isMiniseries, and
 *  the in-progress list (summarizeShows); the rest is noise here. */
function show(reviews: Review[], extra: Partial<Show> = {}): Show {
  return {
    id: "tmdb-tv-1",
    serializdShowId: 1,
    name: "Show",
    premiereYear: 2020,
    reviews,
    seasons: [
      { serializdId: 10, showId: 1, seasonNumber: 1, name: "Season 1", posterPath: null, episodeCount: 8 },
      { serializdId: 20, showId: 1, seasonNumber: 0, name: "Specials", posterPath: null, episodeCount: 1 },
    ],
    isMiniseries: false,
    inProgressSeasonNumbers: [],
    tmdb: null,
    ...extra,
  } as unknown as Show;
}

const BASE_SUMMARY = {
  totalWatchedShows: 0,
  totalWatchedOnlyShows: 0,
} as TvSummary;

// ─── Parser + stamp ───────────────────────────────────────────────

describe("parseReviewOverrides", () => {
  it("reads the three maps as numeric id sets, skipping comments and non-true values", () => {
    const parsed = parseReviewOverrides({
      gridWithoutProse: { _comment: "x", "11": true, "12": false },
      undatedReviews: { "21": true, nope: true },
      notASeason: { "31": "true" },
    });
    expect([...parsed.gridWithoutProse]).toEqual([11]);
    expect([...parsed.undatedReviews]).toEqual([21]);
    expect([...parsed.notASeason]).toEqual([]);
  });

  it("fails soft on a missing or malformed file", () => {
    for (const raw of [null, undefined, "oops", {}]) {
      const parsed = parseReviewOverrides(raw);
      expect(parsed.gridWithoutProse.size).toBe(0);
      expect(parsed.undatedReviews.size).toBe(0);
      expect(parsed.notASeason.size).toBe(0);
    }
  });

  it("stamps only the named reviews, and replaces any earlier stamp", () => {
    const a = review({ id: 1, overrides: { undatedReviews: true } });
    const b = review({ id: 2 });
    stampReviewOverrides(
      [show([a, b])],
      parseReviewOverrides({ gridWithoutProse: { "2": true }, notASeason: { "2": true } }),
    );
    expect(a.overrides).toBeUndefined();
    expect(b.overrides).toEqual({ gridWithoutProse: true, notASeason: true });
  });
});

// ─── gridWithoutProse ─────────────────────────────────────────────

describe("gridWithoutProse", () => {
  it("builds a card for an allowlisted prose-less Season review", () => {
    const pinned = review({ id: 7, reviewText: "", overrides: { gridWithoutProse: true } });
    const cards = buildCompletedCards([show([pinned])]);
    expect(cards).toHaveLength(1);
    expect(cards[0].review.id).toBe(7);
    expect(cards[0].cardKind).toBe("season");
    expect(cards[0].seasonNumber).toBe(1);
  });

  it("still skips a prose-less review that isn't allowlisted", () => {
    const blank = review({ id: 8, reviewText: "   " });
    expect(buildCompletedCards([show([blank])])).toHaveLength(0);
  });

  it("never turns an episode into a card", () => {
    const ep = review({
      level: "episode",
      episodeNumber: 1,
      reviewText: "",
      overrides: { gridWithoutProse: true },
    });
    expect(buildCompletedCards([show([ep])])).toHaveLength(0);
    expect(isSurfacedAsCard(ep)).toBe(false);
  });

  it("counts toward the card badge exactly when the grid builds the card", () => {
    const reviews = [
      review({ id: 1, reviewText: "Prose." }),
      review({ id: 2, reviewText: "", overrides: { gridWithoutProse: true } }),
      review({ id: 3, reviewText: "" }),
    ];
    expect(reviews.filter(isSurfacedAsCard)).toHaveLength(
      buildCompletedCards([show(reviews)]).length,
    );
    expect(reviews.filter(isSurfacedAsCard)).toHaveLength(2);
  });
});

// ─── undatedReviews ───────────────────────────────────────────────

describe("undatedReviews", () => {
  const undated = review({
    id: 9,
    rating: 4.5,
    watchedDate: "2024-01-01T04:20:00Z",
    overrides: { undatedReviews: true },
  });
  const dated = review({ id: 10, seasonId: 10, watchedDate: "2026-04-19T17:16:06Z" });

  it("never counts as a first watch in its placeholder year", () => {
    expect(isFirstWatchInYear(undated, 2024)).toBe(false);
    expect(countSeasonsFirstWatchedInYear([show([undated, dated])], 2024)).toBe(0);
    expect(countSeasonsFirstWatchedInYear([show([undated, dated])], 2026)).toBe(1);
    expect(firstWatchesInYearByMode([show([undated])], 2024).counts.season).toBe(0);
  });

  it("drops out of watchedYearSet", () => {
    expect(watchedYearSetOf([undated, dated])).toEqual([2026]);
    expect(watchedYearSetOf([{ ...undated, overrides: undefined }, dated])).toEqual([2024, 2026]);
  });

  it("never qualifies under a watched-year or rolling-window filter", () => {
    expect(makeShowReviewFilter({ watchedYears: [2024] })(undated)).toBe(false);
    expect(makeShowReviewFilter({ watchedWindow: "12mo" })(undated)).toBe(false);
    // No date filter active: the review is unaffected.
    expect(makeShowReviewFilter({ ratings: [4.5] })(undated)).toBe(true);

    const s = show([{ ...undated, reviewText: "Prose." }]);
    const cards = buildCompletedCards([s]);
    expect(applyCompletedCardFilters(cards, { watchedYears: [2024] })).toHaveLength(0);
    expect(applyCompletedCardFilters(cards, {})).toHaveLength(1);
  });

  it("keeps its rating everywhere ratings count", () => {
    const summary = summarizeShows([show([undated])], BASE_SUMMARY);
    expect(summary.totalSeasonReviews).toBe(1);
    expect(summary.ratingDistributionByLevel.season).toEqual({ "4.5": 1 });
    expect(summary.ratingDistribution).toEqual({ "4.5": 1 });
    expect(seasonRating({ reviews: [undated], mine: null } as unknown as EnrichedShow)).toBe(4.5);
  });
});

// ─── notASeason ───────────────────────────────────────────────────

describe("notASeason", () => {
  const specials = review({
    id: 11,
    rating: 2,
    seasonId: 20,
    overrides: { notASeason: true },
  });
  const season = review({ id: 12, rating: 4, seasonId: 10 });

  it("drops only the season bucket from the mode rule", () => {
    expect(modesForReview("season", false, true)).toEqual([]);
    expect(modesForReview("season", true, true)).toEqual(["show"]);
    expect(modesForReview("season", false)).toEqual(["season"]);
  });

  it("is out of the season count, distribution, and average, but in the lifetime distribution", () => {
    const summary = summarizeShows([show([specials, season])], BASE_SUMMARY);
    expect(summary.totalSeasonReviews).toBe(1);
    expect(summary.ratingDistributionByLevel.season).toEqual({ "4": 1 });
    expect(summary.ratingDistribution).toEqual({ "2": 1, "4": 1 });
    expect(
      seasonRating({ reviews: [specials, season], mine: null } as unknown as EnrichedShow),
    ).toBe(4);
  });

  it("is out of the first-watch season counts", () => {
    expect(countSeasonsFirstWatchedInYear([show([specials, season])], 2026)).toBe(1);
    expect(firstWatchesInYearByMode([show([specials, season])], 2026).counts.season).toBe(1);
  });

  it("is keyed by review id, not by season 0", () => {
    const otherSpecials = review({ id: 13, seasonId: 20 });
    const summary = summarizeShows([show([otherSpecials])], BASE_SUMMARY);
    expect(summary.totalSeasonReviews).toBe(1);
  });
});

// ─── Live fixture: the reader applies the file ────────────────────

describe("snapshot reader — overrides applied at load", () => {
  const overridesRaw: unknown = JSON.parse(
    readFileSync(path.resolve(process.cwd(), "data/television/overrides.json"), "utf-8"),
  );
  const parsed = parseReviewOverrides(overridesRaw);
  const persisted = JSON.parse(
    readFileSync(
      path.resolve(process.cwd(), "lib/feeds/_fixtures/serializd-snapshot.json"),
      "utf-8",
    ),
  ) as { summary: TvSummary };
  const { shows, summary } = getShows();
  const reviews = shows.flatMap((s) => s.reviews.map((r) => ({ show: s, r })));
  const named = (ids: Set<number>) => reviews.filter(({ r }) => ids.has(r.id));

  it("stamps every review the file names, and no other", () => {
    for (const { r } of reviews) {
      expect(r.overrides?.gridWithoutProse === true).toBe(parsed.gridWithoutProse.has(r.id));
      expect(r.overrides?.undatedReviews === true).toBe(parsed.undatedReviews.has(r.id));
      expect(r.overrides?.notASeason === true).toBe(parsed.notASeason.has(r.id));
    }
  });

  it("serves the override-aware summary, not the persisted one", () => {
    expect(summary).toEqual(summarizeShows(shows, persisted.summary));
  });

  it("builds a card for every allowlisted Show/Season review", () => {
    const cardIds = new Set(buildCompletedCards(shows).map((c) => c.review.id));
    for (const { r } of named(parsed.gridWithoutProse)) {
      if (r.level !== "episode") expect(cardIds.has(r.id)).toBe(true);
    }
  });

  it("keeps undated and notASeason reviews out of the season cadence series", () => {
    const stats = computeTvStats();
    const plotted = stats.temporal.seasonsByWeekday.reduce((n, [, c]) => n + c, 0);
    const firstSeasonWatches = reviews.filter(
      ({ r }) => r.level === "season" && r.watchedDate && !r.isRewatch,
    );
    const pinnedOut = firstSeasonWatches.filter(
      ({ r }) => parsed.undatedReviews.has(r.id) || parsed.notASeason.has(r.id),
    );
    expect(plotted).toBe(firstSeasonWatches.length - pinnedOut.length);
  });
});
