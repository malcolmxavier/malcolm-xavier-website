// ─────────────────────────────────────────────────────────────────
// parse-letterboxd-export.mjs — STUB
//
// Invoked by refresh-films-snapshot.mjs. Reads the unzipped CSV
// export from data/letterboxd-export/, joins reviews to diary
// entries by date + film, applies the prose-only filter (only
// reviews with reviewText !== "" qualify), groups by canonical
// `${letterboxdSlug}-${releaseYear}` seed key, and emits Film[]
// entries ready for TMDB enrichment.
//
// Schema notes (Letterboxd CSV exports as of late 2025):
//   diary.csv:    Date, Name, Year, Letterboxd URI, Rating, Rewatch,
//                 Tags, Watched Date
//   reviews.csv:  Date, Name, Year, Letterboxd URI, Rating, Rewatch,
//                 Watched Date, Tags, Review (with newlines escaped)
//   ratings.csv:  Date, Name, Year, Letterboxd URI, Rating
//   watched.csv:  Date, Name, Year, Letterboxd URI
//
// Edge cases the real parser must handle:
//   • Multiple diary entries for the same film+date (double features).
//   • Reviews with embedded commas / quotes / newlines in Review field
//     (CSV escaping — use a real parser like `csv-parse`).
//   • Rating-only diary entries (no review prose) — filtered out per
//     scope rule.
//   • Same title + year for two different films (rare; rely on slug).
// ─────────────────────────────────────────────────────────────────

export function parseLetterboxdExport(/* exportDir */) {
  throw new Error(
    "parseLetterboxdExport is not implemented yet — the CSV parser " +
      "lands once an export ZIP is in data/letterboxd-export/ and we " +
      "can validate the schema against real data.",
  );
}
