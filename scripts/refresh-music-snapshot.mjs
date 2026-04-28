// ─────────────────────────────────────────────────────────────────
// refresh-music-snapshot.mjs
//
// One-step refresh of the on-disk Spotify snapshot used by /music.
// Run after releasing a new playlist (or unflipping one to public)
// to make the site reflect the change.
//
// What it does:
//   1. Detects any running `next dev` (Next.js 16's per-project
//      lock prevents two dev servers, regardless of port). If
//      found, kills it. The user has to manually restart their
//      regular dev after the script finishes — explicit prompt
//      printed at the end.
//   2. Spawns `npm run dev:online` (which sets SPOTIFY_OFFLINE
//      unset and binds to :3001) so /api/spotify/* hits Spotify
//      directly.
//   3. Waits up to 30s for the server to start serving.
//   4. Probes /api/spotify/health — if Spotify is rate-limiting
//      the `/me/playlists` bucket, reports the clear time and
//      exits without touching the snapshot. Repeat-attempting
//      during a cool-down extends the penalty box.
//   5. Calls /api/spotify/snapshot, which performs the actual
//      paginated playlist list + per-playlist track enrichment
//      and returns the JSON. Writes it to
//      lib/feeds/_fixtures/spotify-snapshot.json.
//   6. Diffs the new file vs the previous capture: playlist count,
//      added playlists, removed playlists, track-count changes.
//      Prints a summary so the human can decide whether to commit.
//   7. Tears down the dev:online process. Prints a reminder that
//      the user needs to restart their regular dev (`npm run dev`).
//
// Doesn't commit or push. The file change is left in the working
// tree for the user to review and commit. Standard repo flow:
//   git add lib/feeds/_fixtures/spotify-snapshot.json
//   git commit -m "Refresh music snapshot"
//   git push
//
// Vercel auto-deploys on push, so prod picks up the new snapshot
// in the next build (~1 min).
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SNAPSHOT_PATH = join(
  ROOT,
  "lib",
  "feeds",
  "_fixtures",
  "spotify-snapshot.json",
);
const PORT = 3001;
const BASE = `http://127.0.0.1:${PORT}`;
const STARTUP_TIMEOUT_MS = 90_000; // bumped from 30s — first next dev
                                    // after a node_modules wipe or
                                    // cold disk routinely needs 45-60s
                                    // before responding.
const HEALTH_TIMEOUT_MS = 15_000;  // bumped from 5s — the health
                                    // probe does two sequential
                                    // round-trips to Spotify; on a
                                    // slow link 5s is too tight.
const SNAPSHOT_TIMEOUT_MS = 60_000; // enough room for ~50 playlists
                                     // worth of paginated track fetches.

/** Quick "is dev:online already running?" probe. */
async function isPortLive() {
  try {
    const res = await fetch(`${BASE}/api/spotify/health`, {
      signal: AbortSignal.timeout(2_000),
    });
    return res.ok || res.status === 503; // 503 = rate-limited but server up
  } catch {
    return false;
  }
}

/**
 * Find PIDs of any running `next dev` for THIS project. Next.js 16
 * uses a per-project lock that blocks a second dev server even on a
 * different port, so we have to clear the lock before spawning
 * dev:online.
 */
function findExistingNextDevPids() {
  try {
    // macOS's pgrep doesn't reliably print command-lines with -a,
    // so use `ps -axo pid,command` and filter. The next dev process
    // shows up as `node /path/to/project/node_modules/.bin/next dev`
    // — match on the path-to-binary so we don't accidentally kill
    // a `next dev` for a different project.
    //
    // Two matchers:
    //   1. Literal path under ROOT/node_modules/.bin/next — covers
    //      the npm-flat install case.
    //   2. /next dev.*-p\s+3001/ as a fallback — catches symlinked
    //      or yarn-hoisted layouts where the literal path doesn't
    //      resolve under ROOT but the port flag still identifies
    //      the live-mode server we'd be replacing.
    const out = execSync("ps -axo pid,command", { encoding: "utf-8" });
    const needle = `${ROOT}/node_modules/.bin/next`;
    const portFallback = /next dev\b.*?-p\s+3001/;
    return out
      .split("\n")
      .filter(
        (line) =>
          (line.includes(needle) && line.includes("dev")) ||
          portFallback.test(line),
      )
      .map((line) => parseInt(line.trim().split(/\s+/)[0], 10))
      .filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

/** Send SIGTERM to a list of PIDs, fall back to SIGKILL after 2s. */
async function killPids(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
  await sleep(2_000);
  for (const pid of pids) {
    try {
      process.kill(pid, 0); // probe — throws if not alive
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
}

/**
 * Spawn `next dev -p 3001` directly (not through `npm run`), wait
 * for it to start serving, return the child so the caller can kill
 * it later.
 *
 * Spawning the binary directly — instead of going through the npm
 * wrapper — means our child IS the dev server (not npm, with `next`
 * as a grandchild). SIGTERM later will hit the right process; we
 * don't need to set detached:true and signal a process group. This
 * fixes the orphaned-next-dev bug from the 2026-04-28 follow-up
 * (h-refresh-snapshot-orphaned-dev).
 *
 * SPOTIFY_OFFLINE is intentionally NOT set in the spawned env, so
 * /api/spotify/* hits Spotify directly. The script's own env is
 * inherited; if the caller has SPOTIFY_OFFLINE set in their shell,
 * they need to unset it before running the script (rare).
 */
async function startDevOnline() {
  console.log(
    "→ Starting next dev on :3001 (live Spotify mode) ...",
  );
  const nextBin = `${ROOT}/node_modules/.bin/next`;
  // Inherit stdio:'pipe' so we can suppress noise but still surface
  // genuine errors. The server prints `Ready in Xms` on startup.
  const child = spawn(nextBin, ["dev", "-p", String(PORT)], {
    cwd: ROOT,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Stream into a buffer for diagnostic messages on failure.
  let logBuf = "";
  child.stdout?.on("data", (d) => {
    logBuf += d.toString();
  });
  child.stderr?.on("data", (d) => {
    logBuf += d.toString();
  });

  // Poll the server until it responds, with a hard timeout so we
  // don't hang forever if something's wrong. First poll waits
  // 1s — Turbopack often hasn't finished writing its manifest at
  // 500ms after spawn, which would 404 the probe and add noise.
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  await sleep(1_000);
  while (Date.now() < deadline) {
    if (await isPortLive()) {
      console.log("✓ next dev ready");
      return child;
    }
    await sleep(500);
  }

  // Timed out — kill the child and dump what it printed so the user
  // can see why it didn't come up.
  child.kill("SIGTERM");
  console.error(
    `✗ next dev didn't start within ${STARTUP_TIMEOUT_MS / 1000}s. Server output:`,
  );
  console.error(logBuf || "(no output)");
  throw new Error("next dev startup timeout");
}

/** Fetch with a hard timeout — fail fast rather than hang. */
async function fetchJson(url, timeoutMs) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} on ${url}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

/** Diff old vs new snapshot — print a human-readable summary. */
function diffSnapshots(oldData, newData) {
  const oldIds = new Set(Object.keys(oldData?.enrichedById ?? {}));
  const newIds = new Set(Object.keys(newData.enrichedById));

  const added = [...newIds].filter((id) => !oldIds.has(id));
  const removed = [...oldIds].filter((id) => !newIds.has(id));

  console.log();
  console.log("─── Snapshot diff ─────────────────────");
  console.log(
    `  Total playlists: ${newIds.size}` +
      (oldIds.size !== newIds.size ? ` (was ${oldIds.size})` : ""),
  );

  if (added.length > 0) {
    console.log(`  Added (${added.length}):`);
    for (const id of added) {
      console.log(`    + ${newData.enrichedById[id].name}`);
    }
  }
  if (removed.length > 0) {
    console.log(`  Removed (${removed.length}):`);
    for (const id of removed) {
      console.log(`    - ${oldData.enrichedById[id].name}`);
    }
  }

  // Track count changes — most useful signal that an existing
  // playlist got new songs added without renaming.
  const trackChanges = [];
  for (const id of newIds) {
    if (!oldIds.has(id)) continue;
    const oldCount = oldData.enrichedById[id].tracks?.length ?? 0;
    const newCount = newData.enrichedById[id].tracks.length;
    if (oldCount !== newCount) {
      trackChanges.push({
        name: newData.enrichedById[id].name,
        delta: newCount - oldCount,
        newCount,
      });
    }
  }
  if (trackChanges.length > 0) {
    console.log(`  Track count changed (${trackChanges.length}):`);
    for (const c of trackChanges) {
      const sign = c.delta > 0 ? "+" : "";
      console.log(`    ~ ${c.name}: ${sign}${c.delta} (now ${c.newCount})`);
    }
  }

  if (added.length === 0 && removed.length === 0 && trackChanges.length === 0) {
    console.log("  No structural changes detected.");
  }
  console.log("─────────────────────────────────────");
}

// ─── Main ────────────────────────────────────────────────────────

let weStartedDev = false;
let devChild = null;
let killedExistingDev = false;

try {
  // Reuse a dev:online that's already running on :3001 (rare but
  // possible — user might have kicked one off manually).
  const alreadyRunning = await isPortLive();
  if (alreadyRunning) {
    console.log("→ Reusing existing process on :3001");
  } else {
    // Next.js 16 uses a per-project lock — only ONE `next dev` can
    // run for this project, regardless of port. Clear any existing
    // dev (the offline one running on :3000 in normal workflow) so
    // dev:online can start.
    const existingPids = findExistingNextDevPids();
    if (existingPids.length > 0) {
      console.log(
        `→ Stopping existing next dev (PID ${existingPids.join(", ")}) ` +
          "to free Next.js's per-project lock ...",
      );
      await killPids(existingPids);
      killedExistingDev = true;
    }
    devChild = await startDevOnline();
    weStartedDev = true;
  }

  // Probe Spotify rate-limit status. The health route returns clear
  // times for both `/me` and `/me/playlists` buckets — bail early if
  // the playlist bucket is in cool-down so we don't try (and fail).
  console.log("→ Probing Spotify health ...");
  const health = await fetchJson(`${BASE}/api/spotify/health`, HEALTH_TIMEOUT_MS);
  const playlistsBucket = health.probes?.find((p) =>
    p.endpoint?.includes("/me/playlists"),
  );
  if (playlistsBucket && playlistsBucket.status === 429) {
    // Rate-limited — retryAfterSeconds and clearAt are both set
    // by the health route in this branch. Bail with exit code 2
    // so callers (or wrapping commands like /release-playlist)
    // can distinguish this from a generic failure.
    const wait = playlistsBucket.retryAfterSeconds;
    const clearAt = playlistsBucket.clearAt;
    const human =
      wait > 60 ? `${Math.ceil(wait / 60)} minutes` : `${wait} seconds`;
    console.error(
      `✗ Spotify is rate-limiting the /me/playlists bucket. ` +
        `Clears in ${human} (at ${clearAt}). Try again then.`,
    );
    process.exitCode = 2;
  } else if (playlistsBucket && !playlistsBucket.ok) {
    // Not rate-limited but still not healthy — surface the actual
    // status so the user can act on it (token expiry, 5xx, etc).
    // Earlier the script printed 'Clears in NaN minutes (at
    // undefined)' here because retryAfterSeconds doesn't exist
    // outside the 429 branch.
    console.error(
      `✗ Spotify /me/playlists probe failed with status ` +
        `${playlistsBucket.status ?? "unknown"}. Full health: ` +
        JSON.stringify(health, null, 2),
    );
    process.exitCode = 1;
  } else {
    console.log("✓ Spotify clear");

    // Capture the new snapshot. Read the old one first (if it
    // exists) so we can diff for the user.
    const oldData = existsSync(SNAPSHOT_PATH)
      ? JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"))
      : null;

    console.log("→ Capturing snapshot ...");
    const newData = await fetchJson(
      `${BASE}/api/spotify/snapshot`,
      SNAPSHOT_TIMEOUT_MS,
    );

    writeFileSync(SNAPSHOT_PATH, JSON.stringify(newData, null, 2) + "\n");
    console.log(`✓ Wrote ${SNAPSHOT_PATH}`);

    if (oldData) {
      diffSnapshots(oldData, newData);
    } else {
      console.log(
        `  First-time capture: ${Object.keys(newData.enrichedById).length} playlists`,
      );
    }

    console.log();
    console.log("Next: review the diff, then:");
    console.log("  git add lib/feeds/_fixtures/spotify-snapshot.json");
    console.log('  git commit -m "Refresh music snapshot"');
    console.log("  git push");
    console.log("Vercel will redeploy automatically (~1 min).");
  }
} catch (err) {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  if (weStartedDev && devChild) {
    console.log("→ Stopping dev:online ...");
    devChild.kill("SIGTERM");
    // Give it a moment to clean up; force-kill if needed.
    await sleep(2_000);
    if (!devChild.killed) devChild.kill("SIGKILL");
  }
  if (killedExistingDev) {
    console.log();
    console.log(
      "Note: your previously-running `next dev` was stopped to free the " +
        "Next.js project lock. Restart it now with `npm run dev`.",
    );
  }
}
