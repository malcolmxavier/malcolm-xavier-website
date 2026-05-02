// ─────────────────────────────────────────────────────────────────
// /api/letterboxd/health — diagnostic for /films pre-refresh.
//
// Three probes:
//   • rss      — is letterboxd.com/<user>/rss/ reachable?
//   • tmdb     — is api.themoviedb.org reachable + API key valid?
//   • snapshot — does lib/feeds/_fixtures/letterboxd-snapshot.json
//                exist, parse, and have an age within freshness window?
//
// Aggregate `ok` is true iff:
//   - both live probes return 2xx
//   - snapshot exists, parses, and is younger than the staleness cap
//
// `npm run films:health` curls this endpoint and pipes through
// json.tool. Always returns 200 — the diagnostic itself never
// "fails", it just reports what it found. Caller distinguishes
// healthy vs unhealthy from the `ok` field.
//
// Mirrors /api/spotify/health, with one notable difference: there's
// no auth dance for Letterboxd (RSS is public, TMDB is API-key
// only), so there's no "stage:auth" failure mode. TMDB-key-missing
// surfaces as a probe-level error instead.
// ─────────────────────────────────────────────────────────────────

import {
  getLetterboxdSnapshotMeta,
  pingLetterboxdHealth,
} from "@/lib/feeds/letterboxd";

// Always run at request time. Caching this would defeat the entire
// purpose — we want a fresh probe every call.
export const dynamic = "force-dynamic";

// Snapshot freshness cap. Beyond this, the snapshot block reports
// stale: true and the aggregate `ok` flips to false. Picked at 90
// days because Malcolm's diary additions are roughly weekly — a
// quarter-year-old snapshot means dozens of films are missing from
// /films, not just a few. Tune in tandem with the refresh cadence.
const STALE_AFTER_DAYS = 90;

type SnapshotBlock =
  | {
      ok: true;
      capturedAt: string;
      ageDays: number;
      filmCount: number;
      reviewCount: number;
      stale: boolean;
    }
  | { ok: false; error: string };

function readSnapshotBlock(): SnapshotBlock {
  try {
    const meta = getLetterboxdSnapshotMeta();
    return {
      ok: true,
      ...meta,
      stale: meta.ageDays > STALE_AFTER_DAYS,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  // Snapshot read is independent of the live probe — capture it
  // first so even an upstream outage still returns the snapshot
  // freshness signal.
  const snapshot = readSnapshotBlock();
  const health = await pingLetterboxdHealth();

  // Aggregate health: live probes AND snapshot is healthy + fresh.
  const snapshotHealthy = snapshot.ok && !snapshot.stale;
  const ok = health.ok && snapshotHealthy;

  return Response.json({
    ok,
    probes: health.probes,
    snapshot,
  });
}
