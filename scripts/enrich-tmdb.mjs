// ─────────────────────────────────────────────────────────────────
// enrich-tmdb.mjs
//
// Takes Film[] from parse-letterboxd-export.mjs and enriches each
// entry with TMDB metadata: tmdb id, genres, runtime, director,
// poster_path, backdrop_path. Also resolves posterUrl and
// posterFallbackUrl per the cascade documented in the plan.
//
// Lookup cascade per film:
//   1. data/films/overrides.json `tmdbId[letterboxdSlug]` —
//      manual override for cases where auto-search picks the wrong
//      film (rare: same title + year for two different films).
//   2. TMDB /search/movie?query=<title>&year=<year> — top result.
//   3. Top-result heuristic: skip if year mismatch by >1 (TMDB
//      sometimes returns approximate matches for ambiguous titles).
//   4. Failed lookups stay tmdb: null and surface in the summary
//      so a human can hand-craft an override entry.
//
// Each successful match makes ONE additional /movie/<id> call with
// append_to_response=credits to grab details + director in a single
// request. Net cost: 2 requests per film for cold lookups, 1
// request per film when the override is set.
//
// Rate limiting:
//   • 100ms gap between requests (10 req/sec) — well below TMDB's
//     ~40 req/10s ceiling, leaves headroom for retry.
//   • On 429, parse Retry-After and sleep accordingly. One retry,
//     then mark failed and move on.
//
// Env requirement: TMDB_API_KEY in process.env. Run via:
//   node --env-file=.env.local scripts/enrich-tmdb.mjs
// ─────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";
const RATE_LIMIT_DELAY_MS = 100; // 10 req/sec ceiling
const MAX_RETRIES = 1;
const OVERRIDES_PATH = path.resolve(
  process.cwd(),
  "data/films/overrides.json",
);

function getApiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error(
      "TMDB_API_KEY is not set. Run with --env-file=.env.local " +
        "or export TMDB_API_KEY before invoking this script.",
    );
  }
  return key;
}

function loadOverrides() {
  if (!existsSync(OVERRIDES_PATH)) return { tmdbId: {}, posterPath: {} };
  try {
    const raw = JSON.parse(readFileSync(OVERRIDES_PATH, "utf-8"));
    return {
      tmdbId: raw.tmdbId ?? {},
      posterPath: raw.posterPath ?? {},
    };
  } catch (err) {
    console.warn(
      `Couldn't parse ${OVERRIDES_PATH}; proceeding without overrides:`,
      err instanceof Error ? err.message : err,
    );
    return { tmdbId: {}, posterPath: {} };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch a TMDB endpoint with rate-limit handling. On 429, reads
 * Retry-After (seconds) and waits, then retries up to MAX_RETRIES
 * times. Other non-2xx statuses surface as thrown errors.
 */
async function tmdbFetch(endpoint, params, attempt = 0) {
  const apiKey = getApiKey();
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url);
  if (res.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = Number.parseInt(res.headers.get("retry-after") ?? "5", 10);
    await sleep((retryAfter + 1) * 1000);
    return tmdbFetch(endpoint, params, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`TMDB ${endpoint} → ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Search TMDB by title + year; return the best year-matching result
 * or null. TMDB's `year` filter is loose and search results sort by
 * popularity, which means a remake (e.g. Suspiria 2018) can rank
 * below the older original when both share a title. Iterate through
 * results and pick the first whose release year is within 1 of the
 * requested year. If none match, fall back to the top result only
 * if it has no release_date set (unreleased/upcoming films).
 */
async function searchMovie(title, year) {
  // Use the loose `year` filter (boosts matches without strict
  // exclusion). primary_release_year sometimes disagrees with
  // Letterboxd's year for festival-vs-theatrical releases or COVID-
  // delayed films, so the loose version finds more candidates that
  // we can then year-match in code.
  const data = await tmdbFetch("/search/movie", { query: title, year });
  const results = data.results ?? [];
  if (results.length === 0) return null;

  // Year-match strategy:
  //  • If exactly one result returns, accept it within ±2 years —
  //    handles festival-vs-theatrical-release gaps that are
  //    common for indie/horror films (Terrifier 2016/2018,
  //    Prozac Nation 2001/2003, Hell of a Summer 2023/2025).
  //  • If multiple results return, require ±1 to disambiguate
  //    against same-title-different-film collisions across
  //    decades.
  //  • Iterate (don't just check [0]) so remakes that rank below
  //    their older originals by popularity still match (e.g.
  //    Suspiria 2018 below Suspiria 1977).
  const tolerance = results.length === 1 ? 2 : 1;
  for (const r of results) {
    if (!r.release_date) continue;
    const ry = Number.parseInt(r.release_date.slice(0, 4), 10);
    if (Number.isFinite(ry) && Math.abs(ry - year) <= tolerance) return r;
  }
  // Fallback: if no dated result matches but the top has no
  // release_date (unreleased/upcoming), trust the search.
  if (!results[0].release_date) return results[0];
  return null;
}

/**
 * Fetch full movie details + credits in one round-trip via
 * append_to_response. Returns the raw TMDB shape; caller is
 * responsible for normalizing into our TmdbMeta type.
 */
async function fetchMovieDetails(tmdbId) {
  return tmdbFetch(`/movie/${tmdbId}`, { append_to_response: "credits" });
}

/**
 * Normalize a TMDB details payload into our TmdbMeta shape.
 * Director comes from crew where job === "Director" (films can
 * have multiple credited directors; we keep just the first to
 * match the Film type — full credits surface on the detail page
 * via the Letterboxd link if needed).
 */
function normalizeDetails(details) {
  const director =
    details.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
  return {
    id: details.id,
    posterPath: details.poster_path ?? null,
    backdropPath: details.backdrop_path ?? null,
    genres: (details.genres ?? []).map((g) => g.name),
    runtime: typeof details.runtime === "number" ? details.runtime : null,
    director,
  };
}

/** Resolve the poster URL applied to the Film card. Override wins
 *  when provided; otherwise TMDB's default poster_path with w342
 *  size (matches the planned card width). */
function resolvePosterUrl(letterboxdSlug, tmdbMeta, overrides) {
  const override = overrides.posterPath[letterboxdSlug];
  const path = override ?? tmdbMeta?.posterPath ?? null;
  return path ? `${TMDB_IMG_BASE}/w342${path}` : null;
}

/** Fallback URL used by the card's onError swap. Always points at
 *  TMDB's default poster (skips the override) so the fallback is
 *  semantically distinct from the rest URL. */
function resolveFallbackUrl(tmdbMeta) {
  const path = tmdbMeta?.posterPath ?? null;
  return path ? `${TMDB_IMG_BASE}/w342${path}` : null;
}

/**
 * Enrich a single Film IN PLACE. The function name has the
 * imperative form ("enrich") to flag the mutation, and the return
 * value carries status metadata only — `result.film` is the same
 * reference the caller passed in, not a copy. The caller (enrichFilms
 * below) iterates an array and relies on this in-place behavior so
 * downstream stages see the enriched fields without re-assigning.
 *
 * Caller is responsible for pacing — this function does the
 * lookup (1-2 TMDB requests) without delays.
 */
async function enrichFilm(film, overrides) {
  // Resolve TMDB id: override → search → null
  let tmdbId = overrides.tmdbId[film.letterboxdSlug] ?? null;
  if (tmdbId === null) {
    const result = await searchMovie(film.title, film.releaseYear);
    if (result) tmdbId = result.id;
  }
  if (tmdbId === null) {
    return { film, status: "no-match" };
  }

  // Fetch details + credits.
  let details;
  try {
    details = await fetchMovieDetails(tmdbId);
  } catch (err) {
    return {
      film,
      status: "details-failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
  film.tmdb = normalizeDetails(details);
  // Promote canonical id from seed to TMDB id once enriched.
  film.id = `tmdb-${film.tmdb.id}`;
  film.posterUrl = resolvePosterUrl(film.letterboxdSlug, film.tmdb, overrides);
  film.posterFallbackUrl = resolveFallbackUrl(film.tmdb);
  return { film, status: "ok" };
}

/** Refresh resolved poster URLs for an already-enriched film without
 *  hitting TMDB. Used by the carryover path so override edits still
 *  re-resolve poster URLs even when the film's TMDB metadata is
 *  reused from the previous snapshot. */
function refreshResolvedUrls(film, overrides) {
  film.posterUrl = resolvePosterUrl(film.letterboxdSlug, film.tmdb, overrides);
  film.posterFallbackUrl = resolveFallbackUrl(film.tmdb);
}

/**
 * Enrich a Film[] in place with rate limiting. Returns a summary
 * object with counts + lists of unmatched/failed entries so the
 * caller can surface what needs manual override.
 */
export async function enrichFilms(films, options = {}) {
  const overrides = loadOverrides();
  const onProgress = options.onProgress ?? (() => {});

  const stats = {
    total: films.length,
    enriched: 0,
    unmatched: [],
    failed: [],
  };

  for (let i = 0; i < films.length; i++) {
    const film = films[i];
    // Sticky-TMDB carryover: if a previous snapshot already enriched
    // this film, refresh the poster URLs (in case overrides changed)
    // and skip the TMDB roundtrip + the rate-limit sleep. Saves the
    // ~74s of API throttle per refresh once the catalog is stable.
    if (film.tmdb) {
      refreshResolvedUrls(film, overrides);
      stats.enriched++;
      onProgress(i + 1, films.length);
      continue;
    }
    const result = await enrichFilm(film, overrides);
    if (result.status === "ok") {
      stats.enriched++;
    } else if (result.status === "no-match") {
      stats.unmatched.push({
        slug: film.letterboxdSlug,
        title: film.title,
        year: film.releaseYear,
        url: film.letterboxdUrl,
      });
    } else {
      stats.failed.push({
        slug: film.letterboxdSlug,
        title: film.title,
        year: film.releaseYear,
        error: result.error,
      });
    }
    onProgress(i + 1, films.length);
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  return stats;
}

// CLI entry — when invoked directly, parse + enrich + print
// summary so a developer can sanity-check before wiring this
// into the snapshot orchestrator.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { parseLetterboxdExport } = await import("./parse-letterboxd-export.mjs");
  const films = parseLetterboxdExport();
  console.log(`Parsed ${films.length} films. Starting TMDB enrichment…`);

  const stats = await enrichFilms(films, {
    onProgress: (done, total) => {
      if (done % 50 === 0 || done === total) {
        process.stderr.write(`\r  ${done}/${total}…`);
      }
    },
  });

  console.error(""); // newline after the progress counter
  console.log(`\nEnrichment complete:`);
  console.log(`  ${stats.enriched}/${stats.total} matched + enriched`);
  console.log(`  ${stats.unmatched.length} unmatched (no TMDB result)`);
  console.log(`  ${stats.failed.length} failed (TMDB error)`);

  if (stats.unmatched.length > 0) {
    console.log(`\nUnmatched films (need manual override in data/films/overrides.json):`);
    for (const u of stats.unmatched) {
      console.log(`  • ${u.title} (${u.year})  [${u.url}]  slug=${u.slug}`);
    }
  }
  if (stats.failed.length > 0) {
    console.log(`\nFailed lookups (TMDB error during details fetch):`);
    for (const f of stats.failed) {
      console.log(`  • ${f.title} (${f.year})  ${f.error}`);
    }
  }

  // Spot-check the first enriched film
  const sample = films.find((f) => f.tmdb !== null);
  if (sample) {
    console.log(`\nSample enriched film:`);
    console.log(`  ${sample.title} (${sample.releaseYear})`);
    console.log(`  id: ${sample.id}`);
    console.log(`  tmdb.id: ${sample.tmdb.id}`);
    console.log(`  director: ${sample.tmdb.director}`);
    console.log(`  genres: [${sample.tmdb.genres.join(", ")}]`);
    console.log(`  runtime: ${sample.tmdb.runtime} min`);
    console.log(`  posterUrl: ${sample.posterUrl}`);
  }
}
