#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// refresh-tv-lists.mjs
//
// Slow-cadence capture of Malcolm's Serializd FAVORITES and LISTS,
// merged into the existing television snapshot. The TV analog of
// scripts/refresh-films-lists.mjs — deliberately separate from the
// hourly probe-then-bootstrap review refresh, since favorites/lists
// change rarely.
//
// Serializd exposes a JSON API (no scraping needed), gated on the
// X-Requested-With header its own React frontend sends. Endpoints:
//   • /api/user/<user>/favoriteshows → { favoriteShows: [...] }
//   • /api/list/<id>                 → one list's metadata + listItems
//
// NOTE: the username→lists listing endpoint (/api/user/<user>/lists) is
// DEAD on Serializd's backend — it returns an empty array for every user
// regardless of params/method (favorites + diary on the same host work).
// So lists are pulled by id from the LIST_IDS publish-set below, fetched
// one-by-one via /api/list/<id>. TV lists are season-ranked: each item
// is a SHOW+SEASON with a position (see parseList / ShowListItem).
//
// Favorites reference shows by serializdShowId (= TMDB tv id); list
// items reference them by showId — both join to the reviewed corpus for
// the rich card.
//
// Output: rewrites lib/feeds/_fixtures/serializd-snapshot.json,
// preserving every existing field and setting `lists` + `favorites`.
//
// Run via:  npm run television:lists-refresh
// Then review the diff, commit, push. Vercel rebuilds on push.
//
// Exit codes:
//   0 — succeeded; snapshot updated (or unchanged)
//   1 — fatal (snapshot missing/malformed, the API unreachable, or
//       zero favorites AND zero lists parsed — treated as a likely
//       block/auth change so we DON'T clobber good data with empties)
// ─────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  fetchTvDetails,
  loadOverrides,
  normalizeTvDetails,
  resolvePosterUrl,
} from "./enrich-serializd-tmdb.mjs";

const USER = "malxavi";
const API_BASE = "https://serializd.onrender.com";
const SITE_BASE = "https://www.serializd.com";

// ── The publish-set ──────────────────────────────────────────────
// Serializd's username→lists listing endpoint (/api/user/<user>/lists)
// is dead on their backend — it returns an empty array for every user,
// across every param/method variant (favorites + diary on the same
// host work fine). The only working list endpoint is GET /api/list/{id},
// so we fetch a CONFIGURED set of list ids rather than discovering them.
//
// This doubles as editorial control: a list appears on the site iff its
// id is here. The on-site label/grouping (year × scope × method) is
// derived from each list's NAME by lib/feeds/list-taxonomy.ts — keep the
// Serializd list titles in the "<year> <New Releases|Backlog> · <Editor's
// Cut|Ratings Cut>" shape so the classifier can read them. Edit this array
// to publish or retire a list, then re-run `npm run television:lists-refresh`.
const LIST_IDS = [
  451075, // 2025 New Releases · Editor's Cut
  451063, // 2025 New Releases · Ratings Cut
  451111, // 2025 Backlog · Editor's Cut
  451095, // 2025 Backlog · Ratings Cut
];

/** URL-safe route slug from a list name. Strips the em-dash and other
 *  punctuation, lowercases, and collapses runs to single hyphens — our
 *  own slug, independent of Serializd's numeric id. */
function slugifyListName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Canonical Serializd list URL. Their format is `/list/<Name>-<id>`,
 *  preserving the title's casing with spaces→hyphens and URL-encoding
 *  the em-dash (so it reads `…-%E2%80%94-…`). Mirror that exactly so the
 *  link-out resolves rather than relying on an id-only redirect. */
function serializdListUrl(name, id) {
  const slug = encodeURI(String(name).trim().replace(/\s+/g, "-"));
  return `${SITE_BASE}/list/${slug}-${id}`;
}

const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/serializd-snapshot.json",
);

// The X-Requested-With value is what Serializd's own frontend sends;
// without it the API blanket-401s. Identifying UA points back to the
// site so the Serializd team can reach out (or block) — same posture
// as bootstrap-serializd-snapshot.mjs. ASCII-only per HTTP header
// ByteString rules.
const HEADERS = {
  "X-Requested-With": "serializd_vercel",
  "User-Agent":
    "malxavi.com /television cluster - read-only, snapshot-driven, weekly (https://malxavi.com)",
};
// Per-request timeout. Overridable via env for runs against a slow /
// cold-starting Serializd backend (the onrender tier can exceed the
// default on the first request per list); set TV_FETCH_TIMEOUT_MS higher.
const FETCH_TIMEOUT_MS = Number(process.env.TV_FETCH_TIMEOUT_MS) || 20_000;
const PAGE_GAP_MS = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch + parse one API endpoint as JSON. Returns null on any
 *  non-OK / network / parse error so the caller can decide whether
 *  the surface is skippable. */
async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`      ! ${url} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`      ! ${url} → ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/**
 * Map the favoriteshows payload to ShowFavorite[]. The API item is
 * { showId (TMDB tv id), showName, bannerImage }; we keep id + name
 * (poster comes from the corpus join at render time). Profile order
 * preserved.
 */
function parseFavorites(json) {
  const raw = Array.isArray(json?.favoriteShows) ? json.favoriteShows : [];
  const favorites = [];
  const seen = new Set();
  for (const item of raw) {
    const id = Number(item?.showId);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    favorites.push({
      serializdShowId: id,
      name: typeof item?.showName === "string" ? item.showName : "",
      // Filled by enrichFavoritePosters() — corpus poster if reviewed,
      // else a direct TMDB lookup.
      posterUrl: null,
    });
  }
  return favorites;
}

/**
 * Resolve a w342 poster for each favorite. In-corpus shows reuse the
 * snapshot's poster (already TMDB w342); the rest do a direct TMDB
 * /tv/{id} lookup — serializdShowId IS the TMDB id, so no search /
 * no ambiguity. Paced between TMDB calls. Leaves posterUrl null on a
 * TMDB miss (the card falls back to a title-only treatment).
 */
async function enrichFavoritePosters(favorites, showsById, overrides) {
  for (const fav of favorites) {
    const corpusShow = showsById.get(fav.serializdShowId);
    if (corpusShow?.posterUrl) {
      fav.posterUrl = corpusShow.posterUrl;
      continue;
    }
    await sleep(PAGE_GAP_MS);
    try {
      const details = await fetchTvDetails(fav.serializdShowId);
      const { tmdb } = normalizeTvDetails(details);
      fav.posterUrl = resolvePosterUrl(fav.serializdShowId, tmdb, overrides);
    } catch (e) {
      console.error(
        `      ! TMDB poster for ${fav.serializdShowId} (${fav.name}) → ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }
}

/**
 * Map one GET /api/list/{id} payload to a season-aware ShowList. The
 * payload's `listItems` are ranked SHOW+SEASON entries: a list can rank
 * several seasons of the same show, and show-level entries (miniseries)
 * carry a null season. We preserve each entry's showId, season, and
 * position so the detail page can render the ranking faithfully.
 *
 * Returns null if the payload is malformed (missing listId) so the
 * caller can skip it without aborting the whole run.
 */
function parseList(json) {
  const id = Number(json?.listId);
  if (!Number.isFinite(id)) return null;
  const name = typeof json?.listName === "string" ? json.listName : "";
  const rawItems = Array.isArray(json?.listItems) ? json.listItems : [];

  const items = rawItems.map((it, i) => {
    const season = it?.season ?? null;
    return {
      showId: Number(it?.showId),
      // Prefer the item-level seasonId; fall back to the nested season
      // object. Null for a show-level entry.
      seasonId: Number.isFinite(Number(it?.seasonId))
        ? Number(it.seasonId)
        : Number.isFinite(Number(season?.seasonId ?? season?.id))
          ? Number(season?.seasonId ?? season?.id)
          : null,
      seasonName: typeof season?.name === "string" ? season.name : null,
      seasonNumber: Number.isFinite(Number(season?.seasonNumber))
        ? Number(season.seasonNumber)
        : null,
      // Trust the API's position; fall back to array index so the order
      // is always well-defined even if position is missing.
      position: Number.isFinite(Number(it?.position)) ? Number(it.position) : i,
      showName: typeof it?.showName === "string" ? it.showName : "",
    };
  })
    // Drop any entry without a usable show id, then sort by rank.
    .filter((it) => Number.isFinite(it.showId))
    .sort((a, b) => a.position - b.position);

  return {
    id,
    slug: slugifyListName(name) || String(id),
    name,
    description:
      typeof json?.listDescription === "string" ? json.listDescription : "",
    isRanked: Boolean(json?.isRanked),
    items,
    url: serializdListUrl(name, id),
  };
}

function readSnapshot() {
  if (!existsSync(SNAPSHOT_PATH)) {
    throw new Error(
      `No television snapshot at ${SNAPSHOT_PATH}. Run \`npm run television:bootstrap\` first.`,
    );
  }
  const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
  if (!Array.isArray(snap.shows)) {
    throw new Error(`Snapshot at ${SNAPSHOT_PATH} is malformed (no shows[]).`);
  }
  return snap;
}

/**
 * Stable change-detection key — meaningful fields only (ids, names,
 * descriptions, list order), excluding posterUrl. Keeps the weekly
 * cron from committing on poster-URL churn. Mirrors the films script.
 */
function changeKey(lists, favorites) {
  return JSON.stringify({
    favorites: favorites.map((f) => [f.serializdShowId, f.name]),
    lists: lists.map((l) => [
      l.id,
      l.slug,
      l.name,
      l.description,
      l.isRanked,
      // Item identity = (show, season, rank) so a re-ranking or a
      // season swap is detected, but posterUrl churn (none stored here)
      // never triggers a commit.
      l.items.map((it) => [it.showId, it.seasonId, it.position]),
    ]),
  });
}

/**
 * Fetch favorites + lists and merge them into the television
 * snapshot. Same two call modes as refreshFilmsLists():
 *   • CLI (`writeToDisk: true`): reads + writes the snapshot on disk.
 *   • Cron (`writeToDisk: false`, `prevSnapshot` injected): returns
 *     the merged snapshot in-memory for the route to commit to
 *     GitHub (the Vercel filesystem is read-only at request time).
 *
 * Returns { snapshot, changed, favoritesCount, listsCount }.
 */
export async function refreshTvLists(options = {}) {
  const { writeToDisk = false, prevSnapshot = null } = options;
  const snapshot = prevSnapshot ?? readSnapshot();
  if (!Array.isArray(snapshot.shows)) {
    throw new Error("Base television snapshot is malformed (no shows[]).");
  }
  const corpusIds = new Set(snapshot.shows.map((s) => s.serializdShowId));
  console.log(`[tv-lists] ${snapshot.shows.length} shows in corpus.`);

  console.log("[tv-lists] Fetching favorites + lists from Serializd…");
  const favJson = await fetchJson(`${API_BASE}/api/user/${USER}/favoriteshows`);

  // Fetch each configured list by id (the username→lists endpoint is
  // dead — see LIST_IDS). A null fetch / malformed payload skips that one
  // id; `anyListReachable` tracks whether the list surface responded at
  // all, to distinguish "Malcolm published nothing" from "the API is
  // down" in the guard below.
  const lists = [];
  let anyListReachable = false;
  for (const id of LIST_IDS) {
    await sleep(PAGE_GAP_MS);
    const json = await fetchJson(`${API_BASE}/api/list/${id}`);
    if (json === null) continue; // network / non-OK — skip this id
    anyListReachable = true;
    const list = parseList(json);
    if (list) lists.push(list);
    else console.error(`      ! list ${id} → malformed payload, skipped`);
  }

  // Both surfaces unreachable → almost certainly an auth/header change
  // or outage. Bail without writing so we don't wipe good data.
  if (favJson === null && !anyListReachable) {
    throw new Error(
      "Both favoriteshows and every list fetch failed — aborting without writing.",
    );
  }

  const favorites = parseFavorites(favJson);
  if (favorites.length > 0) {
    const showsById = new Map(
      snapshot.shows.map((s) => [s.serializdShowId, s]),
    );
    const overrides = loadOverrides();
    await enrichFavoritePosters(favorites, showsById, overrides);
  }
  for (const f of favorites) {
    const where = corpusIds.has(f.serializdShowId) ? "in corpus" : "links out";
    console.log(
      `[tv-lists]   · ${f.serializdShowId}: "${f.name}" — ${where}, ${
        f.posterUrl ? "poster ✓" : "poster ✗"
      }`,
    );
  }

  for (const l of lists) {
    console.log(
      `[tv-lists]   · list ${l.id} "${l.name}" — ${l.items.length} ranked items` +
        `${l.isRanked ? "" : " (unranked)"}`,
    );
  }
  console.log(
    `[tv-lists] favorites: ${favorites.length}, lists: ${lists.length}/${LIST_IDS.length} configured`,
  );

  // Mirror the films guard: both surfaces reachable but nothing parsed →
  // treat as a block/auth change rather than a real "no favorites or
  // lists", and preserve existing data. (anyListReachable already gated
  // the hard outage case above; this catches a subtler all-empty parse.)
  if (favorites.length === 0 && lists.length === 0) {
    throw new Error(
      "Parsed zero favorites AND zero lists — likely a block or auth change. " +
        "Aborting without writing so existing data is preserved.",
    );
  }

  const changed =
    changeKey(snapshot.lists ?? [], snapshot.favorites ?? []) !==
    changeKey(lists, favorites);

  snapshot.favorites = favorites;
  snapshot.lists = lists;

  if (writeToDisk) {
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(
      `\n✓ Wrote ${SNAPSHOT_PATH}\n` +
        `   favorites: ${favorites.length}\n` +
        `   lists:     ${lists.length}\n` +
        `   changed:   ${changed}`,
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

// Direct CLI invocation only. When imported (the cron route), this
// branch is skipped — the caller drives refreshTvLists() explicitly
// with writeToDisk:false + an injected prevSnapshot.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  refreshTvLists({ writeToDisk: true }).catch((err) => {
    console.error(
      "\n[refresh-tv-lists] FAILED:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  });
}
