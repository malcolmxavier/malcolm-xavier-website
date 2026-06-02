#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// refresh-films-lists.mjs
//
// Slow-cadence scrape of Malcolm's Letterboxd LISTS and FAVORITES,
// merged into the existing films snapshot. This is deliberately
// separate from the daily RSS-incremental review refresh
// (incremental-rss-refresh.mjs): lists/favorites change rarely and
// are NOT in the RSS feed, so they get their own pass on a weekly
// cadence (manual here; Vercel cron in app/api/cron/lists-refresh).
//
// Letterboxd has no public API, so this parses the public HTML of
// three surfaces:
//   1. /<user>/            → profile favourites (the pinned films)
//   2. /<user>/lists/      → the list index (discover every slug)
//   3. /<user>/list/<slug>/→ each list's title, methodology, films
//
// Curation stays on-platform: Malcolm arranges his favourites and
// lists on Letterboxd, this reflects them. The reviewed corpus is
// the source of poster/rating data — we capture only slugs (+ a
// title fallback), and the landing joins each slug to a corpus Film
// by letterboxdSlug for the rich card.
//
// Output: rewrites lib/feeds/_fixtures/letterboxd-snapshot.json,
// preserving every existing field and setting `lists` + `favorites`.
//
// Run via:  npm run films:lists-refresh
// Then review the diff, commit, push. Vercel rebuilds on push.
//
// Exit codes:
//   0 — scrape succeeded; snapshot updated (or unchanged)
//   1 — fatal (snapshot missing/malformed, profile+index both
//       unreachable, or zero lists AND zero favorites parsed —
//       treated as a likely block / markup change so we DON'T
//       clobber good data with empties)
// ─────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { enrichFilms } from "./enrich-tmdb.mjs";

const USER = "malxavi";
const BASE = "https://letterboxd.com";
const PROFILE_URL = `${BASE}/${USER}/`;
const LISTS_INDEX_URL = `${BASE}/${USER}/lists/`;

const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/letterboxd-snapshot.json",
);

// Politeness: low request volume (1 profile + 1 index + N lists) with
// a gap between hits. A browser-like UA — Letterboxd's edge tends to
// 403 unrecognized clients, and the spike confirmed a normal UA is
// what gets served the full server-rendered markup.
const PAGE_GAP_MS = 600;
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html",
};
const FETCH_TIMEOUT_MS = 15_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch one page's HTML. Returns null on any non-OK / network error
 *  so callers can decide whether a given surface is skippable. */
async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`      ! ${url} → HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.error(`      ! ${url} → ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

// ─── HTML parsing (regex — the surface is tiny and stable) ────────

const ENTITIES = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&#039;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&nbsp;": " ",
};

/** Decode the handful of HTML entities Letterboxd emits in titles
 *  and descriptions, plus numeric (&#8212;) escapes. */
function decodeEntities(s) {
  if (!s) return "";
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m] ?? m);
}

function metaContent(html, property) {
  const re = new RegExp(
    `<meta[^>]+property="${property}"[^>]+content="([^"]*)"`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : "";
}

/**
 * Extract favourites from the profile page. Scoped to the favourites
 * <section> so recent-activity / popular-review posters elsewhere on
 * the profile don't leak in. Each poster carries data-item-slug and
 * data-item-name; we keep profile order and dedupe.
 */
function parseFavourites(html) {
  const section = html.match(
    /<section[^>]*favourites[^>]*>([\s\S]*?)<\/section>/i,
  );
  const region = section ? section[1] : "";
  if (!region) return [];
  const favourites = [];
  const seen = new Set();
  // Each favourite is a poster div carrying both attributes; match the
  // opening tag, then read attrs independently (order-agnostic).
  const tagRe = /<div\b[^>]*\bdata-item-slug="[^"]*"[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(region))) {
    const tag = m[0];
    const slug = (tag.match(/data-item-slug="([^"]+)"/) || [])[1];
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const name = (tag.match(/data-item-name="([^"]+)"/) || [])[1] || slug;
    favourites.push({
      slug,
      title: decodeEntities(name),
      releaseYear: null,
      // Filled by enrichFavourite() from the film page's og:image —
      // favourites are usually prose-less, so the corpus can't supply
      // a poster and we read it straight off Letterboxd instead.
      posterUrl: null,
      letterboxdUrl: `${BASE}/film/${slug}/`,
    });
  }
  return favourites;
}

/**
 * Read a favourite's title + release year from its Letterboxd film
 * page og:title ("Title (YYYY)"). The year is what makes the later
 * TMDB poster lookup reliable — a yearless search would rank Jumanji
 * (2017) above the 1995 original by popularity, etc. Poster itself is
 * NOT taken from the page's og:image: that's a 16:9 social crop, the
 * wrong aspect for a 2:3 poster tile. Posters come from TMDB instead
 * (see enrichFavouritePosters) so they match the corpus exactly.
 * Mutates the favourite in place; leaves the data-item-name title and
 * null year if the page is unreachable.
 */
async function enrichFavouriteMeta(fav) {
  const html = await fetchHtml(fav.letterboxdUrl);
  if (!html) return fav;
  const ogTitle = metaContent(html, "og:title");
  const ym = ogTitle.match(/^(.*?)\s*\((\d{4})\)\s*$/);
  if (ym) {
    fav.title = ym[1].trim();
    fav.releaseYear = Number.parseInt(ym[2], 10);
  } else if (ogTitle) {
    fav.title = ogTitle;
  }
  return fav;
}

/**
 * Resolve a w342 TMDB poster for each favourite, reusing the corpus
 * enricher (title+year search, honoring data/films/overrides.json
 * tmdbId/posterPath pins). enrichFilms paces its own TMDB calls and
 * mutates the seed objects in place; we copy the resolved posterUrl
 * back onto each favourite. Favourites that don't resolve keep a null
 * poster (the tile falls back to a title-only treatment).
 */
async function enrichFavouritePosters(favorites) {
  if (favorites.length === 0) return;
  const seeds = favorites.map((f) => ({
    letterboxdSlug: f.slug,
    title: f.title,
    releaseYear: f.releaseYear ?? 0,
    tmdb: null,
    posterUrl: null,
    posterFallbackUrl: null,
  }));
  await enrichFilms(seeds);
  favorites.forEach((f, i) => {
    f.posterUrl = seeds[i].posterUrl;
  });
}

/** Discover every list slug from the index (drops /edit/ variants
 *  and dedupes; user-agnostic so it survives a handle change). */
function parseListIndex(html) {
  const slugs = [];
  const seen = new Set();
  const re = /href="\/[^"/]+\/list\/([^"/]+)\/"/gi;
  let m;
  while ((m = re.exec(html))) {
    const slug = m[1];
    if (slug === "edit" || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
}

/**
 * Parse one list page into { slug, title, description, filmSlugs,
 * url }. Title + methodology come from the (clean) og: tags;
 * filmSlugs are the ordered data-item-slug occurrences (the list
 * page carries exactly its films, in running order — confirmed on
 * the ranked lists during the spike).
 */
function parseListPage(html, slug) {
  const title = metaContent(html, "og:title") || slug;
  const description = metaContent(html, "og:description");
  const filmSlugs = [];
  const seen = new Set();
  const re = /data-item-slug="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const s = m[1];
    if (seen.has(s)) continue;
    seen.add(s);
    filmSlugs.push(s);
  }
  return {
    slug,
    title,
    description,
    filmSlugs,
    url: `${BASE}/${USER}/list/${slug}/`,
  };
}

// ─── Snapshot IO ─────────────────────────────────────────────────

function readSnapshot() {
  if (!existsSync(SNAPSHOT_PATH)) {
    throw new Error(
      `No films snapshot at ${SNAPSHOT_PATH}. Run \`npm run films:refresh\` first.`,
    );
  }
  const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
  if (!Array.isArray(snap.films)) {
    throw new Error(`Snapshot at ${SNAPSHOT_PATH} is malformed (no films[]).`);
  }
  return snap;
}

/**
 * Stable change-detection key for lists + favorites. Built from the
 * meaningful fields ONLY — slugs, titles, years, descriptions, and
 * list running order — and deliberately excludes posterUrl, since
 * Letterboxd's og:image carries a `?v=` cache-buster that can churn
 * without the actual film changing. Comparing on this key keeps the
 * weekly cron from committing on poster-URL noise.
 */
function changeKey(lists, favorites) {
  return JSON.stringify({
    favorites: favorites.map((f) => [f.slug, f.title, f.releaseYear]),
    lists: lists.map((l) => [l.slug, l.title, l.description, l.filmSlugs]),
  });
}

/**
 * Scrape favourites + lists and merge them into the films snapshot.
 *
 * Two call modes (mirrors incremental-rss-refresh.mjs):
 *   • CLI (`writeToDisk: true`): reads the snapshot from disk and
 *     writes the merged result back. The `npm run films:lists-refresh`
 *     path.
 *   • Cron (`writeToDisk: false`, `prevSnapshot` injected): the Vercel
 *     filesystem is read-only at request time, so the route passes
 *     the bundled snapshot in and commits the returned snapshot to
 *     GitHub itself. Nothing is written to disk here.
 *
 * Returns { snapshot, changed, favoritesCount, listsCount }. `changed`
 * is false when the scrape matches what's already stored (so the cron
 * can skip an empty commit).
 */
export async function refreshFilmsLists(options = {}) {
  const { writeToDisk = false, prevSnapshot = null } = options;
  const snapshot = prevSnapshot ?? readSnapshot();
  if (!Array.isArray(snapshot.films)) {
    throw new Error("Base films snapshot is malformed (no films[]).");
  }
  const corpusSlugs = new Set(snapshot.films.map((f) => f.letterboxdSlug));
  console.log(`[films-lists] ${snapshot.films.length} films in corpus.`);

  console.log("[films-lists] Scraping favourites + lists from Letterboxd…");
  const profileHtml = await fetchHtml(PROFILE_URL);
  await sleep(PAGE_GAP_MS);
  const indexHtml = await fetchHtml(LISTS_INDEX_URL);

  // Both top-level surfaces unreachable → almost certainly a block or
  // outage. Bail without writing so we don't wipe good data.
  if (!profileHtml && !indexHtml) {
    throw new Error(
      "Both profile and lists-index fetches failed — aborting without writing.",
    );
  }

  const favorites = profileHtml ? parseFavourites(profileHtml) : [];
  // Pass 1: title + year from each favourite's film page (paced).
  for (const fav of favorites) {
    await sleep(PAGE_GAP_MS);
    await enrichFavouriteMeta(fav);
  }
  // Pass 2: clean 2:3 TMDB posters (enrichFilms paces its own calls).
  await enrichFavouritePosters(favorites);
  for (const fav of favorites) {
    const inCorpus = corpusSlugs.has(fav.slug) ? "in corpus" : "links out";
    console.log(
      `[films-lists]   · ${fav.slug}: "${fav.title}"${
        fav.releaseYear ? ` (${fav.releaseYear})` : ""
      } — ${fav.posterUrl ? "poster ✓" : "poster ✗"}, ${inCorpus}`,
    );
  }

  const listSlugs = indexHtml ? parseListIndex(indexHtml) : [];
  const lists = [];
  for (const slug of listSlugs) {
    await sleep(PAGE_GAP_MS);
    const html = await fetchHtml(`${BASE}/${USER}/list/${slug}/`);
    if (!html) continue; // skip a single unreachable list, keep going
    const list = parseListPage(html, slug);
    if (list.filmSlugs.length === 0) {
      console.log(`[films-lists]   · ${slug}: 0 films parsed — skipping`);
      continue;
    }
    const inCorpus = list.filmSlugs.filter((s) => corpusSlugs.has(s)).length;
    console.log(
      `[films-lists]   · ${slug}: "${list.title}" — ${list.filmSlugs.length} films (${inCorpus} in corpus)`,
    );
    lists.push(list);
  }

  // Nothing parsed from either surface → treat as a markup/block
  // failure rather than a real "you have no lists or favourites".
  if (favorites.length === 0 && lists.length === 0) {
    throw new Error(
      "Parsed zero favourites AND zero lists — likely a block or markup change. " +
        "Aborting without writing so existing data is preserved.",
    );
  }

  const changed =
    changeKey(snapshot.lists ?? [], snapshot.favorites ?? []) !==
    changeKey(lists, favorites);

  snapshot.lists = lists;
  snapshot.favorites = favorites;

  if (writeToDisk) {
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(
      `\n✓ Wrote ${SNAPSHOT_PATH}\n` +
        `   favourites: ${favorites.length}\n` +
        `   lists:      ${lists.length}\n` +
        `   changed:    ${changed}`,
    );
    console.log("\nNext: review the diff, commit the snapshot, push.");
  }

  return {
    snapshot,
    changed,
    favoritesCount: favorites.length,
    listsCount: lists.length,
  };
}

// Direct CLI invocation only. When imported as a module (the cron
// route), this branch is skipped — the caller drives
// refreshFilmsLists() explicitly with writeToDisk:false + an injected
// prevSnapshot.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  refreshFilmsLists({ writeToDisk: true }).catch((err) => {
    console.error(
      "\n[refresh-films-lists] FAILED:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  });
}
