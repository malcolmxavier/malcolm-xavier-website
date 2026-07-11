#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// bootstrap-serializd-snapshot.mjs
//
// Orchestrator: paginate Malcolm's Serializd diary, group reviews
// by show, enrich each unique show via TMDB, run the editorial-
// cleaning pass, and write the snapshot fixture that
// lib/feeds/serializd.ts will read at request time.
//
// Output:
//   • lib/feeds/_fixtures/serializd-snapshot.json (the fixture)
//   • data/television/cleanup/*.md (seven editorial reports)
//
// Workflow (per PLAN.md §Refresh workflow §Bootstrap):
//   1. Paginate /api/user/malxavi/diary?page=1..N&include_target=ALL
//   2. Group reviews by showId; build Show skeleton from each
//      review's embedded showName / showPremiereDate / showSeasons
//   3. Compute per-review level + transform 1-10 ratings → 0.5-5
//   4. Enrich each unique show via TMDB /tv/{id}
//   5. Compute per-show classification (reviewedSeasonNumbers /
//      inProgressSeasonNumbers / hasShowReview / latestActivityDate
//      etc.)
//   6. Aggregate TvSummary
//   7. Build snapshot envelope
//   8. Run editorial-cleaning pass; write reports
//   9. If any BLOCKING category has unresolved entries, exit 1
//      WITHOUT writing the snapshot — fail loudly so a broken
//      enrichment never gets shipped to /television
//   10. Otherwise, diff against previous snapshot, write fixture,
//      print summary
//
// Run via:
//   npm run television:bootstrap
// or:
//   node --env-file=.env.local scripts/bootstrap-serializd-snapshot.mjs
//
// Then review the diff + the cleanup reports, commit both the
// fixture AND the reports, push. Vercel rebuilds.
// ─────────────────────────────────────────────────────────────────

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { enrichShows } from "./enrich-serializd-tmdb.mjs";
import {
  CLEANUP_CATEGORIES,
  renderReport,
} from "../lib/feeds/serializd-cleanup.mjs";
import { modesForReview } from "../lib/feeds/serializd-mode-counts.mjs";

// ─── Paths ───────────────────────────────────────────────────────

const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/serializd-snapshot.json",
);
const CLEANUP_DIR = path.resolve(
  process.cwd(),
  "data/television/cleanup",
);
const SERIALIZD_USER = "malxavi";
const SERIALIZD_API_BASE = "https://serializd.onrender.com";

// ─── Polite-client knobs ─────────────────────────────────────────
//
// The plan describes the Serializd integration as "politely
// unofficial" — read-only, low-volume, identifying ourselves
// clearly, with no live request path. Concrete posture:
//   • One request per page (28 cold, 1 incremental)
//   • 500ms gap between pages so a full bootstrap (~28 requests)
//     spreads over ~14 seconds rather than hammering
//   • Identifying User-Agent that points back to the site so the
//     Serializd team can reach out if they want to (or block, or
//     ask us to use a different endpoint)
//   • The X-Requested-With header is what their own React frontend
//     sends; matches their expected client surface

const PAGE_GAP_MS = 500;
const SAFETY_MAX_PAGES = 100; // hard cap so a runaway can't paginate forever
const PAGE_SIZE = 24; // observed Serializd page size

const SERIALIZD_HEADERS = {
  "X-Requested-With": "serializd_vercel",
  // ASCII-only — HTTP header values must be ByteString. An em-dash here
  // would throw "Cannot convert argument to a ByteString" at fetch time;
  // use plain hyphens for separators in headers.
  "User-Agent":
    "malxavi.com /television cluster - read-only, snapshot-driven, hourly (https://malxavi.com)",
};

const FULL_ENRICH =
  process.argv.includes("--full-enrich") ||
  process.env.TV_FULL_ENRICH === "1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Helpers duplicated from lib/feeds/serializd-utils.ts ────────
//
// Plain `node` can't import .ts, so the two helpers the bootstrap
// needs (level discriminator + show-name slugifier) are duplicated
// here. Keep these in lockstep with the TS originals — if you
// change the rules in serializd-utils.ts, mirror the change here.
// (The test file lib/feeds/serializd.test.ts covers the TS
// versions; this duplication is the cost of the no-bundler script
// posture documented in lib/feeds/CLAUDE.md.)

function inferReviewLevel(api) {
  if (api.seasonId === null || api.seasonId === undefined) return "show";
  if (api.episodeNumber === null || api.episodeNumber === undefined) return "season";
  return "episode";
}

function slugifyShow(name) {
  return name
    .toLowerCase()
    .replace(/[''']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Pagination ──────────────────────────────────────────────────

/**
 * Pull every page of Serializd's watched-list — the user's full
 * tracked-seasons data (independent of reviews). Endpoint:
 * `/api/user/<user>/watchedpage_v2/<page>?sort_by=...`. Each
 * entry returns:
 *   { showId, seasonIds: number[], dateAdded, showName, ... }
 *
 * Returns a Map<showId, Set<seasonId>> for O(1) lookup during
 * the deriveShowFields pass. The seasonIds are TMDB season ids
 * (matching show.seasons[].serializdId in our schema), so the
 * downstream join is direct.
 *
 * Mirrors fetchAllReviews's pagination posture — uses the
 * response's `totalPages` as the loop bound so partial-fill
 * pages don't silently truncate the catalog.
 */
async function fetchAllWatchedSeasons() {
  // Two parallel structures from the same fetch:
  //   • seasonIdsByShow: showId → Set<seasonId>. Used by
  //     deriveShowFields to compute watchedUnreviewedSeasonNumbers
  //     for shows in the diary slice.
  //   • itemsByShow: showId → raw API item. Captures the full
  //     show-level metadata (name, premiereDate, banner, totals)
  //     so we can carry watched-only shows into the snapshot's
  //     `watchedOnlyShows` array without re-hitting the API.
  // First-write-wins on duplicates within a single fetch — the
  // API returns one item per show with its full seasonIds list,
  // but we defend against future pagination weirdness.
  const seasonIdsByShow = new Map();
  const itemsByShow = new Map();
  let totalPages = SAFETY_MAX_PAGES;
  for (let page = 1; page <= Math.min(totalPages, SAFETY_MAX_PAGES); page++) {
    const url = `${SERIALIZD_API_BASE}/api/user/${SERIALIZD_USER}/watchedpage_v2/${page}?sort_by=date_added_desc`;
    const res = await fetch(url, { headers: SERIALIZD_HEADERS });
    if (!res.ok) {
      throw new Error(
        `Serializd watchedpage_v2 ${page} failed: ${res.status} ${res.statusText}.`,
      );
    }
    const json = await res.json();
    if (page === 1 && typeof json.totalPages === "number" && json.totalPages > 0) {
      totalPages = json.totalPages;
    }
    const items = json.items ?? [];
    for (const item of items) {
      if (typeof item.showId !== "number") continue;
      const ids = Array.isArray(item.seasonIds) ? item.seasonIds : [];
      const set = seasonIdsByShow.get(item.showId) ?? new Set();
      for (const id of ids) {
        if (typeof id === "number") set.add(id);
      }
      seasonIdsByShow.set(item.showId, set);
      if (!itemsByShow.has(item.showId)) itemsByShow.set(item.showId, item);
    }
    process.stderr.write(
      `\r        watched page ${page}/${totalPages} → ${items.length} shows (total tracked ${seasonIdsByShow.size})…`,
    );
    if (items.length === 0) break;
    if (page < totalPages) await sleep(PAGE_GAP_MS);
  }
  process.stderr.write("\n");
  return { seasonIdsByShow, itemsByShow };
}

/**
 * Pull every page of the diary. Uses the response's `totalPages`
 * field (returned on every page) as the loop bound — Serializd's
 * pages can be partial mid-paginate (we observed page 8 = 22
 * reviews, page 9 = 23 reviews on the same catalog), so the
 * naive "stop when fewer than PAGE_SIZE" terminator silently
 * truncates. Falls back to "empty page" as a safety net in case
 * `totalPages` is ever missing/zero.
 *
 * Returns a flat array of raw API review objects. The 500ms inter-
 * page gap is the politeness budget — total wall time on a cold
 * bootstrap is ~29 pages × 500ms = ~14.5s, plus per-page latency.
 */
async function fetchAllReviews() {
  const all = [];
  let totalPages = SAFETY_MAX_PAGES; // updated from page 1 response below
  for (let page = 1; page <= Math.min(totalPages, SAFETY_MAX_PAGES); page++) {
    const url = `${SERIALIZD_API_BASE}/api/user/${SERIALIZD_USER}/diary?page=${page}&include_target=ALL`;
    const res = await fetch(url, { headers: SERIALIZD_HEADERS });
    if (!res.ok) {
      throw new Error(
        `Serializd diary page ${page} failed: ${res.status} ${res.statusText}. ` +
          `URL: ${url}`,
      );
    }
    const json = await res.json();
    const reviews = json.reviews ?? [];
    all.push(...reviews);
    if (page === 1 && typeof json.totalPages === "number" && json.totalPages > 0) {
      totalPages = json.totalPages;
    }
    process.stderr.write(
      `\r        page ${page}/${totalPages} → ${reviews.length} reviews (total ${all.length})…`,
    );
    if (reviews.length === 0) break; // safety net for empty page
    if (page < totalPages) await sleep(PAGE_GAP_MS);
  }
  process.stderr.write("\n");
  return all;
}

// ─── Build skeleton ──────────────────────────────────────────────

/**
 * Group raw API reviews by showId and build the Show skeleton
 * (everything except the TMDB enrichment). Show metadata
 * (name, premiereDate, seasons) is taken from the FIRST review
 * we encounter for that show — Serializd embeds full show metadata
 * in every review so any one of them suffices.
 *
 * Reviews are deduped by Serializd's stable `id` field (the most
 * reliable dedupe key per the plan; better than (showId,
 * seasonId, watchedDate) which can collide on same-day double-
 * logs that the cleanup pass surfaces separately).
 *
 * Returns an array of Show objects with `tmdb: null` and partial
 * derived fields — enrichShows fills tmdb + posterUrl, then the
 * post-enrich pass below computes classification.
 */
function buildSkeletonShows(rawReviews) {
  const showMap = new Map(); // showId -> Show
  const seenReviewIds = new Set(); // dedupe by Serializd review.id
  // Serializd embeds the show's CURRENT season list (`showSeasons`)
  // in every diary review. initShow only reads it from the FIRST
  // review it encounters for a show, which can predate a just-aired
  // season. We union it across ALL of a show's reviews here so the
  // newest embed's seasons are captured too, and stash the union in
  // a side map — deliberately NOT on the show object, because the
  // snapshot serializes the `shows` array verbatim and this is
  // internal scaffolding. reconcileOrphanSeasons consumes it after
  // enrichment to restore seasons TMDB hasn't listed yet.
  const serializdSeasonsByShow = new Map(); // showId -> Map<seasonId, {seasonNumber,name,posterPath}>

  for (const r of rawReviews) {
    if (seenReviewIds.has(r.id)) continue;
    seenReviewIds.add(r.id);

    const review = normalizeReview(r);
    if (!showMap.has(r.showId)) {
      showMap.set(r.showId, initShow(r));
    }
    showMap.get(r.showId).reviews.push(review);

    // Union this review's embedded showSeasons into the side map.
    // First id wins (they're identical across a show's reviews in
    // the common case; we just need coverage of every season any
    // review mentions).
    const seasonMap = serializdSeasonsByShow.get(r.showId) ?? new Map();
    for (const s of r.showSeasons ?? []) {
      if (s?.id == null || seasonMap.has(s.id)) continue;
      seasonMap.set(s.id, {
        seasonNumber: s.seasonNumber,
        name: s.name ?? `Season ${s.seasonNumber}`,
        posterPath: s.posterPath ?? null,
      });
    }
    serializdSeasonsByShow.set(r.showId, seasonMap);
  }

  return { shows: [...showMap.values()], serializdSeasonsByShow };
}

/** Transform a raw API review into our snapshot Review shape. */
function normalizeReview(r) {
  return {
    id: r.id,
    level: inferReviewLevel(r),
    // Serializd's API rating is 1-10 integer; their UI shows 0.5-5
    // halves. We mirror the UI form so StarRating, the rating
    // chart, and the rating-filter chips can be reused as-is from
    // /films. Unrated reviews come back as 0 from the API; we
    // normalize to null per the rating convention in
    // serializd-utils.ts.
    rating:
      typeof r.rating === "number" && r.rating > 0 ? r.rating / 2 : null,
    liked: Boolean(r.like), // API key is `like`; we rename to `liked` for parity with /films
    reviewText: r.reviewText ?? "",
    containsSpoiler: Boolean(r.containsSpoiler),
    isRewatch: Boolean(r.isRewatch),
    isLog: Boolean(r.isLog),
    // Serializd returns full ISO datetimes for both fields (with
    // time + zone). We keep the full string in the snapshot so
    // we can sort by sub-day precision; display formatters strip
    // the time portion via slice(0, 10).
    watchedDate: r.backdate,
    reviewDate: r.dateAdded,
    seasonId: r.seasonId ?? null,
    episodeNumber:
      typeof r.episodeNumber === "number" ? r.episodeNumber : null,
    // Normalize empty episodeName ("" — Serializd's default for
    // non-episode reviews) to null so consumers can null-check
    // uniformly.
    episodeName:
      typeof r.episodeName === "string" && r.episodeName.trim() !== ""
        ? r.episodeName
        : null,
    tags: Array.isArray(r.tags) ? r.tags : [],
  };
}

/**
 * Initialize a Show from the first review's embedded show metadata.
 * Fields that depend on enrichment / aggregation (tmdb, posterUrl,
 * ratingSet, classification arrays, latestActivityDate, etc.) get
 * sensible defaults that the post-enrich pass overwrites.
 *
 * The `seasons` array is seeded from Serializd's embedded
 * showSeasons (which mirror TMDB's seasons[]) — this gives us a
 * reasonable fallback display even if TMDB enrichment fails. The
 * enricher overwrites this with the canonical TMDB version.
 */
function initShow(r) {
  const premiereYear = r.showPremiereDate
    ? Number.parseInt(r.showPremiereDate.slice(0, 4), 10)
    : 0;
  const showName = r.showName ?? "";
  return {
    // Seed id; promoted to `tmdb-tv-${id}` once enrichment lands.
    id: `serializd-tv-${r.showId}`,
    serializdShowId: r.showId,
    slug: `${slugifyShow(showName)}-${premiereYear}`,
    name: showName,
    premiereYear,
    premiereDate: r.showPremiereDate ?? "",
    serializdUrl: `https://serializd.com/show/${r.showId}`,
    tmdb: null,
    posterUrl: null,
    posterFallbackUrl: null,
    seasons: (r.showSeasons ?? []).map((s) => ({
      serializdId: s.id,
      showId: r.showId,
      seasonNumber: s.seasonNumber,
      name: s.name ?? `Season ${s.seasonNumber}`,
      posterPath: s.posterPath ?? null,
      // Serializd's diary-embedded showSeasons doesn't carry
      // episode_count — the enricher overwrites this with TMDB's
      // count, but we keep the field present (null) here so the
      // skeleton's Season shape stays type-safe before enrichment
      // lands.
      episodeCount: null,
    })),
    reviews: [],
    ratingSet: [],
    watchedYearSet: [],
    reviewedSeasonNumbers: [],
    inProgressSeasonNumbers: [],
    watchedUnreviewedSeasonNumbers: [],
    hasShowReview: false,
    // Default false; deriveShowFields recomputes once enrichment
    // has populated `tmdb` and overrides are loaded.
    isMiniseries: false,
    latestActivityDate: "",
    primaryRating: null,
    liked: false,
  };
}

/**
 * Resolve a show's miniseries status per PLAN.md §Miniseries
 * classifier precedence:
 *   1. overrides.json#isMiniseries[showId] (explicit pin) → use it
 *   2. else if tmdb.type === "Miniseries" → true
 *   3. else → false
 *
 * Plain function rather than inline so the rule is testable in
 * isolation and so the precedence stays in one place.
 */
function resolveIsMiniseries(show, overrides) {
  const explicit = overrides.isMiniseries[show.serializdShowId];
  if (typeof explicit === "boolean") return explicit;
  if (show.tmdb?.type === "Miniseries") return true;
  return false;
}

// ─── Post-enrichment derivation ──────────────────────────────────

/**
 * After enrichment, walk each show's reviews to compute the
 * classification arrays, rating/year sets, and the
 * latestActivityDate / primaryRating / liked fields. Also sorts
 * reviews reviewDate desc so consumers can rely on `reviews[0]`
 * being newest.
 *
 * The classification predicate (the load-bearing rule from PLAN.md
 * §Per-season classification):
 *   • If a Season-level review exists for (showId, seasonNumber):
 *     → reviewedSeasonNumbers
 *   • Else if no Season review AND no Show review on this show AND
 *     at least one QUALIFYING episode review exists for that
 *     season → inProgressSeasonNumbers
 *   • Else: neither (TMDB-known but unwatched, OR a miniseries
 *     suppressed by the Show-review rule)
 *
 * "Qualifying" episode review per the plan = rated OR with prose.
 * Episode logs without either don't trigger in-progress placement
 * (they're noise, not signal).
 */
function deriveShowFields(show, overrides, watchedSeasonsByShowId) {
  show.isMiniseries = resolveIsMiniseries(show, overrides);
  // Watched-but-unreviewed candidates come from two sources,
  // applied as a UNION:
  //   1. Serializd's watchedpage_v2 API — the canonical source.
  //      Per-show set of TMDB season ids the user has marked
  //      watched on Serializd. Translated to season numbers by
  //      joining against the show's seasons[] array.
  //   2. overrides.json#watchedSeasons — additive fallback for
  //      cases the API misses (e.g. seasons watched pre-Serializd
  //      that were never logged anywhere). Manually-curated; the
  //      cleanup pass surfaces edge cases for Malcolm's review.
  // Applied as a UNION (not just override-as-primary) so the API
  // signal is the default and overrides only need to add the
  // gaps. Dedupe against reviewed + in-progress at the end of
  // this function so the final list is mutually exclusive with
  // the other status buckets.
  const apiWatchedSeasonIds =
    watchedSeasonsByShowId.get(show.serializdShowId) ?? new Set();
  const overrideWatchedNums = Array.isArray(
    overrides.watchedSeasons[show.serializdShowId],
  )
    ? overrides.watchedSeasons[show.serializdShowId]
    : [];
  // Translate API seasonIds → seasonNumbers via show.seasons.
  const apiWatchedNums = [];
  for (const season of show.seasons) {
    if (apiWatchedSeasonIds.has(season.serializdId)) {
      apiWatchedNums.push(season.seasonNumber);
    }
  }
  const watchedRaw = [...new Set([...apiWatchedNums, ...overrideWatchedNums])];
  // Sort reviews newest-first by reviewDate.
  show.reviews.sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));

  const ratingSet = new Set();
  const watchedYearSet = new Set();
  const reviewedSeasons = new Set();
  const seasonsWithQualifyingEpisodes = new Set();
  let hasShowReview = false;
  let latestActivityDate = "";

  for (const r of show.reviews) {
    if (r.rating !== null) ratingSet.add(r.rating);
    if (r.watchedDate) {
      const year = Number.parseInt(r.watchedDate.slice(0, 4), 10);
      if (Number.isFinite(year)) watchedYearSet.add(year);
    }
    if (r.reviewDate > latestActivityDate) latestActivityDate = r.reviewDate;

    if (r.level === "show") {
      hasShowReview = true;
    } else if (r.level === "season") {
      const sn = seasonNumberFor(show, r);
      if (sn !== null) reviewedSeasons.add(sn);
    } else if (r.level === "episode") {
      const sn = seasonNumberFor(show, r);
      const qualifying =
        r.rating !== null || r.reviewText.trim() !== "";
      if (sn !== null && qualifying) seasonsWithQualifyingEpisodes.add(sn);
    }
  }

  show.hasShowReview = hasShowReview;
  show.reviewedSeasonNumbers = [...reviewedSeasons].sort((a, b) => a - b);
  // In-progress: episode-only seasons (no Season review) AND show
  // doesn't have a Show-level review (rule 3 from the plan
  // suppresses miniseries from /watching).
  if (hasShowReview) {
    show.inProgressSeasonNumbers = [];
  } else {
    show.inProgressSeasonNumbers = [...seasonsWithQualifyingEpisodes]
      .filter((sn) => !reviewedSeasons.has(sn))
      .sort((a, b) => a - b);
  }
  show.ratingSet = [...ratingSet].sort((a, b) => a - b);
  show.watchedYearSet = [...watchedYearSet].sort((a, b) => a - b);
  show.latestActivityDate = latestActivityDate;
  show.primaryRating = show.reviews[0]?.rating ?? null;
  show.liked = show.reviews[0]?.liked ?? false;

  // Compute watchedUnreviewedSeasonNumbers now that the reviewed +
  // in-progress sets are settled. Filter watchedRaw to seasons that
  // (a) exist on the show per TMDB seasons[], and (b) aren't already
  // tracked in either review-status bucket. Sort asc for display.
  const reviewedNumSet = new Set(show.reviewedSeasonNumbers);
  const inProgressNumSet = new Set(show.inProgressSeasonNumbers);
  const validSeasonNums = new Set(show.seasons.map((s) => s.seasonNumber));
  show.watchedUnreviewedSeasonNumbers = (
    Array.isArray(watchedRaw) ? watchedRaw : []
  )
    .filter(
      (sn) =>
        typeof sn === "number" &&
        validSeasonNums.has(sn) &&
        !reviewedNumSet.has(sn) &&
        !inProgressNumSet.has(sn),
    )
    .sort((a, b) => a - b);

  // Promote canonical id once tmdb is known. The seed id stays
  // valid as a slug fallback for shows that never resolve.
  if (show.tmdb) {
    show.id = `tmdb-tv-${show.tmdb.id}`;
    // Refresh the slug from the TMDB-canonical name in case it
    // differs from Serializd's embedded showName.
    if (show.tmdb.name) {
      show.name = show.tmdb.name;
      show.slug = `${slugifyShow(show.tmdb.name)}-${show.premiereYear}`;
    }
  }
}

function seasonNumberFor(show, review) {
  if (review.seasonId === null) return null;
  const season = show.seasons.find((s) => s.serializdId === review.seasonId);
  return season ? season.seasonNumber : null;
}

/**
 * Restore seasons that Serializd knows about but TMDB hasn't listed
 * yet. TMDB metadata lags real-world air dates (especially for
 * reality / unscripted shows); when a just-aired season isn't in
 * TMDB's `details.seasons`, the TMDB-derived `show.seasons` array
 * omits it, and every review logged against that season fails to
 * resolve in `seasonNumberFor` (returns null). Those reviews then
 * fall out of every classification bucket silently — the season
 * never reaches /television/watching or the show's detail page.
 *
 * Runs AFTER enrichment (which sets the TMDB seasons) and BEFORE
 * classification. For each seasonId a show's reviews reference that
 * isn't already in `show.seasons`, it looks up the season's number
 * in the Serializd `showSeasons` embed (unioned across the show's
 * reviews by buildSkeletonShows), then:
 *
 *   • New season number — TMDB genuinely hasn't listed it: append a
 *     synthesized season with `episodeCount: null`. The /watching
 *     card and detail page null-check the denominator, so a card
 *     reads "3 episodes watched" (no "of N") until TMDB catches up
 *     and a full-enrich fills the count.
 *
 *   • Number already present under a DIFFERENT serializdId — Serializd
 *     and TMDB issued different ids for the same season: canonicalize
 *     the orphan reviews onto the existing season's id instead of
 *     adding a duplicate-numbered season (which would double-render
 *     the season block on the detail page).
 *
 *   • Number unknown — the embed didn't carry it either: leave the
 *     reviews unresolved so the `unresolved-seasons` cleanup category
 *     surfaces them. Never a silent drop.
 *
 * Returns { reconciled, aliased, unresolved } counts for the log.
 */
function reconcileOrphanSeasons(shows, serializdSeasonsByShow) {
  let reconciled = 0;
  let aliased = 0;
  let unresolved = 0;

  for (const show of shows) {
    const unionForShow = serializdSeasonsByShow.get(show.serializdShowId);
    const existingIds = new Set(show.seasons.map((s) => s.serializdId));
    const seasonByNumber = new Map(
      show.seasons.map((s) => [s.seasonNumber, s]),
    );

    // Distinct seasonIds this show's reviews reference that aren't
    // already represented in show.seasons.
    const orphanIds = new Set();
    for (const r of show.reviews) {
      if (r.seasonId != null && !existingIds.has(r.seasonId)) {
        orphanIds.add(r.seasonId);
      }
    }
    if (orphanIds.size === 0) continue;

    let mutated = false;
    for (const seasonId of orphanIds) {
      const meta = unionForShow?.get(seasonId);
      if (!meta || typeof meta.seasonNumber !== "number") {
        // Serializd's embed didn't carry this season either — can't
        // place it. Left for the unresolved-seasons cleanup report.
        unresolved++;
        continue;
      }

      const existing = seasonByNumber.get(meta.seasonNumber);
      if (existing) {
        // Same season number, different id — canonicalize the orphan
        // reviews onto the id already in show.seasons.
        for (const r of show.reviews) {
          if (r.seasonId === seasonId) r.seasonId = existing.serializdId;
        }
        aliased++;
      } else {
        // A season TMDB hasn't listed yet — synthesize it.
        const synthesized = {
          serializdId: seasonId,
          showId: show.tmdb ? show.tmdb.id : show.serializdShowId,
          seasonNumber: meta.seasonNumber,
          name: meta.name ?? `Season ${meta.seasonNumber}`,
          posterPath: meta.posterPath ?? null,
          episodeCount: null,
        };
        show.seasons.push(synthesized);
        seasonByNumber.set(meta.seasonNumber, synthesized);
        existingIds.add(seasonId);
        mutated = true;
        reconciled++;
      }
    }

    // Keep seasons in seasonNumber-ascending order — the detail page
    // and card builders assume it. Only re-sort if we appended.
    if (mutated) show.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
  }

  return { reconciled, aliased, unresolved };
}

// ─── Aggregate summary ────────────────────────────────────────────

/**
 * Aggregate the snapshot's per-mode summary stats. Implements the
 * miniseries double-count rule from PLAN.md §Miniseries classifier:
 *
 *   | Review level | Miniseries? | Seasons mode | Shows mode | Episodes mode |
 *   |--------------|-------------|--------------|------------|---------------|
 *   | Show         | yes         | +1           | +1         | —             |
 *   | Show         | no          | —            | +1         | —             |
 *   | Season       | yes         | +1           | +1         | —             |
 *   | Season       | no          | +1           | —          | —             |
 *   | Episode      | (any)       | —            | —          | +1            |
 *
 * The double-count IS intentional — a Season review on a flagged
 * miniseries IS both a season-equivalent (one watchable unit
 * Malcolm finished) AND a show review (he reviewed the entire
 * show). It earns one count in each mode.
 *
 * Note: this rule applies to the SUMMARY only. Card placement on
 * the listing stays review-driven (a Season review still renders
 * as a Season card, even on a miniseries-flagged show). See the
 * CompletedCard / CardKind comments in serializd-utils for the
 * grid-vs-summary split.
 */
function aggregateSummary(shows) {
  const currentYear = new Date().getUTCFullYear();
  let totalShowReviews = 0;
  let totalSeasonReviews = 0;
  let totalEpisodeReviews = 0;
  let showsInProgressCount = 0;
  let thisYearCount = 0;
  const ratingDist = {};
  const ratingDistByLevel = { show: {}, season: {}, episode: {} };
  const genreDist = {};
  const decadeDist = {};

  for (const show of shows) {
    if (show.inProgressSeasonNumbers.length > 0) showsInProgressCount++;

    // "Watched this year" = any review activity in current calendar
    // year. Uses watchedDate (not reviewDate) so the count matches
    // user intuition — Malcolm watched it this year, even if he
    // typed up the review later.
    const watchedThisYear = show.reviews.some(
      (r) =>
        r.watchedDate &&
        Number.parseInt(r.watchedDate.slice(0, 4), 10) === currentYear,
    );
    if (watchedThisYear) thisYearCount++;

    for (const r of show.reviews) {
      const ratingKey = r.rating !== null ? String(r.rating) : null;
      // Per-mode bucketing — single-source-of-truth helper in
      // lib/feeds/serializd-mode-counts.mjs. Returns the list of
      // mode buckets this review contributes to (covers the
      // miniseries double-count rule). Don't hand-roll this here —
      // any drift between this loop and the in-year loop in
      // app/television/page.tsx is exactly what the helper exists
      // to prevent.
      for (const mode of modesForReview(r.level, show.isMiniseries)) {
        if (mode === "show") totalShowReviews++;
        else if (mode === "season") totalSeasonReviews++;
        else if (mode === "episode") totalEpisodeReviews++;
        if (ratingKey) addToBucket(ratingDistByLevel[mode], ratingKey);
      }

      // Lifetime distribution stays one-count-per-review (no
      // miniseries double-count) — it's the "all levels combined"
      // baseline, not a per-mode view.
      if (ratingKey) addToBucket(ratingDist, ratingKey);
    }

    if (show.tmdb?.genres) {
      for (const g of show.tmdb.genres) {
        genreDist[g] = (genreDist[g] ?? 0) + 1;
      }
    }

    if (Number.isFinite(show.premiereYear) && show.premiereYear > 0) {
      const decade = `${Math.floor(show.premiereYear / 10) * 10}s`;
      decadeDist[decade] = (decadeDist[decade] ?? 0) + 1;
    }
  }

  return {
    totalShows: shows.length,
    totalShowReviews,
    totalSeasonReviews,
    totalEpisodeReviews,
    ratingDistribution: ratingDist,
    ratingDistributionByLevel: ratingDistByLevel,
    genreDistribution: genreDist,
    decadeDistribution: decadeDist,
    showsInProgressCount,
    thisYearCount,
  };
}

function addToBucket(bucket, key) {
  bucket[key] = (bucket[key] ?? 0) + 1;
}

// ─── Snapshot envelope ────────────────────────────────────────────

function buildSnapshot(shows) {
  // Sort shows by latestActivityDate desc so the snapshot's natural
  // order matches the listing page's default sort (no per-render
  // re-sort needed).
  shows.sort((a, b) => b.latestActivityDate.localeCompare(a.latestActivityDate));
  const summary = aggregateSummary(shows);
  const showById = {};
  for (const s of shows) showById[s.id] = s;
  return {
    capturedAt: new Date().toISOString(),
    summary,
    shows,
    showById,
  };
}

// ─── Cleanup pass ─────────────────────────────────────────────────

/**
 * Run all seven cleanup categories against the snapshot. When
 * `writeReports` is true, writes each category's report to
 * data/television/cleanup/<filename>, preserving any `# Accepted:`
 * block from the previous version.
 *
 * The Vercel cron route passes `writeReports: false` because the
 * function filesystem is read-only at request time, and the
 * cleanup .md files are editorial-only artifacts that don't need
 * to refresh on every cron tick. The blocking-issue check still
 * runs (reading any bundled-with-the-deploy report so accepted
 * rows aren't re-flagged), so a busted enrichment still aborts
 * the push.
 *
 * Returns { hasBlockingIssues } — true if any blocking category
 * has unresolved (un-accepted) entries.
 */
function runCleanupPass(snapshot, overrides, { writeReports = true } = {}) {
  if (writeReports && !existsSync(CLEANUP_DIR)) {
    mkdirSync(CLEANUP_DIR, { recursive: true });
  }
  let hasBlockingIssues = false;
  console.log("\n[cleanup] Running editorial-cleaning pass…");
  for (const category of CLEANUP_CATEGORIES) {
    const rows = category.runner(snapshot, overrides);
    const filePath = path.join(CLEANUP_DIR, category.filename);
    const existing = existsSync(filePath)
      ? readFileSync(filePath, "utf-8")
      : null;
    const { content, hasUnacceptedRows } = renderReport(
      category,
      rows,
      existing,
    );
    if (writeReports) {
      writeFileSync(filePath, content + "\n");
    }
    const status = hasUnacceptedRows
      ? `${rows.length} unresolved`
      : "clean";
    const flag =
      category.severity === "blocking" && hasUnacceptedRows
        ? " ❌ BLOCKING"
        : "";
    console.log(`        ${category.filename.padEnd(28)} ${status}${flag}`);
    if (category.severity === "blocking" && hasUnacceptedRows) {
      hasBlockingIssues = true;
    }
  }
  return { hasBlockingIssues };
}

// ─── Diff vs previous snapshot ────────────────────────────────────

function readPreviousSnapshot() {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function loadOverridesFromDisk() {
  const p = path.resolve(process.cwd(), "data/television/overrides.json");
  if (!existsSync(p)) {
    return { tmdbId: {}, posterPath: {}, isMiniseries: {}, watchedSeasons: {} };
  }
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8"));
    return {
      tmdbId: raw.tmdbId ?? {},
      posterPath: raw.posterPath ?? {},
      isMiniseries: raw.isMiniseries ?? {},
      watchedSeasons: raw.watchedSeasons ?? {},
    };
  } catch {
    return { tmdbId: {}, posterPath: {}, isMiniseries: {}, watchedSeasons: {} };
  }
}

function printDiff(prev, next) {
  if (!prev) {
    console.log("\nFirst snapshot — no diff to compute.");
    return;
  }
  const prevShows = new Set(prev.shows?.map((s) => s.id) ?? []);
  const nextShows = new Set(next.shows.map((s) => s.id));
  const added = [...nextShows].filter((id) => !prevShows.has(id));
  const removed = [...prevShows].filter((id) => !nextShows.has(id));

  console.log("\nDiff vs previous snapshot:");
  console.log(`  Captured: ${prev.capturedAt} → ${next.capturedAt}`);
  console.log(
    `  Shows:    ${prev.summary?.totalShows ?? "?"} → ${next.summary.totalShows}` +
      (added.length > 0 ? ` (+${added.length})` : "") +
      (removed.length > 0 ? ` (-${removed.length})` : ""),
  );
  console.log(
    `  Reviews:  ${
      (prev.summary?.totalShowReviews ?? 0) +
      (prev.summary?.totalSeasonReviews ?? 0) +
      (prev.summary?.totalEpisodeReviews ?? 0)
    } → ${
      next.summary.totalShowReviews +
      next.summary.totalSeasonReviews +
      next.summary.totalEpisodeReviews
    } (S=${next.summary.totalShowReviews} / Se=${next.summary.totalSeasonReviews} / Ep=${next.summary.totalEpisodeReviews})`,
  );
  if (added.length > 0 && added.length <= 10) {
    console.log("  Added shows:");
    for (const id of added) {
      const s = next.showById[id];
      console.log(`    + ${s.name} (${s.premiereYear})`);
    }
  }
  if (removed.length > 0 && removed.length <= 10) {
    console.log("  Removed shows:");
    for (const id of removed) {
      const s = prev.showById?.[id];
      console.log(`    - ${s ? `${s.name} (${s.premiereYear})` : id}`);
    }
  }
}

// ─── Carryover ────────────────────────────────────────────────────

/**
 * Sticky-TMDB carryover: match fresh-built shows (keyed by
 * serializdShowId) to enriched shows from the previous snapshot
 * and reuse their TMDB metadata. Saves ~15s of API throttle once
 * the catalog is stable. Mirrors the films carryover guard:
 *   1. --full-enrich / TV_FULL_ENRICH=1 drops carryover entirely
 *   2. If overrides.tmdbId[showId] changed since last snapshot,
 *      drop carryover for that show so the new override lands
 */
function applyCarryover(shows, prev, overrides) {
  if (!prev?.shows || FULL_ENRICH) {
    if (FULL_ENRICH) {
      console.log("        --full-enrich set: skipping carryover.");
    }
    return { carriedOver: 0, overrideDriftSkips: 0 };
  }
  const prevById = new Map();
  for (const s of prev.shows) prevById.set(s.serializdShowId, s);
  let carriedOver = 0;
  let overrideDriftSkips = 0;
  for (const show of shows) {
    const prevShow = prevById.get(show.serializdShowId);
    if (!prevShow?.tmdb) continue;
    const overrideId = overrides.tmdbId[show.serializdShowId];
    if (overrideId !== undefined && overrideId !== prevShow.tmdb.id) {
      overrideDriftSkips++;
      continue;
    }
    show.tmdb = prevShow.tmdb;
    show.seasons = prevShow.seasons;
    show.posterUrl = prevShow.posterUrl;
    show.posterFallbackUrl = prevShow.posterFallbackUrl;
    carriedOver++;
  }
  return { carriedOver, overrideDriftSkips };
}

// ─── Orchestrator ─────────────────────────────────────────────────
//
// The same orchestration shape powers two callers:
//   1. The CLI (`npm run television:bootstrap`) — runs with
//      `writeToDisk: true`, reads prev snapshot + overrides from
//      disk, writes the new snapshot + cleanup reports, prints the
//      "git add / commit / push" footer.
//   2. The Vercel cron route at /api/cron/television-refresh —
//      runs with `writeToDisk: false` and passes prev snapshot +
//      overrides explicitly (the cron route reads them from the
//      bundled deploy). Returns the in-memory snapshot for the
//      route to PUT to GitHub via the contents API.
//
// `prevSnapshot` and `overrides` are optional; when undefined, the
// function falls back to `readPreviousSnapshot()` and
// `loadOverridesFromDisk()` so the CLI path is unchanged.
//
// Returns { snapshot, hasBlockingIssues }. When `hasBlockingIssues`
// is true, the snapshot was built but is NOT written to disk and
// should NOT be pushed — caller must inspect the cleanup reports
// (or the per-category log lines above) and resolve before retrying.

export async function bootstrapSnapshot(options = {}) {
  const {
    writeToDisk = false,
    prevSnapshot: injectedPrev,
    overrides: injectedOverrides,
  } = options;

  console.log("[1/5] Fetching Serializd diary + watched-list (politely-paginated)…");
  const rawReviews = await fetchAllReviews();
  console.log(`      Fetched ${rawReviews.length} raw review entries.`);
  const { seasonIdsByShow: watchedSeasonsByShowId, itemsByShow: watchedItemsByShow } =
    await fetchAllWatchedSeasons();
  console.log(
    `      Fetched watched-status for ${watchedSeasonsByShowId.size} unique shows.`,
  );

  console.log("\n[2/5] Building show skeleton + deduping reviews…");
  const { shows, serializdSeasonsByShow } = buildSkeletonShows(rawReviews);
  console.log(`      Grouped into ${shows.length} unique shows.`);

  const prev = injectedPrev ?? readPreviousSnapshot();
  const overrides = injectedOverrides ?? loadOverridesFromDisk();
  const carry = applyCarryover(shows, prev, overrides);
  if (prev?.shows && !FULL_ENRICH) {
    console.log(
      `      Carried over ${carry.carriedOver} TMDB enrichments from previous snapshot.` +
        (carry.overrideDriftSkips > 0
          ? ` Re-enriching ${carry.overrideDriftSkips} show(s) where overrides.json changed.`
          : ""),
    );
  }

  console.log("\n[3/5] Enriching with TMDB metadata…");
  const stats = await enrichShows(shows, {
    onProgress: (done, total) => {
      if (done % 10 === 0 || done === total) {
        process.stderr.write(`\r        ${done}/${total}…`);
      }
    },
  });
  process.stderr.write("\n");
  console.log(
    `      ${stats.enriched}/${stats.total} matched + enriched.` +
      (stats.unmatched.length > 0
        ? ` ${stats.unmatched.length} unmatched (will surface in tmdb-unresolved.md).`
        : ""),
  );
  if (stats.failed.length > 0) {
    console.log(`\n      Failed lookups (TMDB unreachable for these ids):`);
    for (const f of stats.failed) {
      console.log(`        • ${f.name} (showId=${f.serializdShowId})  ${f.error}`);
    }
  }

  // Restore seasons Serializd knows about but TMDB hasn't listed yet
  // (e.g. a just-aired reality-show season). Runs after enrich sets
  // the TMDB seasons and before classification reads them, so orphaned
  // episode logs resolve into the right season bucket instead of being
  // silently dropped. See reconcileOrphanSeasons.
  const seasonRecon = reconcileOrphanSeasons(shows, serializdSeasonsByShow);
  if (seasonRecon.reconciled || seasonRecon.aliased || seasonRecon.unresolved) {
    console.log(
      `      Reconciled ${seasonRecon.reconciled} TMDB-missing season(s), ` +
        `canonicalized ${seasonRecon.aliased} id-aliased season(s)` +
        (seasonRecon.unresolved
          ? `, ${seasonRecon.unresolved} unresolved (see unresolved-seasons.md).`
          : "."),
    );
  }

  console.log("\n[4/5] Computing per-show classification + aggregates…");
  for (const show of shows) {
    deriveShowFields(show, overrides, watchedSeasonsByShowId);
  }
  // Surface how many seasons landed in the watched-but-unreviewed
  // bucket so a glance at the bootstrap log shows the badge
  // population. Useful for sanity-checking that the API fetch
  // actually flowed through to the snapshot.
  const totalWatchedUnreviewed = shows.reduce(
    (sum, s) => sum + s.watchedUnreviewedSeasonNumbers.length,
    0,
  );
  console.log(
    `      ${totalWatchedUnreviewed} watched-but-unreviewed seasons across ${shows.filter((s) => s.watchedUnreviewedSeasonNumbers.length > 0).length} shows.`,
  );

  // Build the watched-only-shows shadow list — shows the user has
  // watched on Serializd but never reviewed at any level. Not
  // surfaced anywhere in the current UI per editorial decision
  // ("data captured, future iteration"); stored on the snapshot
  // envelope so future surfaces (e.g. a "watched, not reviewed"
  // reading-list page) can consume without re-hitting the API.
  // Minimal shape — no TMDB enrichment, no review-derived fields,
  // since none apply to a never-reviewed show.
  const reviewedShowIds = new Set(shows.map((s) => s.serializdShowId));
  const watchedOnlyShows = [];
  for (const [showId, item] of watchedItemsByShow) {
    if (reviewedShowIds.has(showId)) continue;
    watchedOnlyShows.push({
      serializdShowId: showId,
      name: item.showName ?? "",
      premiereDate: item.premiereDate ?? "",
      bannerImage: item.bannerImage ?? null,
      numSeasons:
        typeof item.numSeasons === "number" ? item.numSeasons : 0,
      numEpisodes:
        typeof item.numEpisodes === "number" ? item.numEpisodes : 0,
      watchedSeasonIds: Array.isArray(item.seasonIds) ? item.seasonIds : [],
      dateAdded: item.dateAdded ?? null,
    });
  }
  console.log(
    `      ${watchedOnlyShows.length} watched-only shows (watched, never reviewed) captured for future surfaces.`,
  );
  // Miniseries-flagged count surfaces here so a glance at the
  // bootstrap log shows whether the cleanup loop is moving the
  // baseline. Default state (no overrides set) has TMDB-tagged
  // miniseries auto-flagged via rule 2 of the precedence.
  const miniseriesCount = shows.filter((s) => s.isMiniseries).length;
  console.log(
    `      ${miniseriesCount}/${shows.length} shows flagged isMiniseries (TMDB type + overrides).`,
  );
  const snapshot = buildSnapshot(shows);
  console.log(
    `      Show reviews: ${snapshot.summary.totalShowReviews} | ` +
      `Season: ${snapshot.summary.totalSeasonReviews} | ` +
      `Episode: ${snapshot.summary.totalEpisodeReviews} | ` +
      `Shows in-progress: ${snapshot.summary.showsInProgressCount}`,
  );

  // Run cleanup pass BEFORE writing the snapshot. If a blocking
  // category fails, we exit non-zero without persisting — keeps
  // the previous snapshot in place so /television keeps rendering
  // the last-known-good version.
  // Attach the watched-only shadow list + counts to the snapshot
  // envelope. Listing / detail / genre UIs ignore this field; only
  // future surfaces consume it.
  snapshot.watchedOnlyShows = watchedOnlyShows;
  snapshot.summary.totalWatchedShows = shows.length + watchedOnlyShows.length;
  snapshot.summary.totalWatchedOnlyShows = watchedOnlyShows.length;

  // Carry over editorial-landing data (lists + favorites) verbatim
  // from the previous snapshot. These are authored by the separate
  // slow-cadence scripts/refresh-tv-lists.mjs pass, not here, so the
  // hourly bootstrap must preserve them or it would silently drop
  // them between list scrapes. Mirrors the films pipeline's carryover.
  if (prev?.lists) snapshot.lists = prev.lists;
  if (prev?.favorites) snapshot.favorites = prev.favorites;

  const { hasBlockingIssues } = runCleanupPass(snapshot, overrides, {
    writeReports: writeToDisk,
  });
  if (hasBlockingIssues) {
    console.error(
      "\n❌ Blocking cleanup category has unresolved entries. " +
        "Snapshot NOT written.\n" +
        "   See data/television/cleanup/tmdb-unresolved.md and pin " +
        "via data/television/overrides.json#tmdbId.",
    );
    return { snapshot, hasBlockingIssues: true };
  }

  printDiff(prev, snapshot);
  if (writeToDisk) {
    console.log("\n[5/5] Writing snapshot…");
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(
      `\n✓ Wrote ${SNAPSHOT_PATH} (${snapshot.shows.length} shows).`,
    );
    console.log(
      `✓ Wrote ${
        readdirSync(CLEANUP_DIR).filter((f) => f.endsWith(".md")).length
      } cleanup reports under ${CLEANUP_DIR}/.`,
    );
    console.log("\nNext: review the diff + cleanup reports, commit + push.");
    console.log("  git add lib/feeds/_fixtures/serializd-snapshot.json data/television/cleanup/");
    console.log("  git commit -m 'Bootstrap television snapshot'");
    console.log("  git push");
  }

  return { snapshot, hasBlockingIssues: false };
}

// Direct CLI invocation only. When imported as a module (cron route),
// this branch is skipped — the caller drives bootstrapSnapshot()
// explicitly with `writeToDisk: false`.
const isDirectInvocation =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectInvocation) {
  bootstrapSnapshot({ writeToDisk: true })
    .then(({ hasBlockingIssues }) => {
      if (hasBlockingIssues) process.exit(1);
    })
    .catch((err) => {
      console.error(
        "\n[bootstrap-serializd-snapshot] FAILED:",
        err instanceof Error ? err.message : err,
      );
      process.exit(1);
    });
}
