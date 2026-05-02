// ─────────────────────────────────────────────────────────────────
// /api/letterboxd/snapshot — STUB
//
// Refresh-script capture endpoint. Mirror of /api/spotify/snapshot:
//   • Returns 404 in prod (NODE_ENV gate).
//   • Reads data/letterboxd-export/ + Letterboxd RSS, runs TMDB
//     enrichment (consulting data/films/overrides.json before
//     falling back to TMDB default search).
//   • Returns the new LetterboxdSnapshot JSON for the orchestrator
//     to write to disk.
//
// Real implementation lands with refresh-films-snapshot.mjs.
// ─────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function GET() {
  // Dev/build-time tool only; not a runtime endpoint.
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }
  return Response.json(
    {
      error:
        "/api/letterboxd/snapshot is not implemented yet. Lands with the films:refresh script work.",
    },
    { status: 501 },
  );
}
