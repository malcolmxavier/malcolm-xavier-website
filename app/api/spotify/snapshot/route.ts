// ─────────────────────────────────────────────────────────────────
// /api/spotify/snapshot — capture endpoint for offline mode.
//
// Hits the live Spotify API once and returns the same data shape
// that `lib/feeds/_fixtures/spotify-snapshot.json` is supposed to
// hold. The npm script `spotify:snapshot` curls this endpoint and
// writes the response to that file.
//
// Why an API route instead of a standalone Node script: this project
// doesn't have tsx / ts-node, and `lib/feeds/spotify.ts` imports
// "server-only" which works inside Next's routing context but is
// awkward to invoke from a bare node script. Using the dev server
// as the harness mirrors the pre-existing `/api/spotify/health`
// pattern — same npm-script + curl shape Malcolm already knows.
//
// Pre-flight: refuses to capture if any Spotify bucket is in the
// rate-limit penalty box. Capturing during a cool-down would just
// deepen the hole; the human running this should wait it out (use
// `npm run spotify:health` to see when it clears).
//
// Production guard: returns 404 in production. The snapshot is a
// dev/build-time tool, not a runtime resource. /robots.txt already
// disallows /api/* but the guard belt-and-suspenders that.
// ─────────────────────────────────────────────────────────────────

import "server-only";

import {
  getEnrichedPlaylist,
  getOwnedPlaylists,
  pingSpotifyHealth,
  type EnrichedPlaylist,
} from "@/lib/feeds/spotify";
import { EXCLUDE_IDS } from "@/lib/feeds/spotify-config";

// Always run at request time. Caching this would be nonsense — we
// always want a fresh capture.
export const dynamic = "force-dynamic";

// Same default as the music pages so the snapshot is captured under
// the same identity that /music renders for.
const SPOTIFY_USER_ID = process.env.SPOTIFY_USER_ID ?? "malcolmxevans";

export async function GET() {
  // Dev/build-time tool only; not a runtime endpoint.
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  // Don't let the snapshot eat its own tail. If SPOTIFY_OFFLINE is
  // set, the read functions short-circuit to the snapshot itself —
  // the capture would just re-write the file with its own contents
  // and silently report "Snapshot captured" while changing nothing.
  // Refuse and tell the operator how to fix it.
  if (
    process.env.SPOTIFY_OFFLINE === "1" ||
    process.env.SPOTIFY_OFFLINE === "true"
  ) {
    return Response.json(
      {
        error:
          "Cannot capture a snapshot while SPOTIFY_OFFLINE is set — " +
          "the read path would short-circuit to the existing snapshot " +
          "and you'd silently re-write it with its own contents. " +
          "Stop the dev:offline server and run `npm run dev` " +
          "(online mode) before running `npm run spotify:snapshot`.",
      },
      { status: 400 },
    );
  }

  // Pre-flight: bail if any bucket is in cool-down.
  const health = await pingSpotifyHealth();
  if (!health.ok) {
    return Response.json(
      {
        error:
          "Spotify is currently rate-limited. Refusing to capture " +
          "snapshot — capturing now would deepen the cool-down. " +
          "Wait until /api/spotify/health returns ok:true and retry.",
        health,
      },
      { status: 503 },
    );
  }

  // Capture: list all owned/public playlists, then enrich each. The
  // semaphore inside spotifyFetch caps in-flight requests at 3, so
  // even with Promise.all this stays under Spotify's burst threshold.
  const ownedPlaylists = await getOwnedPlaylists(
    SPOTIFY_USER_ID,
    EXCLUDE_IDS,
  );
  const enrichedEntries = await Promise.all(
    ownedPlaylists.map(
      async (p) => [p.id, await getEnrichedPlaylist(p)] as const,
    ),
  );
  const enrichedById: Record<string, EnrichedPlaylist> =
    Object.fromEntries(enrichedEntries);

  const snapshot = {
    capturedAt: new Date().toISOString(),
    ownedPlaylists,
    enrichedById,
  };

  // Pretty-print so the committed JSON diffs cleanly in git when the
  // snapshot is refreshed. Compact JSON would show the whole file as
  // changed on any edit.
  return new Response(JSON.stringify(snapshot, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
