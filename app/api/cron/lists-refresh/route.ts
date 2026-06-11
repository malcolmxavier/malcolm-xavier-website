// ─────────────────────────────────────────────────────────────────
// /api/cron/lists-refresh — Vercel Cron entry point (weekly).
//
// The editorial-landing analog of films-refresh / television-refresh,
// but on a WEEKLY cadence: lists and favorites change rarely and are
// NOT in the RSS / diary feeds the hourly crons watch, so they get
// their own slow pass instead of riding the per-review refresh.
//
// This route touches BOTH clusters in one tick:
//   • Films — scrapes Letterboxd profile favourites + every list
//     (HTML; no API). scripts/refresh-films-lists.mjs.
//   • Television — Serializd favoriteshows + lists (JSON API).
//     scripts/refresh-tv-lists.mjs.
//
// Pipeline per surface (read snapshot → scrape → diff → push):
//   1. Read the bundled prev snapshot from disk (bundled via
//      outputFileTracingIncludes in next.config.ts).
//   2. Run the refresh with writeToDisk:false — the Vercel function
//      filesystem is read-only at request time, so the scrape returns
//      the merged snapshot in-memory and we commit it ourselves.
//   3. If the scrape reports changed:false (the common weekly case —
//      nothing moved), skip the commit.
//   4. PUT the new snapshot to GitHub via the contents API. Each push
//      is its own commit on main, firing Vercel's deploy hook exactly
//      like a manual bootstrap+commit would.
//
// The two surfaces run INDEPENDENTLY: a Letterboxd block doesn't stop
// the TV refresh and vice-versa. Each reports its own status in the
// response; the route only hard-fails on missing auth/config.
//
// Auth is bearer-token via CRON_SECRET (Vercel injects the header on
// cron requests). The GitHub push uses GITHUB_REPO_TOKEN, same as the
// other two cron routes. Auto-commit chatter is intentional — it's
// part of the building-in-public commit history.
//
// Schedule lives in vercel.json (weekly). Offset off the hourly crons
// so a weekly tick never competes with an hourly push for the same
// fast-forward window on main.
// ─────────────────────────────────────────────────────────────────

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

import { refreshFilmsLists } from "@/scripts/refresh-films-lists.mjs";
import { refreshTvLists } from "@/scripts/refresh-tv-lists.mjs";

// Cron must always re-run; never serve cached output.
export const dynamic = "force-dynamic";
// Films does ~16 paced HTML fetches (profile + index + lists +
// favourite film pages); TV adds the API calls + a few TMDB poster
// lookups. Both are paced at ~600ms. 120s leaves comfortable headroom
// under Vercel's 300s ceiling.
export const maxDuration = 120;

const GITHUB_OWNER = "malcolmxavier";
const GITHUB_REPO = "malcolm-xavier-website";
const GITHUB_BRANCH = "main";

const FILMS_REPO_PATH = "lib/feeds/_fixtures/letterboxd-snapshot.json";
const TV_REPO_PATH = "lib/feeds/_fixtures/serializd-snapshot.json";

type RefreshFn = (opts: {
  writeToDisk: boolean;
  prevSnapshot: unknown;
}) => Promise<{
  snapshot: unknown;
  changed: boolean;
  favoritesCount: number;
  listsCount: number;
}>;

type SurfaceResult = {
  ok: boolean;
  stage: "load-snapshot" | "refresh" | "push" | "done";
  action?: "no-op" | "snapshot-updated";
  error?: string;
  favorites?: number;
  lists?: number;
  githubCommitSha?: string;
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
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

  // Run both surfaces independently so one failing doesn't block the
  // other. Each returns a self-contained status object.
  const films = await runSurface({
    label: "films",
    repoPath: FILMS_REPO_PATH,
    refreshFn: refreshFilmsLists as RefreshFn,
    commitSubject: "Auto-refresh /films lists + favourites (weekly)",
    commitBody:
      "Scraped Letterboxd favourites + lists via the weekly Vercel cron at /api/cron/lists-refresh.",
    githubToken,
  });
  const tv = await runSurface({
    label: "television",
    repoPath: TV_REPO_PATH,
    refreshFn: refreshTvLists as RefreshFn,
    commitSubject: "Auto-refresh /television favourites (weekly)",
    commitBody:
      "Pulled Serializd favourites + lists via the weekly Vercel cron at /api/cron/lists-refresh.",
    githubToken,
  });

  // Overall ok unless a surface hit an unexpected error (a no-op or a
  // successful push are both "ok"). A block on one surface surfaces in
  // its own object and in the logs without failing the route.
  const ok = films.ok && tv.ok;
  return Response.json({ ok, films, tv }, { status: ok ? 200 : 207 });
}

/**
 * Read a surface's bundled snapshot, run its scrape in-memory, and
 * commit the result to GitHub when it changed. Never throws — every
 * failure mode is captured into the returned SurfaceResult so the
 * sibling surface still runs.
 */
async function runSurface({
  label,
  repoPath,
  refreshFn,
  commitSubject,
  commitBody,
  githubToken,
}: {
  label: string;
  repoPath: string;
  refreshFn: RefreshFn;
  commitSubject: string;
  commitBody: string;
  githubToken: string;
}): Promise<SurfaceResult> {
  const diskPath = path.resolve(process.cwd(), repoPath);

  let prevSnapshot: unknown;
  try {
    prevSnapshot = JSON.parse(readFileSync(diskPath, "utf-8"));
  } catch (err) {
    return {
      ok: false,
      stage: "load-snapshot",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let result: Awaited<ReturnType<RefreshFn>>;
  try {
    result = await refreshFn({ writeToDisk: false, prevSnapshot });
  } catch (err) {
    // A block / markup change / auth change throws here. Recoverable
    // next week — log and report, don't take down the route.
    console.error(`[lists-refresh:${label}] refresh failed:`, err);
    return {
      ok: false,
      stage: "refresh",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!result.changed) {
    return {
      ok: true,
      stage: "refresh",
      action: "no-op",
      favorites: result.favoritesCount,
      lists: result.listsCount,
    };
  }

  try {
    const { commitSha } = await pushSnapshotToGitHub(
      repoPath,
      result.snapshot,
      `${commitSubject}\n\n${commitBody}`,
      githubToken,
    );
    return {
      ok: true,
      stage: "push",
      action: "snapshot-updated",
      favorites: result.favoritesCount,
      lists: result.listsCount,
      githubCommitSha: commitSha,
    };
  } catch (err) {
    console.error(`[lists-refresh:${label}] push failed:`, err);
    return {
      ok: false,
      stage: "push",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * PUT a snapshot to GitHub via the contents API (read current SHA,
 * then write base64 content as one commit on main). Generalized from
 * the films-refresh route's helper to take the repo path + a prebuilt
 * commit message so both clusters share one implementation.
 */
async function pushSnapshotToGitHub(
  repoPath: string,
  snapshot: unknown,
  message: string,
  token: string,
): Promise<{ commitSha: string }> {
  const githubHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const contentsUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoPath}`;
  const getRes = await fetch(`${contentsUrl}?ref=${GITHUB_BRANCH}`, {
    headers: githubHeaders,
  });
  if (!getRes.ok) {
    throw new Error(
      `GitHub contents GET failed: ${getRes.status} ${getRes.statusText}`,
    );
  }
  const fileMeta = (await getRes.json()) as { sha: string };

  // Pretty-printed JSON + trailing newline matches the CLI's
  // writeFileSync output, so manual and cron runs produce byte-
  // identical files (clean diffs).
  const newContent = JSON.stringify(snapshot, null, 2) + "\n";

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
  const putJson = (await putRes.json()) as { commit?: { sha?: string } };
  return { commitSha: putJson.commit?.sha ?? "(unknown)" };
}
