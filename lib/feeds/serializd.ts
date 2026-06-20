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

import type {
  Show,
  ShowFavorite,
  ShowList,
  TvSummary,
  WatchedOnlyShow,
} from "./serializd-utils";

// Re-export public types so consumers can import everything from
// either module — same convention as letterboxd.ts.
export type {
  AppliedShow,
  Review,
  ReviewLevel,
  Season,
  Show,
  ShowFavorite,
  ShowFilters,
  ShowList,
  ShowListItem,
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
  /**
   * Editorial-landing data, attached by the slow-cadence
   * scripts/refresh-tv-lists.mjs pass (NOT the hourly refresh).
   * Optional so a snapshot captured before that pass — or by the
   * bootstrap, which preserves but doesn't author these — still
   * validates. Read via getShowLists() / getShowFavorites().
   */
  lists?: ShowList[];
  favorites?: ShowFavorite[];
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
    v.showById !== null &&
    // watchedOnlyShows is consumed via getWatchedOnlyShows() with a
    // ?? [] fallback. Validating it here means an older snapshot
    // (pre-watchedOnlyShows) fails fast at load time rather than
    // silently returning undefined past the fallback. The snapshot
    // is committed and CI-controlled, so this guard mostly catches
    // local refresh-script regressions before they ship.
    Array.isArray(v.watchedOnlyShows)
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
  /** serializdShowId (= TMDB tv id) → Show. The join key for
   *  favorites and list entries, which reference shows by their
   *  numeric Serializd/TMDB id. Shares the snapshot's cache
   *  lifetime so it can't drift. */
  bySerializdId: Map<number, Show>;
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

function buildSerializdIdMap(shows: Show[]): Map<number, Show> {
  const bySerializdId = new Map<number, Show>();
  for (const show of shows) {
    bySerializdId.set(show.serializdShowId, show);
  }
  return bySerializdId;
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
    bySerializdId: buildSerializdIdMap(parsed.shows),
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

/**
 * O(1) lookup by Serializd show id (= TMDB tv id) — the join key
 * carried by favorites and list entries. Returns null when the show
 * isn't in the reviewed corpus, in which case the favorite/list
 * entry renders from its own captured name fallback.
 */
export function getShowBySerializdId(serializdShowId: number): Show | null {
  return loadCache().bySerializdId.get(serializdShowId) ?? null;
}

// ─── Editorial-landing read API (lists + favorites) ───────────────
//
// All three tolerate a snapshot captured before the lists/favorites
// scrape pass ran — they return [] / null rather than throwing. The
// landing maps each list item's showId to a corpus Show via
// getShowBySerializdId() for the rich card. If the publish-set in the
// refresh script is ever cleared, getShowLists() returns [] and the
// Lists surfaces self-hide per the no-placeholder rule.

/** Malcolm's published Serializd lists, in publish-set order. */
export function getShowLists(): ShowList[] {
  return loadSnapshot().lists ?? [];
}

/** O(n) lookup of one list by slug (n = list count, tiny). Returns
 *  null when absent — caller should notFound(). */
export function getShowListBySlug(slug: string): ShowList | null {
  const lists = loadSnapshot().lists ?? [];
  return lists.find((l) => l.slug === slug) ?? null;
}

/** Up to three corpus poster URLs for a list's cover montage — walking
 *  the list's ranked items in order and skipping any whose show isn't in
 *  the reviewed corpus (or lacks a poster). A show repeated across seasons
 *  contributes its poster once. Shared by the landing teaser + lists hub. */
export function showListCoverPosters(list: ShowList): string[] {
  const urls: string[] = [];
  const seen = new Set<number>();
  for (const item of list.items) {
    if (seen.has(item.showId)) continue;
    seen.add(item.showId);
    const show = getShowBySerializdId(item.showId);
    if (show?.posterUrl) urls.push(show.posterUrl);
    if (urls.length >= 3) break;
  }
  return urls;
}

/** Serializd profile favorites, in the order Malcolm arranged them. */
export function getShowFavorites(): ShowFavorite[] {
  return loadSnapshot().favorites ?? [];
}

// ─── Editorial overrides reader ──────────────────────────────────

/**
 * Set of Serializd showIds the user has pinned as "exclude from
 * the /watching page" via data/television/overrides.json#
 * excludeFromWatching. Used by /television/watching to filter
 * out perpetual shows (talk shows, weekly variety) where the
 * in-progress signal is structurally permanent and would clutter
 * the page indefinitely.
 *
 * Read once and cached for the process lifetime, alongside the
 * snapshot cache. The override file is small, edits go through
 * the bootstrap workflow, and a fresh deploy invalidates this
 * automatically since the module reloads.
 *
 * Returns an empty Set when the override file is missing or
 * malformed — fail-soft so a typo in overrides.json never blanks
 * the /watching page.
 */
let cachedWatchingExclusions: Set<number> | null = null;

export function getWatchingExclusions(): Set<number> {
  if (cachedWatchingExclusions) return cachedWatchingExclusions;
  const overridesPath = path.resolve(
    process.cwd(),
    "data/television/overrides.json",
  );
  try {
    const raw = readFileSync(overridesPath, "utf-8");
    const parsed = JSON.parse(raw) as {
      excludeFromWatching?: Record<string, unknown>;
    };
    const map = parsed.excludeFromWatching ?? {};
    const ids = new Set<number>();
    for (const [key, value] of Object.entries(map)) {
      if (key.startsWith("_")) continue;
      if (value !== true) continue;
      const id = Number.parseInt(key, 10);
      if (Number.isFinite(id)) ids.add(id);
    }
    cachedWatchingExclusions = ids;
    return ids;
  } catch {
    cachedWatchingExclusions = new Set();
    return cachedWatchingExclusions;
  }
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
