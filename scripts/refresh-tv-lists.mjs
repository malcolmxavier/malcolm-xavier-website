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
//   • /api/user/<user>/lists         → { lists: [...], totalPages }
//     (returns empty today — Malcolm has no Serializd lists yet, so
//      the TV Lists module ships dormant until this is populated.)
//
// Both favorites and lists reference shows by serializdShowId (=
// TMDB tv id), which joins to the reviewed corpus for the rich card.
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
const FETCH_TIMEOUT_MS = 20_000;
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
 * Map the lists payload to ShowList[]. Empty today, so the field
 * shapes are inferred defensively — when Malcolm creates a Serializd
 * list and this first returns data, we log the raw item so the
 * mapping can be confirmed/refined rather than silently mis-parsed.
 */
function parseLists(json) {
  const raw = Array.isArray(json?.lists) ? json.lists : [];
  if (raw.length > 0) {
    console.log(
      `      (first Serializd list item shape, for mapping review:\n${JSON.stringify(
        raw[0],
        null,
        2,
      ).replace(/^/gm, "        ")})`,
    );
  }
  return raw.map((item) => {
    const slug = String(item?.slug ?? item?.id ?? item?.listId ?? "");
    // Show ids can live under a few plausible keys depending on the
    // list payload shape; collect numeric ids from whichever is present.
    const showSource = item?.shows ?? item?.items ?? item?.showIds ?? [];
    const showIds = (Array.isArray(showSource) ? showSource : [])
      .map((s) => Number(typeof s === "object" ? (s?.showId ?? s?.id) : s))
      .filter((n) => Number.isFinite(n));
    return {
      slug,
      name: typeof item?.name === "string" ? item.name : (item?.title ?? ""),
      description:
        typeof item?.description === "string" ? item.description : "",
      showIds,
      url: item?.url ?? (slug ? `${SITE_BASE}/${USER}/list/${slug}` : ""),
    };
  });
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
    lists: lists.map((l) => [l.slug, l.name, l.description, l.showIds]),
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
  await sleep(PAGE_GAP_MS);
  const listsJson = await fetchJson(`${API_BASE}/api/user/${USER}/lists`);

  // Both endpoints unreachable → almost certainly an auth/header
  // change or outage. Bail without writing so we don't wipe good data.
  if (favJson === null && listsJson === null) {
    throw new Error(
      "Both favoriteshows and lists fetches failed — aborting without writing.",
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

  const lists = parseLists(listsJson);
  const totalPages = Number(listsJson?.totalPages ?? 0);
  console.log(
    `[tv-lists] favorites: ${favorites.length}, lists: ${lists.length}` +
      (totalPages > 1
        ? ` (NOTE: totalPages=${totalPages}; pagination not yet implemented — add it before relying on full list coverage)`
        : ""),
  );

  // Mirror the films guard: nothing parsed from either surface →
  // treat as a block/auth change rather than a real "no favorites or
  // lists", and preserve existing data. (Lists alone being empty is
  // normal today, so the guard keys on favorites-empty-too.)
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
