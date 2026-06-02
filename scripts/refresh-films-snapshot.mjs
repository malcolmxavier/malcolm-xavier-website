#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// refresh-films-snapshot.mjs
//
// Orchestrator: parse the Letterboxd CSV export, enrich every film
// with TMDB metadata, compute the aggregated summary, and write the
// snapshot fixture that lib/feeds/letterboxd.ts reads at request
// time.
//
// Output: lib/feeds/_fixtures/letterboxd-snapshot.json
//
// Workflow (matches scripts/refresh-music-snapshot.mjs's posture —
// human-in-the-loop, intentional refresh, no cron):
//   1. Parse latest export under data/letterboxd-export/ → Film[]
//   2. Enrich via TMDB → 739/741 typical match rate
//   3. Aggregate summary (totalFilms, totalReviews, thisYearCount,
//      rating/genre/decade distributions)
//   4. Diff against previous snapshot (if one exists)
//   5. Write snapshot.json, print summary
//
// Run via:
//   npm run films:refresh
// or:
//   node --env-file=.env.local scripts/refresh-films-snapshot.mjs
//
// Then review the diff, commit lib/feeds/_fixtures/letterboxd-snapshot.json,
// push. Vercel rebuilds with the new bundle.
// ─────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseLetterboxdExport } from "./parse-letterboxd-export.mjs";
import { enrichFilms } from "./enrich-tmdb.mjs";

const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/letterboxd-snapshot.json",
);

const OVERRIDES_PATH = path.resolve(
  process.cwd(),
  "data/films/overrides.json",
);

// CLI flag: --full-enrich (or env FILMS_FULL_ENRICH=1) drops the
// sticky-TMDB carryover entirely so every film is re-searched
// against TMDB. Use this periodically (or when you suspect TMDB
// has reassigned an id upstream — rare but documented to happen
// when TMDB merges duplicate film entries). Costs ~2 minutes of
// API throttle on the full catalog; cheap insurance for an
// otherwise-invisible drift mode.
const FULL_ENRICH =
  process.argv.includes("--full-enrich") ||
  process.env.FILMS_FULL_ENRICH === "1";

/**
 * Read overrides.json so the carryover step can detect a manual
 * override that was added or changed since the previous snapshot.
 * When `overrides.tmdbId[slug]` doesn't match the carried-over id,
 * we drop carryover for that film and let the enricher re-search
 * (which now consults overrides first). Without this, edits to
 * overrides.json never land — the enrichment is sticky. Mirrors
 * the loadOverrides() pattern in enrich-tmdb.mjs.
 */
function loadOverrides() {
  if (!existsSync(OVERRIDES_PATH)) return { tmdbId: {}, posterPath: {} };
  try {
    const raw = JSON.parse(readFileSync(OVERRIDES_PATH, "utf-8"));
    return {
      tmdbId: raw.tmdbId ?? {},
      posterPath: raw.posterPath ?? {},
    };
  } catch {
    return { tmdbId: {}, posterPath: {} };
  }
}

/**
 * Compute pre-aggregated summary stats for the snapshot envelope.
 * The runtime layer reads `summary` directly so SummaryPanel never
 * has to scan the films array.
 */
function aggregateSummary(films) {
  const currentYear = new Date().getUTCFullYear();
  let totalReviews = 0;
  let thisYearCount = 0;
  const ratingDist = {};
  const genreDist = {};
  const decadeDist = {};

  for (const film of films) {
    totalReviews += film.reviews.length;

    // Watched-this-year? Uses the calendar year of latestWatchedDate
    // — i.e. did Malcolm watch this film at any point this year? Aligns
    // with the grid's primary sort dimension and matches the user-
    // facing label ("Watched this year"). For non-rewatched films this
    // equals firstWatchedDate; for rewatches it counts a recent watch
    // even if the original viewing was years ago.
    const watchedYear = Number.parseInt(
      film.latestWatchedDate.slice(0, 4),
      10,
    );
    if (watchedYear === currentYear) thisYearCount++;

    // Rating distribution is per-REVIEW (not per-film) so a film
    // with 3 reviews counts 3 times. Matches Letterboxd's profile-
    // page rating histogram.
    for (const r of film.reviews) {
      if (r.rating !== null) {
        const key = String(r.rating);
        ratingDist[key] = (ratingDist[key] ?? 0) + 1;
      }
    }

    // Genre distribution is per-FILM (a film with 2 genres counts
    // once in each). Films with tmdb: null contribute nothing.
    if (film.tmdb?.genres) {
      for (const g of film.tmdb.genres) {
        genreDist[g] = (genreDist[g] ?? 0) + 1;
      }
    }

    // Decade distribution is per-FILM, keyed as "2020s", "2010s", etc.
    if (Number.isFinite(film.releaseYear)) {
      const decade = `${Math.floor(film.releaseYear / 10) * 10}s`;
      decadeDist[decade] = (decadeDist[decade] ?? 0) + 1;
    }
  }

  return {
    totalFilms: films.length,
    totalReviews,
    thisYearCount,
    ratingDistribution: ratingDist,
    genreDistribution: genreDist,
    decadeDistribution: decadeDist,
  };
}

/**
 * Build the LetterboxdSnapshot envelope from the enriched films.
 * filmById is keyed by Film.id (TMDB id once enriched, slug+year
 * for unmatched holdouts) for O(1) detail-page lookups.
 *
 * `lists` and `favorites` are authored by the separate slow-cadence
 * scrape (scripts/refresh-films-lists.mjs), not here. We carry them
 * over verbatim from the previous snapshot so a CSV/RSS refresh
 * doesn't silently drop the editorial-landing data between list
 * scrapes. They go stale only in the sense that a film newly added
 * to a list won't appear until the next lists scrape — acceptable
 * given the cadence split.
 */
function buildSnapshot(films, prev) {
  const summary = aggregateSummary(films);
  const filmById = {};
  for (const f of films) filmById[f.id] = f;
  const snapshot = {
    capturedAt: new Date().toISOString(),
    summary,
    films,
    filmById,
  };
  if (prev?.lists) snapshot.lists = prev.lists;
  if (prev?.favorites) snapshot.favorites = prev.favorites;
  return snapshot;
}

/** Read the previous snapshot for diffing, or null if none. */
function readPreviousSnapshot() {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
  } catch {
    return null;
  }
}

/** Compact diff summary so the human reviewer can decide whether
 *  to commit. */
function printDiff(prev, next) {
  if (!prev) {
    console.log("\nFirst snapshot — no diff to compute.");
    return;
  }
  const prevFilms = new Set(prev.films?.map((f) => f.id) ?? []);
  const nextFilms = new Set(next.films.map((f) => f.id));
  const added = [...nextFilms].filter((id) => !prevFilms.has(id));
  const removed = [...prevFilms].filter((id) => !nextFilms.has(id));

  console.log("\nDiff vs previous snapshot:");
  console.log(`  Captured: ${prev.capturedAt} → ${next.capturedAt}`);
  console.log(
    `  Films:    ${prev.summary?.totalFilms ?? "?"} → ${next.summary.totalFilms}` +
      (added.length > 0 ? ` (+${added.length})` : "") +
      (removed.length > 0 ? ` (-${removed.length})` : ""),
  );
  console.log(
    `  Reviews:  ${prev.summary?.totalReviews ?? "?"} → ${next.summary.totalReviews}`,
  );
  if (added.length > 0 && added.length <= 10) {
    console.log("  Added films:");
    for (const id of added) {
      const f = next.filmById[id];
      console.log(`    + ${f.title} (${f.releaseYear})`);
    }
  }
  if (removed.length > 0 && removed.length <= 10) {
    console.log("  Removed films:");
    for (const id of removed) {
      const f = prev.filmById?.[id];
      console.log(`    - ${f ? `${f.title} (${f.releaseYear})` : id}`);
    }
  }
}

async function main() {
  console.log("[1/3] Parsing Letterboxd export…");
  const films = parseLetterboxdExport();
  console.log(`      Parsed ${films.length} films.`);

  // Sticky-TMDB carryover. Match fresh-parsed films (keyed by
  // seedId = letterboxdSlug-releaseYear) to enriched films from
  // the previous snapshot and reuse their TMDB metadata + the
  // promoted canonical id. The enrichment loop in enrich-tmdb.mjs
  // skips any film with `tmdb` already populated, so this turns a
  // 2-3 minute refresh into a near-instant sort/aggregate-only
  // pass once the catalog is stable.
  //
  // Two carryover-skip rules guard against silent drift:
  //   1. --full-enrich / FILMS_FULL_ENRICH=1 drops carryover for
  //      every film. Use periodically to catch upstream TMDB id
  //      reassignments (rare; happens when TMDB merges duplicate
  //      entries). Without this lever, a sticky id can outlive
  //      the underlying TMDB record forever.
  //   2. If `overrides.tmdbId[slug]` was added or changed since
  //      the previous snapshot, drop carryover for that film so
  //      the enricher re-searches against the new override. The
  //      old behavior silently ignored override edits because the
  //      sticky path never consulted overrides.
  const prev = readPreviousSnapshot();
  const overrides = loadOverrides();
  let carriedOver = 0;
  let overrideDriftSkips = 0;
  if (prev?.films && !FULL_ENRICH) {
    const prevByIdentity = new Map();
    for (const f of prev.films) {
      prevByIdentity.set(`${f.letterboxdSlug}-${f.releaseYear}`, f);
    }
    for (const film of films) {
      const prevFilm = prevByIdentity.get(
        `${film.letterboxdSlug}-${film.releaseYear}`,
      );
      if (!prevFilm?.tmdb) continue;
      const overrideId = overrides.tmdbId[film.letterboxdSlug];
      if (overrideId !== undefined && overrideId !== prevFilm.tmdb.id) {
        // Override added/changed since previous snapshot — let the
        // enricher re-resolve so the new override actually lands.
        overrideDriftSkips++;
        continue;
      }
      film.tmdb = prevFilm.tmdb;
      film.posterUrl = prevFilm.posterUrl;
      film.posterFallbackUrl = prevFilm.posterFallbackUrl;
      film.id = prevFilm.id; // promote seedId → canonical tmdb-X
      carriedOver++;
    }
    console.log(
      `      Carried over ${carriedOver} TMDB enrichments from previous snapshot.` +
        (overrideDriftSkips > 0
          ? ` Re-enriching ${overrideDriftSkips} film(s) where overrides.json changed.`
          : ""),
    );
  } else if (prev?.films && FULL_ENRICH) {
    console.log("      --full-enrich set: skipping carryover, re-querying TMDB for every film.");
  }

  console.log("\n[2/3] Enriching with TMDB metadata…");
  const stats = await enrichFilms(films, {
    onProgress: (done, total) => {
      if (done % 50 === 0 || done === total) {
        process.stderr.write(`\r        ${done}/${total}…`);
      }
    },
  });
  console.error(""); // newline after progress
  console.log(
    `      ${stats.enriched}/${stats.total} matched + enriched.` +
      (stats.unmatched.length > 0
        ? ` ${stats.unmatched.length} unmatched (run \`npm run films:refresh\` after adding overrides).`
        : ""),
  );
  if (stats.unmatched.length > 0) {
    console.log("\n      Unmatched films (add to data/films/overrides.json):");
    for (const u of stats.unmatched) {
      console.log(`        • ${u.title} (${u.year})  slug=${u.slug}`);
    }
  }

  console.log("\n[3/3] Building snapshot…");
  const snapshot = buildSnapshot(films, prev);
  printDiff(prev, snapshot);

  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(
    `\n✓ Wrote ${SNAPSHOT_PATH} (${snapshot.films.length} films, ` +
      `${snapshot.summary.totalReviews} reviews).`,
  );
  console.log("\nNext: review the diff, commit the snapshot, push.");
  console.log("  git add lib/feeds/_fixtures/letterboxd-snapshot.json");
  console.log("  git commit -m 'Refresh films snapshot'");
  console.log("  git push");
}

main().catch((err) => {
  console.error(
    "\n[refresh-films-snapshot] FAILED:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
