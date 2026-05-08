#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// refresh-serializd-incremental.mjs
//
// Probe-then-bootstrap orchestrator for /television. Two callers:
//   1. Local CLI: `npm run television:refresh` — reads the snapshot
//      from disk, probes, and (if new entries) drives the full
//      bootstrap in-process to rewrite the snapshot on disk.
//   2. The Vercel cron route at /api/cron/television-refresh —
//      imports `probeForNewReviews` directly and orchestrates its
//      own probe → bootstrap → push-via-GitHub-API flow without
//      ever invoking this file's CLI path.
//
// Pipeline (probe-then-bootstrap):
//   1. Load the existing snapshot, build a Set of every review id
//      already captured.
//   2. Fetch diary page 1 (the 24 most-recent entries — the
//      Serializd analog of "RSS window").
//   3. If every probed review id is already known → exit 0 (no-op).
//      The common case on most ticks; ~1 API call total.
//   4. Else → call bootstrapSnapshot({ writeToDisk: true }) which
//      re-paginates the full diary, re-applies sticky-TMDB
//      carryover (so TMDB is hit only for shows that are genuinely
//      new to the catalog), and rewrites the snapshot.
//
// Why call bootstrap in-process rather than spawning a child:
// the prior version used spawnSync for log-streaming, but
// console.log inside an imported module goes to the same stdout
// — no behavior loss, and we get exception propagation for free.
// (The Vercel cron route reuses the same in-process call with
// `writeToDisk: false`.)
//
// Exit codes (CLI):
//   0 — success (no-op OR successful bootstrap-on-change)
//   1 — fatal error (probe unreachable, bootstrap failed, etc.)
// ─────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bootstrapSnapshot } from "./bootstrap-serializd-snapshot.mjs";

const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/serializd-snapshot.json",
);
const SERIALIZD_USER = "malxavi";
const SERIALIZD_API_BASE = "https://serializd.onrender.com";
// ASCII-only User-Agent — em-dash here would 500 the fetch via
// "Cannot convert argument to a ByteString". Identifies the request
// as our snapshot-driven hourly refresh so an upstream operator
// inspecting traffic can find a route back to us.
const SERIALIZD_HEADERS = {
  "X-Requested-With": "serializd_vercel",
  "User-Agent":
    "malxavi.com /television cluster - read-only, snapshot-driven, hourly (https://malxavi.com)",
};

/**
 * Pure helper: given a parsed snapshot JSON, fetch Serializd diary
 * page 1 and return the new review ids that aren't already captured.
 *
 * Returns:
 *   { hasNew, probedCount, newReviews }
 *     - hasNew: boolean — true if any probed review id is unknown
 *     - probedCount: number — total entries returned by page 1
 *     - newReviews: array — the raw Serializd review entries (with
 *       embedded targetEntity) for any unknown ids; useful for log
 *       lines and for future "show me the diff" surfaces
 *
 * Throws if the probe HTTP call fails. Callers decide whether to
 * retry, surface the error to logs, or return non-zero from CI.
 */
export async function probeForNewReviews(snapshot) {
  const knownReviewIds = new Set();
  for (const show of snapshot?.shows ?? []) {
    for (const r of show.reviews ?? []) knownReviewIds.add(r.id);
  }

  const url = `${SERIALIZD_API_BASE}/api/user/${SERIALIZD_USER}/diary?page=1&include_target=ALL`;
  const res = await fetch(url, { headers: SERIALIZD_HEADERS });
  if (!res.ok) {
    throw new Error(
      `Serializd probe failed: ${res.status} ${res.statusText}. URL: ${url}`,
    );
  }
  const json = await res.json();
  const probedReviews = json.reviews ?? [];
  const newReviews = probedReviews.filter(
    (r) => !knownReviewIds.has(r.id),
  );

  return {
    hasNew: newReviews.length > 0,
    probedCount: probedReviews.length,
    newReviews,
  };
}

/**
 * Pretty-prints the first ~5 new entries from a probe result. Same
 * format the prior version used in the workflow log; isolated so
 * both the CLI and the cron route can call it for parity in
 * GitHub-Actions logs and Vercel function logs.
 */
export function logProbeFindings(newReviews) {
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
}

// ─── CLI entry ────────────────────────────────────────────────────

async function cli() {
  if (!existsSync(SNAPSHOT_PATH)) {
    // No prior snapshot — first-run. Skip the probe and run a full
    // bootstrap. CI shouldn't normally hit this branch (the snapshot
    // is committed), but local + recovery flows do.
    console.log(
      "No snapshot found. Running full bootstrap to seed the catalog...",
    );
    const { hasBlockingIssues } = await bootstrapSnapshot({ writeToDisk: true });
    if (hasBlockingIssues) process.exit(1);
    return;
  }

  const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
  const knownCount = (snap.shows ?? []).reduce(
    (acc, s) => acc + (s.reviews?.length ?? 0),
    0,
  );
  console.log(
    `Snapshot loaded: ${snap.shows?.length ?? 0} shows, ${knownCount} reviews known.`,
  );

  const { hasNew, probedCount, newReviews } = await probeForNewReviews(snap);
  if (probedCount === 0) {
    console.log("Probe returned 0 reviews. Nothing to do.");
    return;
  }
  if (!hasNew) {
    console.log(
      `Probe: no new entries on page 1 (${probedCount} probed). Snapshot is current — exiting without rewrite.`,
    );
    return;
  }

  console.log(
    `Probe: ${newReviews.length} new ${newReviews.length === 1 ? "entry" : "entries"} on page 1. Running full bootstrap...`,
  );
  logProbeFindings(newReviews);

  const { hasBlockingIssues } = await bootstrapSnapshot({ writeToDisk: true });
  if (hasBlockingIssues) process.exit(1);
}

const isDirectInvocation =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectInvocation) {
  cli().catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
}
