// ─────────────────────────────────────────────────────────────────
// /api/letterboxd/health — STUB
//
// Mirror of /api/spotify/health. Real implementation probes:
//   • RSS reachability (HEAD https://letterboxd.com/<user>/rss/)
//   • TMDB reachability (HEAD https://api.themoviedb.org/3/...)
//   • Snapshot freshness (via getLetterboxdSnapshotMeta)
//
// Returns { ok, probes[], snapshot } shape so refresh-films-snapshot
// can bail before attempting a capture if any upstream is unhealthy.
// ─────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      ok: false,
      stage: "stub",
      error:
        "/api/letterboxd/health is not implemented yet. Lands with the films:refresh script work.",
    },
    { status: 501 },
  );
}
