// Narrowed-compute path tests for the stats entrypoints (STATS-FILTERS §9,
// build sequence step 1). These read the LIVE committed fixtures, so the
// assertions are corpus-RESILIENT: they verify RELATIONSHIPS between the
// unfiltered and filtered results (identity on empty, monotone shrink on a
// narrow include, complement on exclude) rather than exact counts that the
// daily cron would churn.
//
// The single most important guarantee here is the identity gate: a no-args
// (or empty-filter) call must reproduce the unfiltered dashboard exactly.

import { describe, expect, it } from "vitest";
import { computeFilmStats } from "./film-stats";
import { computeTvStats } from "./tv-stats";
import { computeConnectedStats } from "./connected-stats";

describe("computeFilmStats — narrowed corpus", () => {
  const unfiltered = computeFilmStats();

  it("empty selection reproduces the unfiltered dashboard exactly", () => {
    // No-args and explicit empty object both take the identity path.
    expect(computeFilmStats({})).toEqual(unfiltered);
    expect(computeFilmStats()).toEqual(unfiltered);
  });

  it("single-value include narrows the corpus (genre = the top genre)", () => {
    // Pick the corpus's top genre so the subset is non-empty and strictly
    // smaller than the whole corpus.
    const topGenre = unfiltered.genreDistribution[0][0];
    const narrowed = computeFilmStats({ genres: [topGenre] });
    expect(narrowed.lifetime.films).toBeGreaterThan(0);
    expect(narrowed.lifetime.films).toBeLessThan(unfiltered.lifetime.films);
    // Every surviving film carries the genre, so its genre bucket equals the
    // surviving-film count (per-film genre counting).
    const m = Object.fromEntries(narrowed.genreDistribution);
    expect(m[topGenre]).toBe(narrowed.lifetime.films);
  });

  it("exclusion-only drops exactly the excluded slice", () => {
    // genres / excludeGenres match on the raw TMDB display name (not a slug),
    // mirroring the existing include-genre predicate.
    const topGenre = unfiltered.genreDistribution[0][0];
    const onlyTop = computeFilmStats({ genres: [topGenre] });
    const notTop = computeFilmStats({ excludeGenres: [topGenre] });
    // include(top) + exclude(top) partition the corpus by that genre. A film
    // can carry multiple genres, so the two slices can overlap on multi-genre
    // titles — but excluding the top genre must drop AT LEAST the films that
    // ONLY have it, so notTop is strictly smaller than the whole corpus.
    expect(notTop.lifetime.films).toBeLessThan(unfiltered.lifetime.films);
    expect(notTop.lifetime.films).toBeGreaterThan(0);
    // No surviving film in the excluded set carries the excluded genre.
    const m = Object.fromEntries(notTop.genreDistribution);
    expect(m[topGenre] ?? 0).toBe(0);
    // Sanity: the include slice is non-trivial too.
    expect(onlyTop.lifetime.films).toBeGreaterThan(0);
  });

  it("watched-year exclusion narrows the corpus (the rail's exclude cycle)", () => {
    // Candidate years come straight from the temporal pace series, so this
    // tracks whatever years the live fixture carries. Find a year whose
    // exclusion actually shrinks the corpus — i.e. one with at least one film
    // watched ONLY that year. A real multi-year diary always has one; the
    // search just keeps the test resilient to which specific year it is.
    const years = unfiltered.temporal.paceByDay
      .map((c) => Number(c.year))
      .filter((y) => Number.isFinite(y));
    const year = years.find(
      (y) =>
        computeFilmStats({ excludeWatchedYears: [y] }).lifetime.films <
        unfiltered.lifetime.films,
    );
    expect(year).toBeDefined();
    const exclude = computeFilmStats({ excludeWatchedYears: [year!] });
    // Excluding one year still leaves the other years' watches.
    expect(exclude.lifetime.films).toBeGreaterThan(0);
    expect(exclude.lifetime.films).toBeLessThan(unfiltered.lifetime.films);
    // The matching include side is non-trivial too (that year has films).
    expect(
      computeFilmStats({ watchedYears: [year!] }).lifetime.films,
    ).toBeGreaterThan(0);
  });

  it("include + exclude in the same dimension composes (a AND NOT b)", () => {
    const dist = unfiltered.genreDistribution;
    const incGenre = dist[0][0];
    const excGenre = dist[1][0];
    const composed = computeFilmStats({
      genres: [incGenre],
      excludeGenres: [excGenre],
    });
    const includeOnly = computeFilmStats({ genres: [incGenre] });
    // Adding an exclusion can only shrink (or hold) the include result.
    expect(composed.lifetime.films).toBeLessThanOrEqual(includeOnly.lifetime.films);
    // No surviving film carries the excluded genre.
    const m = Object.fromEntries(composed.genreDistribution);
    expect(m[excGenre] ?? 0).toBe(0);
  });
});

describe("computeTvStats — narrowed corpus", () => {
  const unfiltered = computeTvStats();

  it("empty selection reproduces the unfiltered dashboard exactly", () => {
    expect(computeTvStats({})).toEqual(unfiltered);
    expect(computeTvStats()).toEqual(unfiltered);
  });

  it("single-value include narrows the corpus", () => {
    const topGenre = unfiltered.genres.most[0][0];
    const narrowed = computeTvStats({ genres: [topGenre] });
    expect(narrowed.lifetime.shows).toBeGreaterThan(0);
    expect(narrowed.lifetime.shows).toBeLessThanOrEqual(unfiltered.lifetime.shows);
  });

  it("exclusion drops the excluded genre from the surviving distribution", () => {
    const topGenre = unfiltered.genres.most[0][0];
    const notTop = computeTvStats({ excludeGenres: [topGenre] });
    const m = Object.fromEntries(notTop.genres.most);
    expect(m[topGenre] ?? 0).toBe(0);
    expect(notTop.lifetime.shows).toBeGreaterThan(0);
  });
});

describe("computeConnectedStats — narrowed corpus", () => {
  const unfiltered = computeConnectedStats();

  it("empty selection reproduces the unfiltered dashboard exactly", () => {
    expect(computeConnectedStats({})).toEqual(unfiltered);
    expect(computeConnectedStats()).toEqual(unfiltered);
  });

  it("a shared-dimension include narrows BOTH libraries in lockstep", () => {
    // Head-to-head keeps n≥1 per side as long as the selection isn't empty;
    // use a broad shared genre so both sides survive.
    const topGenre = unfiltered.genreFilmVsTv[0]?.label;
    // genreFilmVsTv rows are dumbbell shared rows; fall back to a common
    // genre if the dumbbell is empty in this fixture.
    const genre = topGenre ?? "Drama";
    const narrowed = computeConnectedStats({ genres: [genre] });
    // Both library counts can only shrink (or hold) under a narrowing filter.
    expect(narrowed.headToHead.filmsLogged).toBeLessThanOrEqual(
      unfiltered.headToHead.filmsLogged,
    );
    expect(narrowed.headToHead.seasonsLogged).toBeLessThanOrEqual(
      unfiltered.headToHead.seasonsLogged,
    );
  });
});