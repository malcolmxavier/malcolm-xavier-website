#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// refresh-films-snapshot.mjs — STUB
//
// Mirrors scripts/refresh-music-snapshot.mjs once implemented.
// Real shape:
//   1. Detect/kill any running `next dev` (Next 16 per-project lock).
//   2. Spawn `npm run dev:online` on :3001.
//   3. Wait for server ready.
//   4. Probe /api/letterboxd/health for RSS + TMDB reachability.
//   5. Call /api/letterboxd/snapshot — does the actual capture:
//      • If diary.csv mtime newer than current snapshot.capturedAt:
//        bulk re-seed from CSV + TMDB enrichment for new films.
//      • Else: incremental refresh from RSS, TMDB-enrich any new
//        entries, re-aggregate summary.
//   6. Diff old vs new — film count delta, review count delta, new
//      films, rating distribution shifts. Print summary.
//   7. Write lib/feeds/_fixtures/letterboxd-snapshot.json.
//   8. Tear down dev:online; remind user to restart their normal dev.
//
// User commits the JSON and pushes. No cron — refresh is intentional.
// ─────────────────────────────────────────────────────────────────

console.error(
  [
    "films:refresh is not implemented yet.",
    "",
    "Steps to unblock:",
    "  1. Drop your unzipped Letterboxd export into data/letterboxd-export/",
    "     (see that directory's README for export instructions).",
    "  2. The CSV parser + TMDB enrichment + refresh orchestrator land",
    "     in a follow-up commit on the films branch.",
    "",
    "Until then, this script exits 1 to make the gap explicit.",
  ].join("\n"),
);
process.exit(1);
