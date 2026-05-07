// ─────────────────────────────────────────────────────────────────
// Serializd — server-only data layer.
//
// Snapshot architecture mirrors lib/feeds/letterboxd.ts (see
// lib/feeds/CLAUDE.md for the pattern). /television is snapshot-
// from-day-one: no live API path at request time. The bootstrap
// + incremental refresh scripts produce the snapshot; this file
// reads it. Zero live API calls per render.
//
// Public types live in serializd-utils.ts (re-exported below) so
// client components can type props without crossing the server-only
// boundary.
// ─────────────────────────────────────────────────────────────────

import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import type { Show, TvSummary, WatchedOnlyShow } from "./serializd-utils";

// Re-export public types so consumers can import everything from
// either module — same convention as letterboxd.ts.
export type {
  AppliedShow,
  Review,
  ReviewLevel,
  Season,
  Show,
  ShowFilters,
  ShowSort,
  TmdbTvMeta,
  TvSummary,
  WatchedOnlyShow,
} from "./serializd-utils";

// ─── Snapshot envelope (private) ─────────────────────────────────

/**
 * On-disk shape of `_fixtures/serializd-snapshot.json`. Private to
 * this module — consumers go through `getShows()` /
 * `getShowBySlug()` / `getWatchedOnlyShows()`.
 */
type SerializdSnapshot = {
  capturedAt: string;
  summary: TvSummary;
  shows: Show[];
  showById: Record<string, Show>;
  /** Shadow list: shows the user has watched on Serializd but
   *  never reviewed. Not surfaced in current UI; available for
   *  future iterations via getWatchedOnlyShows. */
  watchedOnlyShows: WatchedOnlyShow[];
};

/**
 * Minimal runtime guard for the snapshot file. We only check the
 * top-level keys consumers immediately access — same approach as
 * letterboxd.ts's isSnapshotShape. Closes the "cryptic 'cannot
 * read property of undefined' deep in the render" failure mode.
 */
function isSnapshotShape(value: unknown): value is SerializdSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.capturedAt === "string" &&
    typeof v.summary === "object" &&
    v.summary !== null &&
    Array.isArray(v.shows) &&
    typeof v.showById === "object" &&
    v.showById !== null
  );
}

const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/serializd-snapshot.json",
);

// Module-scoped cache. Loaded lazily on first read; reused across
// every subsequent call within the same Node process. Vercel
// instances reuse the cached snapshot across requests; cron-style
// invalidation requires a fresh deploy (which is the refresh
// ritual anyway — bootstrap → commit fixture → push → Vercel
// rebuilds).
//
// Both the parsed snapshot AND every derived index share a single
// cache object so they can never drift apart. If the snapshot is
// ever invalidated (HMR, test isolation), every index is dropped
// in the same beat.
//
// `positionByShowId` is the chronological index of each show in
// `snapshot.shows`, used by `/television/[showSlug]` for prev/next
// neighbor nav. Built once at cache-load time so the detail page
// doesn't re-derive it via Array.findIndex on every request.
type SnapshotCache = {
  snapshot: SerializdSnapshot;
  slugMap: Map<string, Show>;
  positionByShowId: Map<string, number>;
};

let cachedState: SnapshotCache | null = null;

function buildSlugMap(shows: Show[]): Map<string, Show> {
  const slugMap = new Map<string, Show>();
  for (const show of shows) {
    slugMap.set(show.slug, show);
  }
  return slugMap;
}

function buildPositionMap(shows: Show[]): Map<string, number> {
  const positionByShowId = new Map<string, number>();
  for (let i = 0; i < shows.length; i++) {
    positionByShowId.set(shows[i].id, i);
  }
  return positionByShowId;
}

function loadCache(): SnapshotCache {
  if (cachedState) return cachedState;
  let raw: string;
  try {
    raw = readFileSync(SNAPSHOT_PATH, "utf-8");
  } catch {
    // Fail loud rather than silently returning empty data. The
    // /television page is meant to render real reviews; an empty
    // page would be a worse signal than a clear "snapshot missing"
    // error in the logs.
    throw new Error(
      `No Serializd snapshot at ${SNAPSHOT_PATH}. ` +
        `Run \`npm run television:bootstrap\` to capture one (requires ` +
        `TMDB_API_KEY in .env.local; see scripts/bootstrap-serializd-` +
        `snapshot.mjs for the polite-paginate workflow).`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Serializd snapshot at ${SNAPSHOT_PATH} is not valid JSON: ` +
        (err instanceof Error ? err.message : String(err)),
    );
  }
  if (!isSnapshotShape(parsed)) {
    throw new Error(
      `Serializd snapshot at ${SNAPSHOT_PATH} is malformed (missing ` +
        `capturedAt / summary / shows / showById). Recapture with ` +
        `\`npm run television:bootstrap\`.`,
    );
  }
  cachedState = {
    snapshot: parsed,
    slugMap: buildSlugMap(parsed.shows),
    positionByShowId: buildPositionMap(parsed.shows),
  };
  return cachedState;
}

function loadSnapshot(): SerializdSnapshot {
  return loadCache().snapshot;
}

// ─── Read API ────────────────────────────────────────────────────

/**
 * Hand the /television page everything it needs in one call: the
 * shows array (already sorted latestActivityDate desc by the
 * snapshot writer), the lifetime summary block (pre-aggregated
 * for the stats panel), and the snapshot's capturedAt for any
 * "data as of" surfacing.
 */
export function getShows(): {
  shows: Show[];
  summary: TvSummary;
  capturedAt: string;
} {
  const snap = loadSnapshot();
  return {
    shows: snap.shows,
    summary: snap.summary,
    capturedAt: snap.capturedAt,
  };
}

/**
 * Read API for the watched-only shadow list — shows the user has
 * marked watched on Serializd but never reviewed. No current UI
 * consumer; future surfaces import this when they need the data.
 * Returns the full array per snapshot read since the count is
 * small (typically <500 entries).
 */
export function getWatchedOnlyShows(): WatchedOnlyShow[] {
  return loadSnapshot().watchedOnlyShows ?? [];
}

/**
 * O(1) lookup for `/television/[showSlug]`. The slug key is the
 * canonical URL form (`<slugifiedName>-<premiereYear>`). Returns
 * null when the slug isn't in the snapshot — caller should
 * `notFound()`. Falls back to id lookup for old `/television/
 * tmdb-tv-X` links, matching the /films `getFilmBySlug` shape.
 */
export function getShowBySlug(slug: string): Show | null {
  const cache = loadCache();
  return cache.slugMap.get(slug) ?? cache.snapshot.showById[slug] ?? null;
}

/**
 * O(1) lookup of a show's chronological neighbors in the
 * snapshot's sorted shows array — used by `/television/[showSlug]`
 * for the prev/next adjacent-show nav. The position map is built
 * once at cache-load time so this avoids the per-render findIndex
 * pass over all shows. Returns null on either side at the array
 * boundary.
 */
export function getShowNeighbors(showId: string): {
  newer: Show | null;
  older: Show | null;
} {
  const cache = loadCache();
  const idx = cache.positionByShowId.get(showId);
  if (idx === undefined) return { newer: null, older: null };
  const shows = cache.snapshot.shows;
  return {
    newer: idx > 0 ? shows[idx - 1] : null,
    older: idx + 1 < shows.length ? shows[idx + 1] : null,
  };
}

// ─── Diagnostic ──────────────────────────────────────────────────

/**
 * Lightweight snapshot freshness signal — used by any future
 * /api/serializd/health endpoint and any "data as of" caption on
 * /television. Mirrors getLetterboxdSnapshotMeta() from
 * letterboxd.ts.
 */
export function getSerializdSnapshotMeta(): {
  capturedAt: string;
  ageDays: number;
  showCount: number;
  reviewCount: number;
} {
  const snap = loadSnapshot();
  const ageMs = Date.now() - new Date(snap.capturedAt).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  return {
    capturedAt: snap.capturedAt,
    ageDays,
    showCount: snap.summary.totalShows,
    reviewCount:
      snap.summary.totalShowReviews +
      snap.summary.totalSeasonReviews +
      snap.summary.totalEpisodeReviews,
  };
}
