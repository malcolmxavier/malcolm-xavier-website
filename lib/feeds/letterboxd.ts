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

import type { Film, FilmsSummary } from "./letterboxd-utils";

// Re-export the public types so consumers can import everything from
// either module — same convention as spotify.ts re-exports from
// spotify-utils.ts.
export type {
  AppliedFilm,
  Film,
  FilmFilters,
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
let cachedSnapshot: LetterboxdSnapshot | null = null;

function loadSnapshot(): LetterboxdSnapshot {
  if (cachedSnapshot) return cachedSnapshot;
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
  cachedSnapshot = parsed;
  return cachedSnapshot;
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

// Module-scoped slug map. Built lazily on first lookup; reused
// across requests within the same Node process — same lifetime as
// cachedSnapshot. Built from snap.films because the human-readable
// slug (`<letterboxdSlug>-<releaseYear>`) isn't a key in filmById
// (which uses canonical TMDB ids post-enrichment).
let cachedSlugMap: Map<string, Film> | null = null;

/**
 * O(1) lookup by human-readable URL slug — `<letterboxdSlug>-
 * <releaseYear>`. This is the canonical /films/[slug] URL form and
 * is more SEO-friendly than the TMDB id form. Falls back to id
 * lookup so old `/films/tmdb-X` links still resolve.
 */
export function getFilmBySlug(slug: string): Film | null {
  if (!cachedSlugMap) {
    const snap = loadSnapshot();
    cachedSlugMap = new Map();
    for (const film of snap.films) {
      cachedSlugMap.set(`${film.letterboxdSlug}-${film.releaseYear}`, film);
    }
  }
  return cachedSlugMap.get(slug) ?? getFilmById(slug);
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
  // Lazy-import TMDB client so this server-only module doesn't pull
  // it in unnecessarily for plain page renders. Also lets us return
  // a clean "not configured" probe result without throwing when the
  // env var is missing on a fresh setup.
  const { getTmdbApiKey, isTmdbConfigured } = await import("./tmdb");
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
