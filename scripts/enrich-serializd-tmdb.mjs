// ─────────────────────────────────────────────────────────────────
// enrich-serializd-tmdb.mjs
//
// Takes Show[] (skeleton, populated from the Serializd diary API)
// and enriches each entry with TMDB metadata: name, genres, type,
// status, networks, season/episode counts, poster_path,
// backdrop_path. Also resolves posterUrl + posterFallbackUrl per
// the same cascade /films uses.
//
// Lookup is simpler than /films because Serializd's showId IS the
// TMDB tv id (verified — Real Housewives of Atlanta showId 17380
// matches TMDB's TV show 17380). No search step needed: we hit
// /tv/{id} directly and either resolve or 404 → flag for override.
//
// Override cascade per show:
//   1. data/television/overrides.json `tmdbId[serializdShowId]` —
//      manual pin for the rare case where Serializd's showId
//      doesn't actually map to a TMDB id (shouldn't happen but
//      the cleanup pass surfaces tmdb-unresolved cases here).
//   2. /tv/{showId} direct lookup.
//   3. Failed lookups stay tmdb: null and surface in the cleanup
//      report so a human can either pin via overrides or accept
//      the show ships without enriched metadata.
//
// Each successful match makes ONE /tv/{id} call. Net cost: 1 call
// per show for cold lookups, 0 calls per show on the carryover
// path (TMDB metadata stays sticky once resolved).
//
// Rate limiting:
//   • 100ms gap between requests (10 req/sec) — well below TMDB's
//     ~40 req/10s ceiling, leaves headroom for retry.
//   • On 429, parse Retry-After and sleep accordingly. One retry,
//     then mark failed and move on.
//
// Env requirement: TMDB_API_KEY in process.env. Run via:
//   node --env-file=.env.local scripts/enrich-serializd-tmdb.mjs
//
// Mirror the structure of enrich-tmdb.mjs (films) so future
// cross-cluster maintenance touches both files in lockstep.
// ─────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";
const RATE_LIMIT_DELAY_MS = 100; // 10 req/sec ceiling
const MAX_RETRIES = 1;
const OVERRIDES_PATH = path.resolve(
  process.cwd(),
  "data/television/overrides.json",
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

/**
 * Read data/television/overrides.json. Mirrors the films overrides
 * shape but the keys are different: films keys by letterboxdSlug
 * because Letterboxd slugs are stable URLs; television keys by
 * serializdShowId (= TMDB id) because Serializd's slug isn't
 * exposed in the API and we always have the integer id.
 *
 * Schema (see file's _schema field):
 *   • tmdbId: { [serializdShowId: number]: number }
 *       — pin a different TMDB tv id when Serializd's id doesn't
 *         resolve. Should be very rare; surfaces in the cleanup
 *         pass's `tmdb-unresolved.md` when needed.
 *   • posterPath: { [serializdShowId: number]: string }
 *       — pin a non-default poster path when Malcolm has selected
 *         one on Serializd that differs from TMDB's default.
 *   • isMiniseries: { [serializdShowId: number]: boolean }
 *       — manual override for the miniseries classifier (see
 *         plan §Miniseries classifier). True forces Show-card
 *         placement when TMDB type would otherwise route to
 *         Season cards; false forces the inverse.
 */
export function loadOverrides() {
  if (!existsSync(OVERRIDES_PATH)) {
    return { tmdbId: {}, posterPath: {}, isMiniseries: {}, watchedSeasons: {} };
  }
  try {
    const raw = JSON.parse(readFileSync(OVERRIDES_PATH, "utf-8"));
    return {
      tmdbId: raw.tmdbId ?? {},
      posterPath: raw.posterPath ?? {},
      isMiniseries: raw.isMiniseries ?? {},
      watchedSeasons: raw.watchedSeasons ?? {},
    };
  } catch (err) {
    console.warn(
      `Couldn't parse ${OVERRIDES_PATH}; proceeding without overrides:`,
      err instanceof Error ? err.message : err,
    );
    return { tmdbId: {}, posterPath: {}, isMiniseries: {}, watchedSeasons: {} };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch a TMDB endpoint with rate-limit handling. On 429, reads
 * Retry-After (seconds) and waits, then retries up to MAX_RETRIES
 * times. Other non-2xx statuses surface as thrown errors —
 * notably, a 404 throws so the caller can distinguish "no match"
 * from "TMDB itself is down."
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
  if (res.status === 404) {
    // Distinguish "TMDB has no record of this id" from other
    // failures — caller treats this as cleanup-pass material
    // rather than a hard error. Return null sentinel so the
    // happy-path ergonomics stay clean.
    return null;
  }
  if (!res.ok) {
    throw new Error(`TMDB ${endpoint} → ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch full TV show details. Returns the raw TMDB shape; caller
 * is responsible for normalizing into our TmdbTvMeta type. Returns
 * null when the id is unknown to TMDB (404). Exported so the
 * incremental refresh script can hit TMDB directly with a known
 * id when it encounters a freshly-watched show.
 */
export async function fetchTvDetails(tmdbId) {
  return tmdbFetch(`/tv/${tmdbId}`, {});
}

/**
 * Normalize a TMDB /tv details payload into our TmdbTvMeta shape
 * + a Season[] derived from the same call (TMDB returns the full
 * season list inline, no extra request needed).
 *
 * Returns { tmdb, seasons } so the caller can wire both into the
 * Show object in one pass.
 */
export function normalizeTvDetails(details) {
  const tmdb = {
    id: details.id,
    name: details.name ?? details.original_name ?? "",
    posterPath: details.poster_path ?? null,
    backdropPath: details.backdrop_path ?? null,
    genres: (details.genres ?? []).map((g) => g.name),
    // Default to "Scripted" when missing — TMDB's `type` field is
    // present on every TV record I've seen, but defaulting keeps
    // downstream consumers from null-checking the discriminator.
    type: details.type ?? "Scripted",
    status: details.status ?? "Unknown",
    networks: (details.networks ?? []).map((n) => n.name),
    numberOfSeasons:
      typeof details.number_of_seasons === "number"
        ? details.number_of_seasons
        : 0,
    numberOfEpisodes:
      typeof details.number_of_episodes === "number"
        ? details.number_of_episodes
        : 0,
  };
  const seasons = (details.seasons ?? []).map((s) => ({
    serializdId: s.id,
    showId: details.id,
    seasonNumber: s.season_number,
    name: s.name ?? `Season ${s.season_number}`,
    posterPath: s.poster_path ?? null,
    // TMDB returns `episode_count` per season. Used by the
    // /television/watching "X of Y episodes" display. May be
    // missing for unaired / freshly-listed seasons; null sentinel
    // lets the UI skip the denominator gracefully.
    episodeCount:
      typeof s.episode_count === "number" ? s.episode_count : null,
  }));
  return { tmdb, seasons };
}

/**
 * Resolve the poster URL applied to the Show card. Override wins
 * when provided; otherwise TMDB's default poster_path with w342
 * size (matches the planned card width and what /films uses).
 */
export function resolvePosterUrl(serializdShowId, tmdbMeta, overrides) {
  const override = overrides.posterPath[serializdShowId];
  const path = override ?? tmdbMeta?.posterPath ?? null;
  return path ? `${TMDB_IMG_BASE}/w342${path}` : null;
}

/** Fallback URL used by the card's onError swap. Always points at
 *  TMDB's default poster (skips the override). */
export function resolveFallbackUrl(tmdbMeta) {
  const path = tmdbMeta?.posterPath ?? null;
  return path ? `${TMDB_IMG_BASE}/w342${path}` : null;
}

/**
 * Enrich a single Show IN PLACE. The function name has the
 * imperative form ("enrich") to flag the mutation, and the return
 * value carries status metadata only — `result.show` is the same
 * reference the caller passed in.
 *
 * Caller is responsible for pacing — this function does the
 * lookup (1 TMDB request) without delays.
 */
async function enrichShow(show, overrides) {
  // Resolve TMDB id: override → Serializd's showId (default).
  const overrideId = overrides.tmdbId[show.serializdShowId];
  const tmdbId = overrideId ?? show.serializdShowId;

  let details;
  try {
    details = await fetchTvDetails(tmdbId);
  } catch (err) {
    return {
      show,
      status: "details-failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
  if (details === null) {
    // 404 — TMDB doesn't know this id. Cleanup pass surfaces the
    // show in tmdb-unresolved.md for manual override.
    return { show, status: "no-match" };
  }

  const { tmdb, seasons } = normalizeTvDetails(details);
  show.tmdb = tmdb;
  show.seasons = seasons;
  show.posterUrl = resolvePosterUrl(show.serializdShowId, tmdb, overrides);
  show.posterFallbackUrl = resolveFallbackUrl(tmdb);
  // Backfill the show name from TMDB if Serializd's was empty (rare
  // — the diary API embeds showName, but if a future API change
  // drops it, TMDB's name is the fallback). Same for premiereDate.
  if (!show.name && tmdb.name) show.name = tmdb.name;
  return { show, status: "ok" };
}

/** Refresh resolved poster URLs for an already-enriched show
 *  without hitting TMDB. Used by the carryover path so override
 *  edits still re-resolve poster URLs even when the show's TMDB
 *  metadata is reused from the previous snapshot. */
function refreshResolvedUrls(show, overrides) {
  show.posterUrl = resolvePosterUrl(show.serializdShowId, show.tmdb, overrides);
  show.posterFallbackUrl = resolveFallbackUrl(show.tmdb);
}

/**
 * Enrich a Show[] in place with rate limiting. Returns a summary
 * object with counts + lists of unmatched/failed entries so the
 * caller can surface what needs manual override via the cleanup
 * pass.
 */
export async function enrichShows(shows, options = {}) {
  const overrides = loadOverrides();
  const onProgress = options.onProgress ?? (() => {});

  const stats = {
    total: shows.length,
    enriched: 0,
    unmatched: [],
    failed: [],
  };

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];
    // Sticky-TMDB carryover: if a previous snapshot already
    // enriched this show, refresh poster URLs (in case overrides
    // changed) and skip the TMDB roundtrip + the rate-limit
    // sleep. Saves the ~15s of API throttle per refresh once the
    // catalog is stable.
    if (show.tmdb) {
      refreshResolvedUrls(show, overrides);
      stats.enriched++;
      onProgress(i + 1, shows.length);
      continue;
    }
    const result = await enrichShow(show, overrides);
    if (result.status === "ok") {
      stats.enriched++;
    } else if (result.status === "no-match") {
      stats.unmatched.push({
        serializdShowId: show.serializdShowId,
        name: show.name,
        premiereYear: show.premiereYear,
      });
    } else {
      stats.failed.push({
        serializdShowId: show.serializdShowId,
        name: show.name,
        error: result.error,
      });
    }
    onProgress(i + 1, shows.length);
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  return stats;
}

// CLI entry — useful for sanity-checking the enricher against a
// known showId without going through the full bootstrap. Usage:
//   node --env-file=.env.local scripts/enrich-serializd-tmdb.mjs 17380
if (import.meta.url === `file://${process.argv[1]}`) {
  const id = Number.parseInt(process.argv[2] ?? "", 10);
  if (!Number.isFinite(id)) {
    console.error("Usage: enrich-serializd-tmdb.mjs <tmdbTvId>");
    process.exit(1);
  }
  console.log(`Probing TMDB /tv/${id}…`);
  const details = await fetchTvDetails(id);
  if (details === null) {
    console.error(`No TMDB record for tv id ${id}.`);
    process.exit(1);
  }
  const { tmdb, seasons } = normalizeTvDetails(details);
  console.log(JSON.stringify({ tmdb, seasonCount: seasons.length }, null, 2));
}
