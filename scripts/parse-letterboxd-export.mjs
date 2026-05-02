// ─────────────────────────────────────────────────────────────────
// parse-letterboxd-export.mjs
//
// Reads the unzipped Letterboxd CSV export from
// data/letterboxd-export/<timestamped-folder>/ and converts it into
// the Film[] shape expected by the snapshot writer.
//
// Key behaviors:
//   • Auto-discovers the latest timestamped subfolder by mtime so
//     re-exports just get added to the directory without flattening.
//   • Joins diary.csv ↔ reviews.csv on (Date, Letterboxd URI) — the
//     two files share these fields per Letterboxd's export schema.
//   • Reads likes/films.csv to set Film.liked (Letterboxd's "like"
//     is a film-level flag, not a per-review flag).
//   • Applies the prose-only scope filter: a diary entry only
//     qualifies a film for /films when it has matching prose in
//     reviews.csv. Rating-only watches are dropped.
//   • Groups multiple diary entries (rewatches with reviews) under
//     a single Film keyed by `${slug}-${releaseYear}`.
//   • Computes per-film aggregates (firstReviewDate, latestReviewDate,
//     primaryRating, ratingSet, reviewYearSet) so the runtime layer
//     does O(1) Set membership filtering.
//
// Does NOT yet:
//   • Enrich with TMDB metadata (genres, runtime, director, poster
//     paths). That's a separate stage in lib/feeds/tmdb.ts.
//   • Resolve canonical /film/<slug>/ URLs from boxd.it short URIs.
//     The boxd.it URL is stable and 301s correctly, so we use it
//     directly as Film.letterboxdUrl.
//   • Set containsSpoilers — the CSV doesn't include that flag.
//     Parser leaves it false; RSS path can override later.
//
// CSV schema (Letterboxd export, late 2025+):
//   diary.csv:    Date, Name, Year, Letterboxd URI, Rating, Rewatch, Tags, Watched Date
//   reviews.csv:  Date, Name, Year, Letterboxd URI, Rating, Rewatch, Review, Tags, Watched Date
//   likes/films.csv: Date, Name, Year, Letterboxd URI
// ─────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const EXPORT_ROOT = path.resolve(process.cwd(), "data/letterboxd-export");

/**
 * Find the most recent unzipped Letterboxd export folder. Letterboxd
 * ZIPs unzip into `letterboxd-<user>-<timestamp>-utc/`; multiple
 * exports can coexist and we pick the freshest by mtime.
 */
function findLatestExportDir() {
  if (!existsSync(EXPORT_ROOT)) {
    throw new Error(
      `${EXPORT_ROOT} doesn't exist. Drop your unzipped Letterboxd ` +
        `export there (see README in that directory).`,
    );
  }
  const entries = readdirSync(EXPORT_ROOT, { withFileTypes: true });
  const candidates = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("letterboxd-"))
    .map((e) => {
      const full = path.join(EXPORT_ROOT, e.name);
      return { full, mtime: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  if (candidates.length === 0) {
    throw new Error(
      `No Letterboxd export found under ${EXPORT_ROOT}. ` +
        `Letterboxd's ZIP unzips into a 'letterboxd-<user>-<timestamp>-utc/' folder; ` +
        `make sure the unzipped folder is in place (don't flatten it).`,
    );
  }
  return candidates[0].full;
}

/**
 * URL-safe slug from a film title. Lowercase, ASCII-fold accents,
 * collapse non-alphanumeric runs into single hyphens, strip
 * leading/trailing hyphens. Mirrors Letterboxd's own slug
 * convention closely enough for our /films/<slug>-<year> URLs.
 */
function slugify(title) {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Read a CSV with full RFC-4180 quoting + embedded-newline support. */
function readCsv(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    bom: true,
  });
}

function parseRating(s) {
  if (!s || s === "") return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseRewatch(s) {
  if (!s) return false;
  const lower = s.toLowerCase();
  return lower === "yes" || lower === "true" || lower === "1";
}

function parseTags(s) {
  if (!s) return [];
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Parse the export into Film[] entries. Each Film carries its full
 * review history sorted newest-first, plus pre-aggregated fields
 * the runtime layer reads directly.
 *
 * Returns shapes matching lib/feeds/letterboxd-utils.ts's Film type
 * with `tmdb: null` and `posterUrl: null` — those fields are filled
 * in by the TMDB enrichment stage (lib/feeds/tmdb.ts).
 */
export function parseLetterboxdExport(exportDir) {
  const dir = exportDir ?? findLatestExportDir();
  const diaryRows = readCsv(path.join(dir, "diary.csv"));
  const reviewRows = readCsv(path.join(dir, "reviews.csv"));

  // Likes are optional — if the file is missing for some reason,
  // every film just stays liked: false rather than crashing.
  const likedUris = new Set();
  const likesPath = path.join(dir, "likes", "films.csv");
  if (existsSync(likesPath)) {
    for (const row of readCsv(likesPath)) {
      const uri = row["Letterboxd URI"];
      if (uri) likedUris.add(uri);
    }
  }

  // Index reviews by their join key. diary.csv and reviews.csv
  // both use (Date, Letterboxd URI) to identify the same diary
  // entry — same date, same film URI = same watch event.
  const reviewsByKey = new Map();
  for (const r of reviewRows) {
    const key = `${r.Date}|${r["Letterboxd URI"]}`;
    reviewsByKey.set(key, r);
  }

  // Walk diary entries; only keep ones with a paired prose review.
  // Multiple diary entries for the same film (rewatches) accumulate
  // under one Film keyed by `${slug}-${releaseYear}`.
  const filmsBySeedId = new Map();

  for (const d of diaryRows) {
    const reviewKey = `${d.Date}|${d["Letterboxd URI"]}`;
    const review = reviewsByKey.get(reviewKey);
    if (!review) continue;
    const reviewText = (review.Review ?? "").trim();
    if (reviewText === "") continue; // scope filter: prose required

    const title = d.Name;
    const releaseYear = Number.parseInt(d.Year, 10);
    const slug = slugify(title);
    const seedId = `${slug}-${releaseYear}`;
    const url = d["Letterboxd URI"];

    const reviewObj = {
      watchedDate: d["Watched Date"] || d.Date,
      reviewDate: review.Date,
      // Diary's rating is canonical for the watch event; reviews
      // duplicates it. Use diary's value to be safe.
      rating: parseRating(d.Rating),
      rewatch: parseRewatch(d.Rewatch),
      // Letterboxd's CSV doesn't expose the spoiler flag — the RSS
      // path is the only source for it. Default false here; an RSS
      // overlay can update for recent entries.
      containsSpoilers: false,
      reviewText,
      tags: parseTags(d.Tags),
    };

    if (filmsBySeedId.has(seedId)) {
      filmsBySeedId.get(seedId).reviews.push(reviewObj);
    } else {
      filmsBySeedId.set(seedId, {
        id: seedId,
        letterboxdSlug: slug,
        // boxd.it short URLs are stable and 301 to the canonical
        // film page. Using them directly avoids guessing the slug
        // for films Letterboxd disambiguates with year suffixes
        // (e.g. /film/dune-2021/ vs /film/dune/).
        letterboxdUrl: url,
        title,
        releaseYear,
        liked: likedUris.has(url),
        reviews: [reviewObj],
        // Computed below after all reviews are accumulated:
        firstWatchedDate: "",
        firstReviewDate: "",
        latestReviewDate: "",
        primaryRating: null,
        // Filled by TMDB enrichment stage:
        tmdb: null,
        posterUrl: null,
        posterFallbackUrl: null,
        // Computed below from the review array:
        ratingSet: [],
        reviewYearSet: [],
      });
    }
  }

  // Compute per-film aggregates.
  const films = [];
  for (const film of filmsBySeedId.values()) {
    // Newest-first review order — primary rating + latest activity
    // come from index 0; first review is index length-1.
    film.reviews.sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
    const newest = film.reviews[0];
    const oldest = film.reviews[film.reviews.length - 1];

    // firstWatchedDate is the earliest watch event across reviews
    // (could differ from firstReviewDate if a watch was logged
    // before the review was published).
    const watchedDates = film.reviews.map((r) => r.watchedDate).sort();
    film.firstWatchedDate = watchedDates[0] ?? "";

    film.firstReviewDate = oldest.reviewDate;
    film.latestReviewDate = newest.reviewDate;
    film.primaryRating = newest.rating; // null-not-zero per JSDoc

    film.ratingSet = [
      ...new Set(
        film.reviews.map((r) => r.rating).filter((r) => r !== null),
      ),
    ].sort((a, b) => a - b);

    film.reviewYearSet = [
      ...new Set(
        film.reviews.map((r) => Number.parseInt(r.reviewDate.slice(0, 4), 10)),
      ),
    ].sort((a, b) => a - b);

    films.push(film);
  }

  // Sort by firstReviewDate descending — newest-discovered films
  // first. Matches Film[] canonical order documented in
  // lib/feeds/letterboxd-utils.ts.
  films.sort((a, b) => b.firstReviewDate.localeCompare(a.firstReviewDate));

  return films;
}

// CLI entry — when invoked directly, print a summary so a developer
// can sanity-check the parse without writing a snapshot file.
if (import.meta.url === `file://${process.argv[1]}`) {
  const films = parseLetterboxdExport();
  const totalReviews = films.reduce((sum, f) => sum + f.reviews.length, 0);
  const ratedCount = films.filter((f) => f.primaryRating !== null).length;
  const likedCount = films.filter((f) => f.liked).length;
  const multiReviewFilms = films.filter((f) => f.reviews.length > 1).length;

  console.log(`Parsed ${films.length} films, ${totalReviews} reviews`);
  console.log(`  ${ratedCount} films with a primaryRating (non-null)`);
  console.log(`  ${likedCount} films with liked: true`);
  console.log(`  ${multiReviewFilms} films with multiple reviews (rewatches)`);
  console.log("");
  console.log(`First (newest by firstReviewDate):`);
  const f = films[0];
  if (f) {
    console.log(`  ${f.title} (${f.releaseYear})`);
    console.log(`  id: ${f.id}`);
    console.log(`  url: ${f.letterboxdUrl}`);
    console.log(`  liked: ${f.liked}`);
    console.log(`  reviews: ${f.reviews.length}`);
    console.log(`  primaryRating: ${f.primaryRating}`);
    console.log(`  firstReviewDate: ${f.firstReviewDate}`);
    console.log(`  latestReviewDate: ${f.latestReviewDate}`);
    console.log(`  ratingSet: [${f.ratingSet.join(", ")}]`);
    console.log(`  reviewYearSet: [${f.reviewYearSet.join(", ")}]`);
    console.log(
      `  most-recent review excerpt: "${f.reviews[0].reviewText.slice(0, 120)}${f.reviews[0].reviewText.length > 120 ? "…" : ""}"`,
    );
  }
}
