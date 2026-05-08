// ─────────────────────────────────────────────────────────────────
// /api/cron/television-refresh — Vercel Cron entry point.
//
// Mirrors the role of .github/workflows/television-refresh.yml,
// but driven by Vercel Cron instead of GitHub Actions cron. The
// move was prompted by GitHub Actions cron's measured ~40-90%
// miss rate on hourly schedules; Vercel Cron fires reliably
// against the configured schedule (declared in vercel.json).
//
// Pipeline (probe-then-bootstrap, in-memory):
//   1. Bearer-auth check via CRON_SECRET (Vercel automatically
//      adds `Authorization: Bearer ${CRON_SECRET}` to cron
//      requests when the env var is set on the project).
//   2. Read the bundled prev snapshot + overrides from disk.
//      Same files /television reads at request time; bundled
//      with this route via outputFileTracingIncludes in
//      next.config.ts.
//   3. Probe Serializd diary page 1. If no new review ids,
//      return 200 with action: "no-op" — common case.
//   4. If new entries detected, run bootstrapSnapshot in-memory
//      with the prev snapshot injected (sticky-TMDB carryover
//      reuses cached enrichments — keeps each cron tick to ~15-30s
//      of wall time even on hit-weeks).
//   5. If the cleanup pass surfaces a blocking issue (e.g. a
//      TMDB lookup failed for a new show), abort without pushing
//      so the previous snapshot stays in place on prod.
//   6. PUT the new snapshot to GitHub via the contents API. The
//      push triggers a Vercel deploy hook exactly like a manual
//      bootstrap+commit would, so /television picks up the new
//      data within ~1 minute of the cron tick.
//
// The auto-commit chatter is intentional — Malcolm is rebuilding
// his public commit history during the building-in-public phase,
// so committing each refresh (vs. writing to Vercel Blob) is a
// feature, not a wart. See vercel-cron migration notes in memory.
//
// Schedule lives in vercel.json (cron at "30 * * * *", UTC).
// Films-rss-refresh stays on GitHub Actions for now; will follow
// the same migration pattern after this one bakes for ~24h.
// ─────────────────────────────────────────────────────────────────

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

import { bootstrapSnapshot } from "@/scripts/bootstrap-serializd-snapshot.mjs";
import {
  probeForNewReviews,
  logProbeFindings,
} from "@/scripts/refresh-serializd-incremental.mjs";

// Cron must always re-run; never serve cached output.
export const dynamic = "force-dynamic";
// Bootstrap typically wraps in 15-30s; pad for the rare TMDB
// throttle. Well under Vercel's 300s default ceiling.
export const maxDuration = 90;

const SNAPSHOT_REPO_PATH = "lib/feeds/_fixtures/serializd-snapshot.json";
const OVERRIDES_REPO_PATH = "data/television/overrides.json";
const SNAPSHOT_DISK_PATH = path.resolve(process.cwd(), SNAPSHOT_REPO_PATH);
const OVERRIDES_DISK_PATH = path.resolve(process.cwd(), OVERRIDES_REPO_PATH);

const GITHUB_OWNER = "malcolmxavier";
const GITHUB_REPO = "malcolm-xavier-website";
const GITHUB_BRANCH = "main";

/**
 * Vercel Cron sends GET. Auth is bearer-token via the CRON_SECRET
 * env var (Vercel handles the header injection automatically when
 * the env var is set on the project).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Surface configuration error loudly. Without CRON_SECRET set,
    // the route would reject all callers (good) but silently — a
    // missing env var means the cron is effectively disabled and
    // Malcolm should know.
    console.error("CRON_SECRET is not set on this deployment.");
    return new Response("CRON_SECRET not configured on deployment", {
      status: 500,
    });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const githubToken = process.env.GITHUB_REPO_TOKEN;
  if (!githubToken) {
    console.error("GITHUB_REPO_TOKEN is not set on this deployment.");
    return new Response(
      "GITHUB_REPO_TOKEN not configured (required to push the snapshot)",
      { status: 500 },
    );
  }

  // ─── Read prev snapshot + overrides from the bundled deploy ────
  // outputFileTracingIncludes (next.config.ts) ensures these are
  // packaged with the function. If either is missing at runtime,
  // surface the error rather than silently falling back to defaults
  // that would erase the project's editorial state.
  let prevSnapshot: unknown;
  try {
    prevSnapshot = JSON.parse(readFileSync(SNAPSHOT_DISK_PATH, "utf-8"));
  } catch (err) {
    return Response.json(
      {
        ok: false,
        stage: "load-snapshot",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  let overrides: unknown;
  try {
    overrides = JSON.parse(readFileSync(OVERRIDES_DISK_PATH, "utf-8"));
  } catch (err) {
    // Overrides absence is recoverable — the bootstrap defaults to
    // an empty overrides object and re-enriches everything via
    // TMDB. Still log so a misconfigured deploy is visible.
    console.warn(
      `Overrides file unreadable (${err instanceof Error ? err.message : String(err)}); continuing with empty overrides.`,
    );
    overrides = {
      tmdbId: {},
      posterPath: {},
      isMiniseries: {},
      watchedSeasons: {},
    };
  }

  // ─── Probe ──────────────────────────────────────────────────────
  let probe: { hasNew: boolean; probedCount: number; newReviews: unknown[] };
  try {
    probe = await probeForNewReviews(prevSnapshot);
  } catch (err) {
    // Serializd unreachable is recoverable on the next tick — return
    // 502 so it shows up in Vercel error logs but doesn't take down
    // the route's health.
    return Response.json(
      {
        ok: false,
        stage: "probe",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  if (probe.probedCount === 0) {
    return Response.json({
      ok: true,
      stage: "probe",
      action: "no-op",
      reason: "empty-probe",
    });
  }
  if (!probe.hasNew) {
    return Response.json({
      ok: true,
      stage: "probe",
      action: "no-op",
      probed: probe.probedCount,
    });
  }

  console.log(
    `Probe: ${probe.newReviews.length} new ${probe.newReviews.length === 1 ? "entry" : "entries"} on page 1.`,
  );
  logProbeFindings(probe.newReviews);

  // ─── Bootstrap (in-memory) ──────────────────────────────────────
  let bootstrapResult: { snapshot: unknown; hasBlockingIssues: boolean };
  try {
    bootstrapResult = await bootstrapSnapshot({
      writeToDisk: false,
      prevSnapshot,
      overrides,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        stage: "bootstrap",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  if (bootstrapResult.hasBlockingIssues) {
    // Blocking cleanup category caught something — likely a TMDB
    // lookup failure on a newly-discovered show. Don't push; let
    // Malcolm intervene via overrides.json + a manual bootstrap.
    return Response.json(
      {
        ok: false,
        stage: "bootstrap",
        action: "aborted",
        reason: "blocking-cleanup-category",
      },
      { status: 500 },
    );
  }

  // ─── Push to GitHub ─────────────────────────────────────────────
  let pushResult: { commitSha: string };
  try {
    pushResult = await pushSnapshotToGitHub(
      bootstrapResult.snapshot,
      probe.newReviews.length,
      githubToken,
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        stage: "push",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    stage: "push",
    action: "snapshot-updated",
    newReviewsOnProbe: probe.newReviews.length,
    githubCommitSha: pushResult.commitSha,
  });
}

/**
 * PUT the new snapshot to GitHub via the contents API. The push
 * lands as a real commit on `main`, which fires Vercel's auto-deploy
 * hook exactly like a manual `git push` would.
 *
 * Two API calls:
 *   1. GET /repos/{owner}/{repo}/contents/{path} — to read the
 *      current file SHA (required by the contents API to update
 *      an existing file; without it, the PUT is rejected).
 *   2. PUT /repos/{owner}/{repo}/contents/{path} — write the new
 *      content (base64-encoded) as a single commit.
 */
async function pushSnapshotToGitHub(
  snapshot: unknown,
  newReviewCount: number,
  token: string,
): Promise<{ commitSha: string }> {
  const githubHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const contentsUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${SNAPSHOT_REPO_PATH}`;
  const getRes = await fetch(`${contentsUrl}?ref=${GITHUB_BRANCH}`, {
    headers: githubHeaders,
  });
  if (!getRes.ok) {
    throw new Error(
      `GitHub contents GET failed: ${getRes.status} ${getRes.statusText}`,
    );
  }
  const fileMeta = (await getRes.json()) as { sha: string };

  // Pretty-printed JSON with trailing newline matches the
  // bootstrap CLI's writeFileSync output exactly, so a manual run
  // and a cron run produce byte-identical files (clean diffs).
  const newContent = JSON.stringify(snapshot, null, 2) + "\n";
  const message =
    `Auto-refresh /television snapshot from Serializd\n\n` +
    `Picked up ${newReviewCount} new ${newReviewCount === 1 ? "review" : "reviews"} from https://serializd.com/user/malxavi\n` +
    `via the Vercel cron at /api/cron/television-refresh.`;

  const putRes = await fetch(contentsUrl, {
    method: "PUT",
    headers: { ...githubHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(newContent, "utf-8").toString("base64"),
      sha: fileMeta.sha,
      branch: GITHUB_BRANCH,
      committer: {
        name: "vercel-cron[bot]",
        email: "vercel-cron@users.noreply.github.com",
      },
    }),
  });
  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(
      `GitHub contents PUT failed: ${putRes.status} ${putRes.statusText}: ${errText}`,
    );
  }
  const putJson = (await putRes.json()) as {
    commit?: { sha?: string };
  };
  return { commitSha: putJson.commit?.sha ?? "(unknown)" };
}
