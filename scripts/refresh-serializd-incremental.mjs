#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// refresh-serializd-incremental.mjs
//
// Hourly /television refresh — runs in CI via
// .github/workflows/television-refresh.yml. Mirrors the role of
// scripts/incremental-rss-refresh.mjs for /films, but adapted to
// Serializd's lack of an RSS feed.
//
// Pipeline (probe-then-bootstrap):
//   1. Load the existing snapshot, build a Set of every review id
//      already captured.
//   2. Fetch diary page 1 (the 24 most-recent entries — the
//      Serializd analog of "RSS window").
//   3. If every probed review id is already known → exit 0 (no-op).
//      The common case on most ticks; ~1 API call total.
//   4. Else → spawn bootstrap-serializd-snapshot.mjs as a child
//      process. Bootstrap re-paginates the full diary, re-applies
//      sticky-TMDB carryover (so TMDB is hit only for shows that
//      are genuinely new to the catalog), and rewrites the
//      snapshot.
//
// Why defer to bootstrap rather than reimplementing the merge:
// keeping the show-skeleton + enrichment + classification logic in
// one place avoids the drift that would inevitably happen between
// a "fast incremental" path and a "full re-seed" path. Serializd
// embeds full show metadata in every diary entry, so the marginal
// cost of re-paginating the full diary on a hit-week is small —
// typically ~30 pages × 500ms = ~15s wall time, all under one cron
// budget.
//
// Run via:
//   npm run television:refresh
// or in CI (workflow sets TMDB_API_KEY in env):
//   node scripts/refresh-serializd-incremental.mjs
//
// Exit codes:
//   0 — success (no-op OR successful bootstrap-on-change)
//   1 — fatal error (probe unreachable, bootstrap failed, etc.)
// ─────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/serializd-snapshot.json",
);
const SERIALIZD_USER = "malxavi";
const SERIALIZD_API_BASE = "https://serializd.onrender.com";
// Same headers as bootstrap — ASCII-only User-Agent (em-dash here
// would 500 the fetch via "Cannot convert argument to a ByteString").
// Identifies the request as our snapshot-driven hourly refresh so an
// upstream operator inspecting traffic can find a route back to us.
const SERIALIZD_HEADERS = {
  "X-Requested-With": "serializd_vercel",
  "User-Agent":
    "malxavi.com /television cluster - read-only, snapshot-driven, hourly (https://malxavi.com)",
};

const BOOTSTRAP_SCRIPT = path.resolve(
  process.cwd(),
  "scripts/bootstrap-serializd-snapshot.mjs",
);

async function main() {
  if (!existsSync(SNAPSHOT_PATH)) {
    // No prior snapshot — first-run. Skip the probe entirely and
    // run a full bootstrap. CI shouldn't normally hit this branch
    // (the snapshot is committed), but local + recovery flows do.
    console.log(
      "No snapshot found. Running full bootstrap to seed the catalog...",
    );
    runBootstrap();
    return;
  }

  const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
  const knownReviewIds = new Set();
  for (const show of snap.shows ?? []) {
    for (const r of show.reviews ?? []) knownReviewIds.add(r.id);
  }
  console.log(
    `Snapshot loaded: ${snap.shows?.length ?? 0} shows, ${knownReviewIds.size} reviews known.`,
  );

  // Probe page 1 of the diary — the cheapest "has anything moved?"
  // signal Serializd offers without an RSS feed. Page 1 carries the
  // 24 most-recent entries; any new review will land here first.
  const url = `${SERIALIZD_API_BASE}/api/user/${SERIALIZD_USER}/diary?page=1&include_target=ALL`;
  const res = await fetch(url, { headers: SERIALIZD_HEADERS });
  if (!res.ok) {
    console.error(
      `Probe failed: ${res.status} ${res.statusText}. URL: ${url}`,
    );
    process.exit(1);
  }
  const json = await res.json();
  const probedReviews = json.reviews ?? [];
  if (probedReviews.length === 0) {
    console.log("Probe returned 0 reviews. Nothing to do.");
    process.exit(0);
  }

  const newReviews = probedReviews.filter(
    (r) => !knownReviewIds.has(r.id),
  );
  if (newReviews.length === 0) {
    console.log(
      `Probe: no new entries on page 1 (${probedReviews.length} probed). Snapshot is current — exiting without rewrite.`,
    );
    process.exit(0);
  }

  // Log what triggered the bootstrap so the workflow log reads as
  // a useful audit trail. Cap to 5 entries so a 24-new burst still
  // produces a skim-readable log.
  console.log(
    `Probe: ${newReviews.length} new ${newReviews.length === 1 ? "entry" : "entries"} on page 1. Running full bootstrap...`,
  );
  for (const r of newReviews.slice(0, 5)) {
    const showName = r.targetEntity?.showName ?? "(unknown show)";
    const seasonNumber =
      r.targetEntity?.targetType === "EPISODE"
        ? `S${r.targetEntity?.seasonNumber}E${r.targetEntity?.episodeNumber}`
        : r.targetEntity?.targetType === "SEASON"
          ? `S${r.targetEntity?.seasonNumber}`
          : "(show)";
    console.log(`  • [${r.id}] ${showName} ${seasonNumber}`);
  }
  if (newReviews.length > 5) {
    console.log(`  • …and ${newReviews.length - 5} more.`);
  }

  runBootstrap();
}

function runBootstrap() {
  // spawnSync with stdio:'inherit' streams bootstrap's progress
  // log directly to stdout, which the workflow captures into the
  // Actions log. Inheriting process.env passes through TMDB_API_KEY
  // (set by CI's env: block, or by --env-file=.env.local locally).
  const result = spawnSync("node", [BOOTSTRAP_SCRIPT], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error("Bootstrap failed to start:", result.error);
    process.exit(1);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    console.error(`Bootstrap exited with status ${result.status}.`);
    process.exit(result.status);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
