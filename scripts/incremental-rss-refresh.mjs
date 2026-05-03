#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// incremental-rss-refresh.mjs
//
// RSS-driven incremental refresh of the Letterboxd snapshot. Runs
// hourly via .github/workflows/films-refresh.yml — no human in the
// loop required once the catalog is bootstrapped.
//
// Pipeline:
//   1. Fetch https://letterboxd.com/malxavi/rss/ (last ~50 entries)
//   2. Parse RSS items into review-shaped objects (RSS includes
//      <tmdb:movieId>, so we skip the title+year search step that
//      the CSV-bootstrap path needs)
//   3. Load the existing snapshot
//   4. Diff: find new reviews + new films
//   5. Enrich any new films via TMDB (one /movie/{id} call each;
//      no search step needed)
//   6. Merge into the snapshot (append reviews, recompute per-film
//      aggregates, re-sort films, re-aggregate summary)
//   7. Write the snapshot ONLY if something changed
//   8. Print a summary so the GitHub Action log is useful
//
// Run via:
//   node --env-file=.env.local scripts/incremental-rss-refresh.mjs
// or in CI:
//   node scripts/incremental-rss-refresh.mjs   (TMDB_API_KEY in env)
//
// Exit codes:
//   0 — success (with or without changes; CI commits if file diff)
//   1 — fatal error (RSS unreachable, snapshot malformed, etc.)
//
// Why CI runs hourly: Malcolm reviews multiple films per week, often
// in clusters. Hourly is generous; the actual refresh is a no-op
// when RSS hasn't moved (the most common case), so the budget cost
// is just one cron tick.
//
// What this DOESN'T do (intentionally):
//   • Doesn't pick up edits to old reviews — RSS only surfaces the
//     latest publication; an edit to a 2020 review won't appear.
//     Re-run the full CSV-export refresh for ground-truth re-seeds.
//   • Doesn't pick up deletions — same reason.
//   • Doesn't update poster art for films already enriched — the
//     sticky-TMDB carryover holds. Use --full-enrich on the CSV
//     refresh to bust the cache when needed.
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import {
  fetchMovieDetails,
  loadOverrides,
  normalizeDetails,
  resolveFallbackUrl,
  resolvePosterUrl,
} from "./enrich-tmdb.mjs";
import { slugify } from "./parse-letterboxd-export.mjs";

const RSS_URL = "https://letterboxd.com/malxavi/rss/";
const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/letterboxd-snapshot.json",
);
const TMDB_RATE_LIMIT_DELAY_MS = 100; // 10 req/sec ceiling
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── RSS fetch + parse ──────────────────────────────────────────

/**
 * Parse a Letterboxd RSS feed string into a list of review-shaped
 * intermediate objects. Each result has the fields we need to
 * either match against an existing film or build a new one — we
 * defer the snapshot-merge logic to the orchestrator.
 *
 * Letterboxd's RSS uses two namespaces beyond the RSS 2.0 core:
 *   • letterboxd:* for diary metadata (watchedDate, rewatch,
 *     filmTitle, filmYear, memberRating, memberLike)
 *   • tmdb:movieId for the canonical TMDB id — saves us a search.
 */
function parseRssEntries(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    // Letterboxd uses : in element names (letterboxd:filmTitle).
    // fast-xml-parser keeps these intact by default, which is what
    // we want — the field paths read literally as documented in
    // Letterboxd's RSS spec.
    parseTagValue: false, // keep numeric strings as strings; we coerce explicitly
  });
  const data = parser.parse(xml);
  const items = data?.rss?.channel?.item ?? [];
  // Single-item feeds return an object, not an array. Normalize.
  const list = Array.isArray(items) ? items : [items];
  return list.map(rssItemToEntry).filter(Boolean);
}

/**
 * Map one RSS <item> to our intermediate shape. Returns null when
 * the item is missing required fields (title or filmTitle/Year)
 * rather than raising — a malformed entry shouldn't crash the
 * whole refresh.
 */
function rssItemToEntry(item) {
  const filmTitle = stringOf(item["letterboxd:filmTitle"]);
  const filmYearRaw = stringOf(item["letterboxd:filmYear"]);
  const filmYear = Number.parseInt(filmYearRaw, 10);
  if (!filmTitle || !Number.isFinite(filmYear)) return null;

  const link = stringOf(item.link);
  const guid = stringOf(item.guid);
  const watchedDate = stringOf(item["letterboxd:watchedDate"]);
  const rewatch = stringOf(item["letterboxd:rewatch"]) === "Yes";
  const liked = stringOf(item["letterboxd:memberLike"]) === "Yes";
  const ratingStr = stringOf(item["letterboxd:memberRating"]);
  const rating = ratingStr ? Number.parseFloat(ratingStr) : null;
  const tmdbIdStr = stringOf(item["tmdb:movieId"]);
  const tmdbId = tmdbIdStr ? Number.parseInt(tmdbIdStr, 10) : null;
  const pubDate = stringOf(item.pubDate);
  // pubDate is RFC-822 ("Fri, 1 May 2026 17:11:24 +1200"); convert
  // to ISO date-only so reviewDate is consistent with CSV-derived
  // entries (which are also date-only).
  const reviewDate = isoDateFromPubDate(pubDate) ?? watchedDate;

  // Description carries the review prose plus a poster <img> tag.
  // We strip the <img> and unwrap <p> → \n\n paragraph breaks so
  // the parsed text matches the format the CSV importer produces.
  const reviewText = extractReviewProse(stringOf(item.description));

  return {
    guid: guid || null,
    link: link || null,
    filmTitle,
    filmYear,
    watchedDate,
    reviewDate,
    rating: Number.isFinite(rating) ? rating : null,
    rewatch,
    liked,
    tmdbId,
    reviewText,
  };
}

function stringOf(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && "#text" in v) return String(v["#text"]).trim();
  return String(v).trim();
}

function isoDateFromPubDate(pubDate) {
  if (!pubDate) return null;
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return null;
  // ISO date-only in the date's UTC calendar — matches CSV style.
  return d.toISOString().slice(0, 10);
}

/**
 * Strip the leading poster <img> tag and unwrap <p>...</p>
 * paragraph breaks into double-newlines so the resulting text
 * matches what the CSV importer produces. <i>...</i> markup is
 * preserved (the renderer handles it) — only paragraph wrappers
 * are stripped.
 */
function extractReviewProse(html) {
  if (!html) return "";
  // Drop the poster image (always the first <p><img/></p> in the
  // CDATA block) so reviewText is just prose.
  let text = html.replace(/<p>\s*<img[^>]*>\s*<\/p>/i, "");
  // Convert <p>...</p> into paragraph-separated text.
  text = text.replace(/<\/p>\s*<p>/gi, "\n\n");
  text = text.replace(/<\/?p>/gi, "");
  // Decode the most common HTML entities — Letterboxd emits these
  // for ampersands and quotes inside review prose.
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return text.trim();
}

async function fetchRss() {
  const res = await fetch(RSS_URL, {
    headers: { Accept: "application/rss+xml" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// ─── Snapshot merge ─────────────────────────────────────────────

/**
 * Find or create a film in the snapshot for the given RSS entry.
 * Identity is `slugify(filmTitle)-filmYear` — same convention the
 * CSV bootstrap uses, so RSS additions match existing snapshot
 * films via the seed identity.
 */
function findOrCreateFilm(snapshot, entry) {
  const seedSlug = slugify(entry.filmTitle);
  const seedId = `${seedSlug}-${entry.filmYear}`;
  // First pass: match by Film.id (post-enrichment canonical id is
  // tmdb-XXX; pre-enrichment is the seed id).
  let film = snapshot.films.find(
    (f) =>
      f.id === seedId ||
      (entry.tmdbId !== null && f.id === `tmdb-${entry.tmdbId}`) ||
      (f.letterboxdSlug === seedSlug && f.releaseYear === entry.filmYear),
  );
  if (film) return { film, isNew: false };

  // New film: build a stub. TMDB enrichment fills in tmdb/poster
  // afterwards in a separate pass.
  film = {
    id: entry.tmdbId !== null ? `tmdb-${entry.tmdbId}` : seedId,
    letterboxdSlug: seedSlug,
    letterboxdUrl: entry.link ?? "",
    title: entry.filmTitle,
    releaseYear: entry.filmYear,
    firstWatchedDate: "",
    latestWatchedDate: "",
    firstReviewDate: "",
    latestReviewDate: "",
    primaryRating: null,
    liked: false,
    reviews: [],
    tmdb: null,
    posterUrl: null,
    posterFallbackUrl: null,
    ratingSet: [],
    watchedYearSet: [],
  };
  snapshot.films.push(film);
  snapshot.filmById[film.id] = film;
  return { film, isNew: true };
}

/**
 * True if a review with this watchedDate is already in the film's
 * reviews array. watchedDate alone is the natural key — Malcolm
 * doesn't watch the same film twice on the same day, so a film +
 * watchedDate pair uniquely identifies a watch event.
 *
 * NOT (watchedDate, reviewDate). The CSV export and the RSS feed
 * surface different reviewDate values for the same review:
 *   • CSV's reviewDate = last-edit date of the review prose
 *   • RSS's pubDate    = first-publish date of the review
 * If Malcolm publishes a review and edits it a day or two later
 * (typical for him to polish prose post-publish), the two sources
 * disagree on reviewDate by 1-2 days. Dedupe by watchedDate alone
 * sidesteps the disagreement entirely; the rest of the review's
 * fields are stable across both sources for matched watches.
 */
function reviewAlreadyPresent(film, entry) {
  return film.reviews.some((r) => r.watchedDate === entry.watchedDate);
}

/**
 * Append a new review to the film. Reviews are stored newest-first
 * by reviewDate, matching the snapshot writer's invariant.
 */
function appendReview(film, entry) {
  film.reviews.push({
    watchedDate: entry.watchedDate,
    reviewDate: entry.reviewDate,
    rating: entry.rating,
    rewatch: entry.rewatch,
    // RSS doesn't expose containsSpoilers; default false matches the
    // CSV importer's posture and is the conservative choice — a
    // user can re-export the CSV when they need the spoiler flag.
    containsSpoilers: false,
    reviewText: entry.reviewText,
    tags: [],
  });
  film.reviews.sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
}

/**
 * Recompute the per-film aggregates after one or more reviews have
 * been appended. Mirrors the logic in parse-letterboxd-export.mjs
 * so RSS-driven films match CSV-derived films field-for-field.
 */
function recomputeFilmAggregates(film) {
  const newest = film.reviews[0];
  const oldest = film.reviews[film.reviews.length - 1];
  if (!newest || !oldest) return;

  const watchedDates = film.reviews.map((r) => r.watchedDate).sort();
  film.firstWatchedDate = watchedDates[0] ?? "";
  // latestWatchedDate is the max of watched dates (not just newest's
  // watched date — a recent review could be a backlogged watch).
  film.latestWatchedDate = watchedDates[watchedDates.length - 1] ?? "";
  film.firstReviewDate = oldest.reviewDate;
  film.latestReviewDate = newest.reviewDate;
  film.primaryRating = newest.rating;
  film.liked = !!newest.rating && false; // recomputed below from RSS-derived liked flag

  film.ratingSet = [
    ...new Set(
      film.reviews.map((r) => r.rating).filter((r) => r !== null),
    ),
  ].sort((a, b) => a - b);
  film.watchedYearSet = [
    ...new Set(
      film.reviews.map((r) =>
        Number.parseInt(r.watchedDate.slice(0, 4), 10),
      ),
    ),
  ].sort((a, b) => a - b);
}

/**
 * After every review-merge pass, re-sort the films array by
 * latestWatchedDate desc — same primary sort the snapshot writer
 * uses. Films with the same latestWatchedDate fall back to the
 * existing array order (the RSS path doesn't have CSV-row-index
 * information, but ties on the most-recent date are vanishingly
 * rare in practice).
 */
function resortFilms(snapshot) {
  snapshot.films.sort((a, b) =>
    b.latestWatchedDate.localeCompare(a.latestWatchedDate),
  );
}

/**
 * Recompute the snapshot summary block from scratch. Same shape
 * as scripts/refresh-films-snapshot.mjs's aggregateSummary so the
 * runtime layer doesn't notice the difference.
 */
function recomputeSummary(snapshot) {
  const currentYear = new Date().getUTCFullYear();
  let totalReviews = 0;
  let thisYearCount = 0;
  const ratingDist = {};
  const genreDist = {};
  const decadeDist = {};

  for (const film of snapshot.films) {
    totalReviews += film.reviews.length;
    const watchedYear = Number.parseInt(
      film.latestWatchedDate.slice(0, 4),
      10,
    );
    if (watchedYear === currentYear) thisYearCount++;
    for (const r of film.reviews) {
      if (r.rating !== null) {
        const key = String(r.rating);
        ratingDist[key] = (ratingDist[key] ?? 0) + 1;
      }
    }
    if (film.tmdb?.genres) {
      for (const g of film.tmdb.genres) {
        genreDist[g] = (genreDist[g] ?? 0) + 1;
      }
    }
    if (Number.isFinite(film.releaseYear)) {
      const decade = `${Math.floor(film.releaseYear / 10) * 10}s`;
      decadeDist[decade] = (decadeDist[decade] ?? 0) + 1;
    }
  }

  snapshot.summary = {
    totalFilms: snapshot.films.length,
    totalReviews,
    thisYearCount,
    ratingDistribution: ratingDist,
    genreDistribution: genreDist,
    decadeDistribution: decadeDist,
  };
}

// ─── TMDB enrichment for new films ──────────────────────────────

/**
 * Enrich any newly-created films via TMDB. Each film's tmdbId may
 * already be set from the RSS entry (saving the search step); when
 * it isn't, leave the film unenriched and log it for human triage.
 * Sticky-TMDB carryover doesn't apply here — these are brand-new
 * films, never seen before.
 */
async function enrichNewFilms(films) {
  if (films.length === 0) return { ok: 0, failed: [] };
  const overrides = loadOverrides();
  let ok = 0;
  const failed = [];

  for (const film of films) {
    const overrideId = overrides.tmdbId[film.letterboxdSlug];
    const tmdbIdRaw = overrideId ?? extractTmdbIdFromFilm(film);
    if (!tmdbIdRaw) {
      failed.push({ slug: film.letterboxdSlug, reason: "no tmdb id" });
      continue;
    }
    try {
      const details = await fetchMovieDetails(tmdbIdRaw);
      film.tmdb = normalizeDetails(details);
      film.id = `tmdb-${film.tmdb.id}`;
      film.posterUrl = resolvePosterUrl(
        film.letterboxdSlug,
        film.tmdb,
        overrides,
      );
      film.posterFallbackUrl = resolveFallbackUrl(film.tmdb);
      ok++;
    } catch (err) {
      failed.push({
        slug: film.letterboxdSlug,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
    await sleep(TMDB_RATE_LIMIT_DELAY_MS);
  }
  return { ok, failed };
}

/**
 * Pull the TMDB id off a freshly-stubbed film. If the stub's id
 * was set as `tmdb-XXX` from the RSS entry, parse it out; otherwise
 * the film has no known TMDB id and enrichment will skip it.
 */
function extractTmdbIdFromFilm(film) {
  if (typeof film.id === "string" && film.id.startsWith("tmdb-")) {
    const n = Number.parseInt(film.id.slice("tmdb-".length), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ─── Orchestrator ───────────────────────────────────────────────

/**
 * Read the existing snapshot from disk. If the file is missing
 * we exit cleanly (the GitHub Action will skip; the CSV bootstrap
 * is the right path for a from-zero refresh anyway).
 */
function readSnapshot() {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
  } catch (err) {
    throw new Error(
      `Snapshot at ${SNAPSHOT_PATH} is malformed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

async function main() {
  console.log("[1/5] Reading existing snapshot…");
  const snapshot = readSnapshot();
  if (!snapshot) {
    console.log(
      "      No snapshot found at " +
        SNAPSHOT_PATH +
        " — run npm run films:refresh to bootstrap the catalog first.",
    );
    return;
  }
  const baselineCount = snapshot.films.length;
  const baselineReviews = snapshot.summary?.totalReviews ?? 0;

  console.log("\n[2/5] Fetching RSS feed…");
  let xml;
  try {
    xml = await fetchRss();
  } catch (err) {
    console.error(
      "      RSS fetch failed: " +
        (err instanceof Error ? err.message : String(err)),
    );
    process.exit(1);
  }
  const entries = parseRssEntries(xml);
  console.log(`      Parsed ${entries.length} RSS items.`);

  console.log("\n[3/5] Diffing against snapshot…");
  const newFilms = [];
  const newReviews = [];
  for (const entry of entries) {
    const { film, isNew } = findOrCreateFilm(snapshot, entry);
    if (isNew) newFilms.push(film);
    if (!reviewAlreadyPresent(film, entry)) {
      appendReview(film, entry);
      newReviews.push({ filmTitle: film.title, entry });
      // RSS-derived liked flag — the most recent review's liked
      // value becomes the film's `liked` property after recompute.
      // We propagate via the review side-channel: stash on the
      // film and recomputeFilmAggregates honors it below.
      film.__pendingLiked = entry.liked;
    }
  }
  console.log(
    `      ${newFilms.length} new film(s), ${newReviews.length} new review(s).`,
  );

  if (newReviews.length === 0) {
    console.log("\nNo changes — snapshot is up to date.");
    return;
  }

  // Recompute aggregates for every film that picked up a new
  // review. Only touch films we actually mutated.
  const touchedFilms = new Set(
    newReviews.map((r) =>
      snapshot.films.find((f) => f.title === r.filmTitle),
    ),
  );
  for (const film of touchedFilms) {
    if (!film) continue;
    recomputeFilmAggregates(film);
    if ("__pendingLiked" in film) {
      film.liked = film.__pendingLiked;
      delete film.__pendingLiked;
    }
  }

  console.log("\n[4/5] Enriching new films via TMDB…");
  const enrichStats = await enrichNewFilms(newFilms);
  console.log(
    `      ${enrichStats.ok}/${newFilms.length} enriched.` +
      (enrichStats.failed.length > 0
        ? ` ${enrichStats.failed.length} failed (logged below).`
        : ""),
  );
  for (const f of enrichStats.failed) {
    console.log(`      • ${f.slug} — ${f.reason}`);
  }

  // Re-sort + re-aggregate after all merges complete.
  resortFilms(snapshot);
  recomputeSummary(snapshot);
  // filmById may have stale keys for newly-promoted seedId → tmdb-X
  // films. Rebuild it from the current films array.
  snapshot.filmById = {};
  for (const f of snapshot.films) snapshot.filmById[f.id] = f;
  snapshot.capturedAt = new Date().toISOString();

  console.log("\n[5/5] Writing snapshot…");
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(
    `\n✓ Wrote ${SNAPSHOT_PATH}\n` +
      `  Films:    ${baselineCount} → ${snapshot.films.length}` +
      (newFilms.length > 0 ? ` (+${newFilms.length})` : "") +
      `\n  Reviews:  ${baselineReviews} → ${snapshot.summary.totalReviews}` +
      ` (+${newReviews.length})`,
  );

  if (newFilms.length > 0) {
    console.log("\n  New films:");
    for (const f of newFilms) {
      console.log(`    + ${f.title} (${f.releaseYear})`);
    }
  }
}

main().catch((err) => {
  console.error(
    "\n[incremental-rss-refresh] FAILED:",
    err instanceof Error ? err.stack || err.message : err,
  );
  process.exit(1);
});
