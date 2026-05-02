// ─────────────────────────────────────────────────────────────────
// TMDB client — STUB (env-var contract only).
//
// The full client (search by title+year, fetch poster paths, fetch
// genre/runtime/director, rate-limit-aware batching) arrives with
// the parser + enricher work. This file exists now so:
//
//   1. The env-var name (TMDB_API_KEY) is locked in before any
//      consuming code is written, preventing rename churn.
//   2. .env.local can be configured ahead of time and validated
//      via isTmdbConfigured() / getTmdbApiKey().
//   3. The future health endpoint can probe TMDB readiness
//      without crashing on missing config.
//
// Setup:
//   1. Get a v3 API key (NOT the v4 read-access token):
//      https://www.themoviedb.org/settings/api
//      → "Request an API Key" → "Developer"
//   2. Add to .env.local:
//      TMDB_API_KEY=your_v3_api_key_here
//   3. No Vercel env needed — enrichment only runs locally during
//      the dev:online refresh workflow, never at request time.
//
// Why v3 over v4: v3 uses a query-param api_key (simpler integration
// for our search+metadata use case); v4 uses a Bearer Authorization
// header which adds plumbing without buying us anything we need.
// ─────────────────────────────────────────────────────────────────

import "server-only";

const TMDB_API_KEY_VAR = "TMDB_API_KEY";

/**
 * Read the TMDB API key at call time (not import time) so the value
 * is always fresh — important because the refresh script may run
 * after a `dotenv` reload mid-session.
 *
 * Throws a clear, action-oriented error when missing rather than
 * letting a downstream "401 Unauthorized" surface as the first
 * symptom (which has bitten me on similar setups before).
 */
export function getTmdbApiKey(): string {
  const key = process.env[TMDB_API_KEY_VAR];
  if (!key) {
    throw new Error(
      `${TMDB_API_KEY_VAR} is not set. Add to .env.local:\n` +
        `  ${TMDB_API_KEY_VAR}=your_v3_api_key_here\n\n` +
        "Get one at https://www.themoviedb.org/settings/api " +
        '(use the "API Key (v3 auth)" string, not the v4 read-access token).',
    );
  }
  return key;
}

/**
 * Cheap config check — returns true if the env var is present,
 * regardless of whether it actually authenticates against TMDB.
 * Used by /api/letterboxd/health to surface "TMDB not configured"
 * as a distinct stage from "TMDB unreachable" so the diagnostic
 * fingers the right cause.
 */
export function isTmdbConfigured(): boolean {
  return Boolean(process.env[TMDB_API_KEY_VAR]);
}

// ─── Real client lands here ──────────────────────────────────────
//
// export async function searchMovieByTitleYear(
//   title: string,
//   year: number,
// ): Promise<TmdbSearchResult | null> { ... }
//
// export async function fetchMovieDetails(
//   tmdbId: number,
// ): Promise<TmdbMovieDetails> { ... }
//
// Plus rate-limit-aware batching at ~10 req/s with retry-on-429,
// per-film overrides consultation against data/films/overrides.json,
// and a small in-memory cache for the duration of a single refresh
// run (so re-encountering the same film in RSS-overlap doesn't
// re-query TMDB).
