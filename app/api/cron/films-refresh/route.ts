// ─────────────────────────────────────────────────────────────────
// /api/cron/films-refresh — Vercel Cron entry point.
//
// Mirrors the role of .github/workflows/films-rss-refresh.yml,
// but driven by Vercel Cron instead of GitHub Actions cron. The
// move was prompted by GitHub Actions cron's measured ~41% miss
// rate on hourly schedules; the parallel TV migration to Vercel
// Cron has been observing 100% on-schedule firings for ~24h
// before this migration landed.
//
// Pipeline (read snapshot → diff → push, in-memory):
//   1. Bearer-auth check via CRON_SECRET (Vercel automatically
//      adds `Authorization: Bearer ${CRON_SECRET}` to cron
//      requests when the env var is set on the project).
//   2. Read the bundled prev snapshot from disk (bundled via
//      outputFileTracingIncludes in next.config.ts).
//   3. Run refreshSnapshotIncremental with writeToDisk: false.
//      The orchestrator fetches the Letterboxd RSS feed
//      (~50 entries), diffs against the injected prev snapshot,
//      enriches any new films via TMDB, and returns the new
//      in-memory snapshot.
//   4. If the orchestrator reports `changed: false`, return 200
//      with action: "no-op" — common case when RSS hasn't moved
//      since the last tick.
//   5. PUT the new snapshot to GitHub via the contents API. The
//      push triggers a Vercel deploy hook exactly like a manual
//      bootstrap+commit would, so /films picks up the new data
//      within ~1 minute of the cron tick.
//
// Unlike /television, /films has no "blocking-cleanup" abort path —
// the films enricher logs TMDB lookup failures but the orchestrator
// keeps the partial snapshot (the failed films stay in the snapshot
// without enrichment). This matches the films script's existing
// posture: partial enrichment is acceptable, a manual override in
// data/films/overrides.json closes the gap.
//
// Auto-commit chatter is intentional — Malcolm is rebuilding his
// public commit history during the building-in-public phase, so
// committing each refresh (vs. writing to Vercel Blob) is a feature.
//
// Schedule lives in vercel.json (cron at "0 * * * *", UTC). The
// :00 offset from television's :30 cron is the same race-guard
// posture both old GH Actions workflows used — keeps simultaneous
// pushes to main from competing for the same fast-forward window.
// ─────────────────────────────────────────────────────────────────

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

import { refreshSnapshotIncremental } from "@/scripts/incremental-rss-refresh.mjs";

// Cron must always re-run; never serve cached output.
export const dynamic = "force-dynamic";
// Films refresh is RSS-driven (~50-entry fetch, <30s wall in the
// common case even with TMDB enrichment of new films). Keep some
// headroom for TMDB rate-limit retries; well under Vercel's 300s
// default ceiling.
export const maxDuration = 90;

const SNAPSHOT_REPO_PATH = "lib/feeds/_fixtures/letterboxd-snapshot.json";
const SNAPSHOT_DISK_PATH = path.resolve(process.cwd(), SNAPSHOT_REPO_PATH);

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

  // ─── Read prev snapshot from the bundled deploy ─────────────────
  // outputFileTracingIncludes (next.config.ts) ensures the snapshot
  // is packaged with the function. If it's missing at runtime,
  // surface the error rather than silently falling back to an empty
  // snapshot that would erase the catalog.
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

  // ─── Refresh (in-memory) ────────────────────────────────────────
  let result: {
    snapshot: unknown;
    changed: boolean;
    baselineCount: number;
    baselineReviews: number;
    newFilms: Array<{ title?: string; releaseYear?: number }>;
    newReviews: unknown[];
    editedReviews: unknown[];
    backfillCount: number;
  };
  try {
    result = await refreshSnapshotIncremental({
      writeToDisk: false,
      prevSnapshot,
    });
  } catch (err) {
    // RSS-fetch failure or TMDB throttle blowup. Recoverable on the
    // next tick — return 502 so it shows up in Vercel error logs but
    // doesn't take down the route's health.
    return Response.json(
      {
        ok: false,
        stage: "refresh",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  if (!result.changed) {
    return Response.json({
      ok: true,
      stage: "refresh",
      action: "no-op",
      baseline: {
        films: result.baselineCount,
        reviews: result.baselineReviews,
      },
    });
  }

  // ─── Push to GitHub ─────────────────────────────────────────────
  let pushResult: { commitSha: string };
  try {
    pushResult = await pushSnapshotToGitHub(
      result.snapshot,
      {
        newFilms: result.newFilms.length,
        newReviews: result.newReviews.length,
        editedReviews: result.editedReviews.length,
        backfill: result.backfillCount,
      },
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
    delta: {
      newFilms: result.newFilms.length,
      newReviews: result.newReviews.length,
      editedReviews: result.editedReviews.length,
      backfillCount: result.backfillCount,
    },
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
  delta: {
    newFilms: number;
    newReviews: number;
    editedReviews: number;
    backfill: number;
  },
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

  // Pretty-printed JSON with trailing newline matches the CLI's
  // writeFileSync output exactly, so a manual run and a cron run
  // produce byte-identical files (clean diffs).
  const newContent = JSON.stringify(snapshot, null, 2) + "\n";

  // Compose a commit message that reflects what actually moved.
  // Mirrors the GH Actions message shape (single subject + a short
  // delta block) so the existing commit-history UI keeps reading
  // cleanly. ASCII-only — see the TV route's note on header bytes.
  const subject =
    delta.newReviews > 0
      ? `Auto-refresh /films snapshot from RSS`
      : delta.editedReviews > 0
        ? `Auto-refresh /films snapshot (review edit)`
        : `Auto-refresh /films snapshot (guid backfill)`;
  const deltaParts: string[] = [];
  if (delta.newFilms > 0) deltaParts.push(`${delta.newFilms} new film(s)`);
  if (delta.newReviews > 0)
    deltaParts.push(`${delta.newReviews} new review(s)`);
  if (delta.editedReviews > 0)
    deltaParts.push(`${delta.editedReviews} edit(s)`);
  if (delta.backfill > 0)
    deltaParts.push(`${delta.backfill} guid backfill(s)`);
  const message =
    `${subject}\n\n` +
    `Picked up ${deltaParts.join(", ") || "no-op"} from https://letterboxd.com/malxavi/rss/\n` +
    `via the Vercel cron at /api/cron/films-refresh.`;

  const putRes = await fetch(contentsUrl, {
    method: "PUT",
    headers: { ...githubHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(newContent, "utf-8").toString("base64"),
      sha: fileMeta.sha,
      branch: GITHUB_BRANCH,
      // Author = Malcolm's GitHub noreply alias, so these automated
      // refreshes credit his contribution graph (GitHub attributes the
      // graph by AUTHOR email, which must be one linked to his account).
      // Committer stays the bot to mark the commit as machine-made.
      author: {
        name: "Malcolm Xavier",
        email: "63060255+malcolmxavier@users.noreply.github.com",
      },
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
