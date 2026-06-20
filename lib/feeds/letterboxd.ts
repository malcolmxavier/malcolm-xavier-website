// ─────────────────────────────────────────────────────────────────
// Letterboxd — server-only data layer.
//
// Snapshot architecture mirrors lib/feeds/spotify.ts (see
// lib/feeds/CLAUDE.md for the pattern). One difference: /films is
// snapshot-from-day-one — no live API path at request time, since
// Letterboxd has no public API. The snapshot is built from CSV
// export + RSS by the refresh script and read directly here.
//
// Public types live in letterboxd-utils.ts (re-exported below) so
// client components can type props without crossing the server-only
// boundary.
// ─────────────────────────────────────────────────────────────────

import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import type {
  Film,
  FilmFavorite,
  FilmList,
  FilmsSummary,
} from "./letterboxd-utils";
import { getTmdbApiKey, isTmdbConfigured } from "./tmdb";

// Re-export the public types so consumers can import everything from
// either module — same convention as spotify.ts re-exports from
// spotify-utils.ts.
export type {
  AppliedFilm,
  Film,
  FilmFavorite,
  FilmFilters,
  FilmList,
  FilmSort,
  FilmsSummary,
  Review,
  TmdbMeta,
} from "./letterboxd-utils";

// ─── Snapshot envelope (private) ─────────────────────────────────

/**
 * On-disk shape of `_fixtures/letterboxd-snapshot.json`. Private to
 * this module — consumers go through `getFilms()` / `getFilmById()`.
 */
type LetterboxdSnapshot = {
  capturedAt: string;
  summary: FilmsSummary;
  films: Film[];
  filmById: Record<string, Film>;
  /**
   * Editorial-landing data, attached by the slow-cadence
   * scripts/refresh-films-lists.mjs pass (NOT the daily RSS refresh).
   * Optional so a snapshot captured before that pass — or by the
   * CSV/RSS refresh, which preserves but doesn't author these — still
   * validates. Read via getFilmLists() / getFilmFavorites().
   */
  lists?: FilmList[];
  favorites?: FilmFavorite[];
};

// Minimal runtime guard for the snapshot file. We only check the
// top-level keys consumers immediately access — same approach as
// spotify.ts's isSnapshotShape. Closes the "cryptic 'cannot read
// property of undefined' deep in the render" failure mode.
function isSnapshotShape(value: unknown): value is LetterboxdSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.capturedAt === "string" &&
    typeof v.summary === "object" &&
    v.summary !== null &&
    Array.isArray(v.films) &&
    typeof v.filmById === "object" &&
    v.filmById !== null
  );
}

const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/letterboxd-snapshot.json",
);

// Module-scoped cache. Loaded lazily on first read; reused across
// every subsequent call within the same Node process. Vercel
// instances reuse the cached snapshot across requests; cron-style
// invalidation would require a fresh deploy (which is the current
// refresh ritual anyway).
//
// Both the parsed snapshot AND every derived index share a single
// cache object so they can never drift apart. If the snapshot is
// ever invalidated (HMR, test isolation, future cache-clear hook),
// every index is dropped in the same beat — replacing one without
// the others would otherwise leave stale Film references behind.
//
// `positionByFilmId` is the chronological index of each film in
// `snapshot.films`, used by /films/[slug] for prev/next neighbor
// nav. Built once at cache-load time so the detail page doesn't
// re-derive it via Array.findIndex on every request.
type SnapshotCache = {
  snapshot: LetterboxdSnapshot;
  slugMap: Map<string, Film>;
  /** letterboxdSlug → Film (no year). The join key for favorites and
   *  list entries, whose captured slug is the bare Letterboxd film
   *  slug. Shares the snapshot's cache lifetime so it can't drift. */
  bareSlugMap: Map<string, Film>;
  /** normalized-slug → Film[]. Letterboxd emits a film's slug in two
   *  forms: the canonical film URL (and thus the diary CSV/RSS the
   *  corpus is built from) vs. list/profile `data-item-slug` markup.
   *  They diverge two ways — a trailing year ("weapons" vs
   *  "weapons-2025") and apostrophe handling ("dead-man-s-wire" vs
   *  "dead-mans-wire"). Normalizing (strip trailing year, then remove
   *  all hyphens) collapses both forms to one key. Stored as an array
   *  so the resolver can detect + guard against collisions. */
  normalizedSlugMap: Map<string, Film[]>;
  positionByFilmId: Map<string, number>;
};

/**
 * Normalize a Letterboxd slug to a form stable across its canonical-
 * URL and list-markup variants: strip a trailing `-YYYY` (plus any
 * `-N` disambiguator), then remove all hyphens. Returns the key and
 * the stripped year (null when the slug carried none) so a caller can
 * year-verify an ambiguous match. See normalizedSlugMap above.
 */
function normalizeFilmSlug(slug: string): { key: string; year: number | null } {
  const m = slug.match(/^(.+?)-(\d{4})(?:-\d+)?$/);
  const base = m ? m[1] : slug;
  const year = m ? Number(m[2]) : null;
  return { key: base.replace(/-/g, ""), year };
}

let cachedState: SnapshotCache | null = null;

function buildSlugMap(films: Film[]): Map<string, Film> {
  const slugMap = new Map<string, Film>();
  for (const film of films) {
    slugMap.set(`${film.letterboxdSlug}-${film.releaseYear}`, film);
  }
  return slugMap;
}

function buildBareSlugMap(films: Film[]): Map<string, Film> {
  const bareSlugMap = new Map<string, Film>();
  for (const film of films) {
    // First write wins on the rare duplicate-slug collision — the
    // films array is sorted newest-watch-first, so the more recent
    // entry is the one a favorite/list link most likely refers to.
    if (!bareSlugMap.has(film.letterboxdSlug)) {
      bareSlugMap.set(film.letterboxdSlug, film);
    }
  }
  return bareSlugMap;
}

function buildNormalizedSlugMap(films: Film[]): Map<string, Film[]> {
  const map = new Map<string, Film[]>();
  for (const film of films) {
    const { key } = normalizeFilmSlug(film.letterboxdSlug);
    const bucket = map.get(key);
    if (bucket) bucket.push(film);
    else map.set(key, [film]);
  }
  return map;
}

function buildPositionMap(films: Film[]): Map<string, number> {
  const positionByFilmId = new Map<string, number>();
  for (let i = 0; i < films.length; i++) {
    positionByFilmId.set(films[i].id, i);
  }
  return positionByFilmId;
}

function loadCache(): SnapshotCache {
  if (cachedState) return cachedState;
  let raw: string;
  try {
    raw = readFileSync(SNAPSHOT_PATH, "utf-8");
  } catch {
    // Fail loud rather than silently returning empty data. The
    // /films page is meant to render real reviews; an empty page
    // would be a worse signal than a clear "snapshot missing"
    // error in the logs.
    throw new Error(
      `No Letterboxd snapshot at ${SNAPSHOT_PATH}. ` +
        `Run \`npm run films:refresh\` to capture one (requires the ` +
        `Letterboxd export ZIP to be unzipped into ` +
        `data/letterboxd-export/ — see that directory's README).`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Letterboxd snapshot at ${SNAPSHOT_PATH} is not valid JSON: ` +
        (err instanceof Error ? err.message : String(err)),
    );
  }
  if (!isSnapshotShape(parsed)) {
    throw new Error(
      `Letterboxd snapshot at ${SNAPSHOT_PATH} is malformed (missing ` +
        `capturedAt / summary / films / filmById). Recapture with ` +
        `\`npm run films:refresh\`.`,
    );
  }
  cachedState = {
    snapshot: parsed,
    slugMap: buildSlugMap(parsed.films),
    bareSlugMap: buildBareSlugMap(parsed.films),
    normalizedSlugMap: buildNormalizedSlugMap(parsed.films),
    positionByFilmId: buildPositionMap(parsed.films),
  };
  return cachedState;
}

function loadSnapshot(): LetterboxdSnapshot {
  return loadCache().snapshot;
}

// ─── Read API ────────────────────────────────────────────────────

/**
 * Hand the /films page everything it needs in one call: the films
 * array (already sorted firstReviewDate desc by the snapshot writer),
 * the lifetime summary block (pre-aggregated for the stats panel),
 * and the snapshot's capturedAt for any "data as of" surfacing.
 */
export function getFilms(): {
  films: Film[];
  summary: FilmsSummary;
  capturedAt: string;
} {
  const snap = loadSnapshot();
  return {
    films: snap.films,
    summary: snap.summary,
    capturedAt: snap.capturedAt,
  };
}

/**
 * O(1) lookup for /films/[slug]. The id key is canonical (TMDB id
 * once enriched, slug+year as the seed identity). Returns null when
 * the id isn't in the snapshot — caller should `notFound()`.
 */
export function getFilmById(id: string): Film | null {
  const snap = loadSnapshot();
  return snap.filmById[id] ?? null;
}

/**
 * O(1) lookup of a film's chronological neighbors in the snapshot's
 * sorted films array — used by /films/[slug] for the prev/next
 * adjacent-review nav. The position map is built once at cache-load
 * time so this avoids the per-render findIndex pass over all films.
 * Returns null on either side at the array boundary.
 */
export function getFilmNeighbors(filmId: string): {
  newer: Film | null;
  older: Film | null;
} {
  const cache = loadCache();
  const idx = cache.positionByFilmId.get(filmId);
  if (idx === undefined) return { newer: null, older: null };
  const films = cache.snapshot.films;
  return {
    newer: idx > 0 ? films[idx - 1] : null,
    older: idx + 1 < films.length ? films[idx + 1] : null,
  };
}

/**
 * O(1) lookup by human-readable URL slug — `<letterboxdSlug>-
 * <releaseYear>`. This is the canonical /films/[slug] URL form and
 * is more SEO-friendly than the TMDB id form. Falls back to id
 * lookup so old `/films/tmdb-X` links still resolve.
 *
 * The slug map shares a cache lifetime with the snapshot itself —
 * see `loadCache()` — so the two can never drift apart.
 */
export function getFilmBySlug(slug: string): Film | null {
  return loadCache().slugMap.get(slug) ?? getFilmById(slug);
}

/**
 * O(1) lookup by bare Letterboxd film slug (no release year) — the
 * join key carried by favorites and list entries. Returns null when
 * the slug isn't in the reviewed corpus, in which case the favorite/
 * list renders from its own captured title + poster fallback.
 */
export function getFilmByLetterboxdSlug(slug: string): Film | null {
  const cache = loadCache();
  // Exact match first — the common case, and it can never mis-resolve.
  const exact = cache.bareSlugMap.get(slug);
  if (exact) return exact;
  // Fallback for the two ways Letterboxd's list/profile slug diverges
  // from the canonical (corpus) slug — a trailing year ("weapons-2025"
  // vs "weapons") and apostrophe handling ("dead-mans-wire" vs
  // "dead-man-s-wire"). Normalizing collapses both. Guard against a
  // wrong match: when the requested slug carries a year, require the
  // candidate's releaseYear to match; otherwise only resolve when the
  // normalized key maps to a single corpus film (no ambiguity).
  const { key, year } = normalizeFilmSlug(slug);
  const candidates = cache.normalizedSlugMap.get(key);
  if (!candidates || candidates.length === 0) return null;
  if (year !== null) {
    const byYear = candidates.filter((f) => f.releaseYear === year);
    return byYear.length === 1 ? byYear[0] : null;
  }
  return candidates.length === 1 ? candidates[0] : null;
}

// ─── Editorial-landing read API (lists + favorites) ───────────────
//
// All three tolerate a snapshot captured before the lists/favorites
// scrape pass ran — they return [] / null rather than throwing, so
// the landing degrades to "no lists yet" instead of erroring. The
// landing maps each entry's slug to a corpus Film via
// getFilmByLetterboxdSlug() for the rich card.

/** Malcolm's public Letterboxd lists, in profile order. */
export function getFilmLists(): FilmList[] {
  return loadSnapshot().lists ?? [];
}

/** O(n) lookup of one list by its URL slug (n = list count, tiny).
 *  Returns null when absent — caller should notFound(). */
export function getFilmListBySlug(slug: string): FilmList | null {
  const lists = loadSnapshot().lists ?? [];
  return lists.find((l) => l.slug === slug) ?? null;
}

/** Up to three corpus poster URLs for a list's cover montage — walking
 *  the list's films in running order and skipping any not in the
 *  reviewed corpus (or lacking a poster). Shared by the landing teaser
 *  and the lists hub so both resolve covers identically. */
export function filmListCoverPosters(list: FilmList): string[] {
  const urls: string[] = [];
  for (const slug of list.filmSlugs) {
    const film = getFilmByLetterboxdSlug(slug);
    if (film?.posterUrl) urls.push(film.posterUrl);
    if (urls.length >= 3) break;
  }
  return urls;
}

/** Letterboxd profile favorites, in the order Malcolm arranged them. */
export function getFilmFavorites(): FilmFavorite[] {
  return loadSnapshot().favorites ?? [];
}

// ─── Diagnostic ──────────────────────────────────────────────────

/**
 * Lightweight snapshot freshness signal — used by /api/letterboxd/
 * health and any future "data as of" caption on /films. Mirrors
 * getSnapshotMeta() from spotify.ts.
 *
 * Throws the same error as loadSnapshot when the file is missing or
 * malformed — caller should catch and report "snapshot unavailable"
 * separately from "TMDB unreachable" / "RSS unreachable".
 */
export function getLetterboxdSnapshotMeta(): {
  capturedAt: string;
  ageDays: number;
  filmCount: number;
  reviewCount: number;
} {
  const snap = loadSnapshot();
  const ageMs = Date.now() - new Date(snap.capturedAt).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  return {
    capturedAt: snap.capturedAt,
    ageDays,
    filmCount: snap.summary.totalFilms,
    reviewCount: snap.summary.totalReviews,
  };
}

// ─── Live probes ──────────────────────────────────────────────────
//
// /api/letterboxd/health surfaces these so a developer can answer
// "would refresh-films-snapshot.mjs work right now?" without firing
// it. Both probes return per-call result objects; the aggregate
// `ok` is the AND of every probe.
//
// Independent of the snapshot read path — these always hit the live
// upstreams regardless of NODE_ENV or any "offline" flag. Mirrors
// Spotify's pingSpotifyHealth pattern.

export type LetterboxdHealthProbe = {
  name: "rss" | "tmdb";
  ok: boolean;
  status?: number;
  latencyMs: number;
  error?: string;
};

/** Letterboxd handle in URL form. Sourced from lib/elsewhere.ts via
 *  hardcode here to avoid pulling client-side data into server-only
 *  module. The handle is also used by parse-letterboxd-export.mjs's
 *  RSS layer (incremental refresh path). */
const LETTERBOXD_RSS_URL = "https://letterboxd.com/malxavi/rss/";

const PROBE_TIMEOUT_MS = 10_000;

/**
 * Probe RSS + TMDB reachability. Returns per-probe results plus an
 * aggregate `ok` so the diagnostic can report partial outages
 * (e.g. RSS up, TMDB down — refresh would fail at enrichment but
 * the snapshot is still readable).
 *
 * Both probes run in parallel. Total wall time is capped by the
 * slower of the two (10s timeout each).
 */
export async function pingLetterboxdHealth(): Promise<{
  ok: boolean;
  probes: LetterboxdHealthProbe[];
}> {
  const probes = await Promise.all([probeRss(), probeTmdb()]);
  return { ok: probes.every((p) => p.ok), probes };
}

async function probeRss(): Promise<LetterboxdHealthProbe> {
  const start = Date.now();
  try {
    const res = await fetch(LETTERBOXD_RSS_URL, {
      method: "GET",
      headers: { Accept: "application/rss+xml" },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      // Don't read the body — we only need reachability + status.
      // Letterboxd serves ~50KB of RSS XML which is wasted bytes
      // for a health probe. Discarding the body via cancel() lets
      // the connection close early.
    });
    // Body cancel is best-effort — some runtimes honor it, some
    // ignore it. Either way the status code is what we care about.
    res.body?.cancel().catch(() => {});
    return {
      name: "rss",
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      name: "rss",
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function probeTmdb(): Promise<LetterboxdHealthProbe> {
  const start = Date.now();
  if (!isTmdbConfigured()) {
    return {
      name: "tmdb",
      ok: false,
      latencyMs: 0,
      error:
        "TMDB_API_KEY not set — refresh enrichment would fail. " +
        "Add to .env.local before running films:refresh.",
    };
  }
  try {
    // /configuration is the canonical "is TMDB up + key valid"
    // probe. Cheap, doesn't count against most rate limits, and
    // returns 401 on a bad key (different from a 5xx outage), so
    // the status code distinguishes config from upstream issues.
    const res = await fetch(
      `https://api.themoviedb.org/3/configuration?api_key=${getTmdbApiKey()}`,
      {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      },
    );
    res.body?.cancel().catch(() => {});
    return {
      name: "tmdb",
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      name: "tmdb",
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
