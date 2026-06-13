// ─────────────────────────────────────────────────────────────────
// /api/cron/enrich-refresh — Vercel Cron entry point.
//
// The stats dashboards read lib/feeds/_fixtures/enrichment-snapshot.json
// (cast, writers, creators, studios, networks, MDBList critic scores,
// collections). The snapshot crons (films/television) add new titles to
// the *snapshots* daily, but those titles carry no enrichment until the
// manual `npm run enrich:refresh` ritual is run. This cron closes that
// gap: it reconciles the committed snapshots against the enrichment
// fixture and fills whatever is under-enriched — so a freshly logged
// film/show gets its cast/ratings within ~an hour, automatically.
//
// A DEDICATED reconcile cron (not piggybacked onto the two snapshot
// crons) on purpose: the enrichment fixture is a SINGLE file holding
// both films and shows, so two snapshot crons writing it would race and
// clobber each other (each bundles the fixture from the last deploy, not
// the last commit). One dedicated writer removes that race and leaves the
// proven snapshot-push path untouched.
//
// Pipeline (read → reconcile → enrich → commit, in-memory):
//   1. Bearer-auth via CRON_SECRET (Vercel injects the header).
//   2. Read the bundled snapshots + fixture from disk (bundled via
//      outputFileTracingIncludes in next.config.ts).
//   3. Find under-enriched titles via the same gates the CLI uses; cap
//      the work per tick so a backlog can't blow maxDuration or the
//      MDBList daily window. The remainder heals on later ticks.
//   4. If nothing is under-enriched, return 200 no-op BEFORE any network
//      call — the common case (no MDBList spend, no commit, no deploy).
//   5. If the API keys aren't set, skip gracefully (the snapshot data is
//      untouched; enrichment just doesn't run until the keys land).
//   6. Enrich in-memory via the shared enrichFixture core, then PUT the
//      fixture to GitHub via the contents API — a real commit on main,
//      same building-in-public posture as the snapshot crons.
//
// Schedule lives in vercel.json (cron at "45 * * * *", UTC). The :45
// offset keeps the enrichment commit clear of the :00 (films) and :30
// (television) snapshot-push windows.
// ─────────────────────────────────────────────────────────────────

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  enrichFixture,
  serializeFixture,
  mdbRemaining,
  filmNeedsMdb,
  filmNeedsCredits,
  filmNeedsRelease,
  showNeedsMdb,
  showNeedsCredits,
} from "@/scripts/enrich-refresh.mjs";

// Cron must always re-run; never serve cached output.
export const dynamic = "force-dynamic";
// Enriching a capped handful of titles is a few MDBList + TMDB calls each
// — well under Vercel's 300s ceiling. Pad for TMDB throttle retries.
export const maxDuration = 90;

// At most this many distinct titles per tick. Steady-state is ~1 new
// title/day, so this is a backlog guard (first run / missed ticks) that
// keeps each tick fast and inside the MDBList window; the rest heals on
// the next tick because the reconcile is stateless.
const PER_TICK_CAP = 8;

const FIXTURE_REPO_PATH = "lib/feeds/_fixtures/enrichment-snapshot.json";
const LB_DISK_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/letterboxd-snapshot.json",
);
const SZ_DISK_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/serializd-snapshot.json",
);
const FIXTURE_DISK_PATH = path.resolve(process.cwd(), FIXTURE_REPO_PATH);

const GITHUB_OWNER = "malcolmxavier";
const GITHUB_REPO = "malcolm-xavier-website";
const GITHUB_BRANCH = "main";

type Fixture = {
  films: Record<string, unknown>;
  shows: Record<string, unknown>;
  collectionDetails: Record<string, unknown>;
};
type TitledSnapshot = { tmdb?: { id: number } };

/** A stable string of just the data maps (no capturedAt), to detect real changes. */
function dataSignature(fixture: Fixture): string {
  return JSON.stringify([
    fixture.films,
    fixture.shows,
    fixture.collectionDetails,
  ]);
}

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

  // ─── Read bundled snapshots + fixture from disk ─────────────────
  // outputFileTracingIncludes (next.config.ts) packages these with the
  // function. A missing input means a misconfigured deploy — surface it
  // rather than silently enriching nothing.
  let lb: { films: TitledSnapshot[] };
  let sz: { shows: TitledSnapshot[] };
  let fixture: Fixture;
  try {
    lb = JSON.parse(readFileSync(LB_DISK_PATH, "utf-8"));
    sz = JSON.parse(readFileSync(SZ_DISK_PATH, "utf-8"));
    fixture = JSON.parse(readFileSync(FIXTURE_DISK_PATH, "utf-8"));
    fixture.films ||= {};
    fixture.shows ||= {};
    fixture.collectionDetails ||= {};
  } catch (err) {
    return Response.json(
      {
        ok: false,
        stage: "load",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  // ─── Reconcile: which titles are under-enriched? ────────────────
  const films = lb.films.filter((f) => f.tmdb);
  const shows = sz.shows.filter((s) => s.tmdb);
  const F = fixture.films;
  const S = fixture.shows;
  const needyFilms = films.filter(
    (f) =>
      filmNeedsMdb(F[f.tmdb!.id]) ||
      filmNeedsCredits(F[f.tmdb!.id]) ||
      filmNeedsRelease(F[f.tmdb!.id]),
  );
  const needyShows = shows.filter(
    (s) => showNeedsMdb(S[s.tmdb!.id]) || showNeedsCredits(S[s.tmdb!.id]),
  );
  const totalNeedy = needyFilms.length + needyShows.length;

  // Common case: nothing to do. Return before any network call.
  if (totalNeedy === 0) {
    return Response.json({ ok: true, stage: "reconcile", action: "no-op" });
  }

  // Cap the per-tick work (films first); the rest heals next tick.
  const capFilms = needyFilms.slice(0, PER_TICK_CAP);
  const capShows = needyShows.slice(0, Math.max(0, PER_TICK_CAP - capFilms.length));

  // ─── Keys: skip gracefully if unset (data stays untouched) ──────
  const MDB = process.env.MDBLIST_API_KEY;
  const TMDB = process.env.TMDB_API_KEY;
  if (!MDB || !TMDB) {
    console.warn(
      "MDBLIST_API_KEY / TMDB_API_KEY not set — skipping enrichment " +
        `(${totalNeedy} title(s) pending). Add them to the Vercel env to enable.`,
    );
    return Response.json({
      ok: true,
      stage: "keys",
      action: "skipped-no-keys",
      pending: { films: needyFilms.length, shows: needyShows.length },
    });
  }

  // ─── Enrich in-memory ───────────────────────────────────────────
  const before = dataSignature(fixture);
  let stats: Record<string, number>;
  try {
    const mdbRem = await mdbRemaining(MDB);
    const mdbBudget = Math.max(0, mdbRem - 8); // safety margin
    ({ stats } = await enrichFixture({
      films: capFilms,
      shows: capShows,
      fixture,
      mdbKey: MDB,
      tmdbKey: TMDB,
      mdbBudget,
      log: (m: string) => console.log(m),
    }));
  } catch (err) {
    // External-service blowup (MDBList/TMDB). The committed data is
    // untouched (we only push below, on success) — recoverable next tick.
    return Response.json(
      {
        ok: false,
        stage: "enrich",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  // Nothing actually filled (e.g. every lookup failed, or budget was 0
  // with only MDBList work pending) — don't author an empty commit.
  if (dataSignature(fixture) === before) {
    return Response.json({
      ok: true,
      stage: "enrich",
      action: "no-changes",
      pending: { films: needyFilms.length, shows: needyShows.length },
    });
  }

  // ─── Commit the fixture to GitHub ───────────────────────────────
  let pushResult: { commitSha: string };
  try {
    pushResult = await pushFixtureToGitHub(fixture, stats, process.env.GITHUB_REPO_TOKEN);
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
    action: "fixture-updated",
    enriched: stats,
    pending: {
      films: needyFilms.length - capFilms.length,
      shows: needyShows.length - capShows.length,
    },
    githubCommitSha: pushResult.commitSha,
  });
}

/**
 * PUT the enrichment fixture to GitHub via the contents API — a real
 * commit on `main`, which fires Vercel's auto-deploy hook so the stats
 * pages pick up the new enrichment within ~1 minute. Mirrors the snapshot
 * crons' push (GET current sha → PUT base64 content). ASCII-only message.
 */
async function pushFixtureToGitHub(
  fixture: Fixture,
  stats: Record<string, number>,
  token: string | undefined,
): Promise<{ commitSha: string }> {
  if (!token) {
    throw new Error("GITHUB_REPO_TOKEN not configured (required to push the fixture)");
  }
  const githubHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const contentsUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FIXTURE_REPO_PATH}`;
  const getRes = await fetch(`${contentsUrl}?ref=${GITHUB_BRANCH}`, {
    headers: githubHeaders,
  });
  if (!getRes.ok) {
    throw new Error(
      `GitHub contents GET failed: ${getRes.status} ${getRes.statusText}`,
    );
  }
  const fileMeta = (await getRes.json()) as { sha: string };

  // serializeFixture matches the CLI's byte format exactly, so a manual
  // run and a cron run produce identical files (clean diffs).
  const newContent = serializeFixture(fixture);

  // Compose an ASCII-only message reflecting what was filled.
  const parts: string[] = [];
  if (stats.filmsMdb) parts.push(`${stats.filmsMdb} film rating(s)`);
  if (stats.filmsCredits) parts.push(`${stats.filmsCredits} film credit(s)`);
  if (stats.showsMdb) parts.push(`${stats.showsMdb} show rating(s)`);
  if (stats.showsCredits) parts.push(`${stats.showsCredits} show credit(s)`);
  if (stats.collections) parts.push(`${stats.collections} collection(s)`);
  const message =
    `Auto-enrich stats fixture (MDBList + TMDB)\n\n` +
    `Filled ${parts.join(", ") || "metadata"} for newly logged titles\n` +
    `via the Vercel cron at /api/cron/enrich-refresh.`;

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
