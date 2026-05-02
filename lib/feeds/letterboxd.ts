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
 * Lightweight snapshot freshness signal — used by the (forthcoming)
 * /api/letterboxd/health endpoint and any future "data as of" caption
 * on /films. Mirrors getSnapshotMeta() from spotify.ts.
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
