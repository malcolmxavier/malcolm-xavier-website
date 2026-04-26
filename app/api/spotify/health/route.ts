// ─────────────────────────────────────────────────────────────────
// /api/spotify/health — penalty-box diagnostic.
//
// Hit this endpoint to check whether the Spotify API is currently
// rate-limiting our app. It probes two endpoints that `/music`
// actually depends on (Spotify rate-limits per endpoint family,
// not globally) and returns a per-probe result plus an aggregate.
//
//   { ok: true, probes: [...] }
//     → All probed buckets are clear. Safe to rebuild /music.
//
//   { ok: false, probes: [...],
//     worstRetryAfterSeconds, worstRetryAfterHuman,
//     worstClearAt, worstClearAtLocal }
//     → At least one bucket is in the penalty box. The "worst"
//       fields tell you the latest moment any bucket clears —
//       i.e. the earliest you should retry the whole flow.
//
//   { ok: false, stage: "auth", error }
//     → Couldn't even mint an access token (env, refresh token,
//       or network). Different failure mode entirely.
//
// This route is intentionally exposed in production too. It returns
// no secrets, and being able to diagnose "is the deployed app in
// the penalty box?" without redeploying is exactly the point.
// ─────────────────────────────────────────────────────────────────

import { pingSpotifyHealth } from "@/lib/feeds/spotify";

// Always run at request time. Caching this would defeat the entire
// purpose — we want a fresh probe every call.
export const dynamic = "force-dynamic";

export async function GET() {
  let health;
  try {
    health = await pingSpotifyHealth();
  } catch (e) {
    // Token mint failed (missing env, refresh token revoked, etc.)
    // Surface as a 500 so callers can distinguish "diagnostic broke"
    // from "Spotify said no".
    const message = e instanceof Error ? e.message : String(e);
    return Response.json(
      { ok: false, stage: "auth", error: message },
      { status: 500 },
    );
  }

  // Clear path — hand back the probes as-is.
  if (health.ok) {
    return Response.json(health);
  }

  // At least one probe is non-OK. If any 429s landed, dress up the
  // aggregate with human-friendly clear-time fields so a developer
  // can read the answer without doing arithmetic.
  if (health.worstRetryAfterSeconds > 0) {
    const worstClearAtIso = new Date(
      Date.now() + health.worstRetryAfterSeconds * 1000,
    ).toISOString();
    return Response.json({
      ...health,
      worstRetryAfterHuman: formatSeconds(health.worstRetryAfterSeconds),
      worstClearAt: worstClearAtIso,
      worstClearAtLocal: formatLocal(worstClearAtIso),
    });
  }

  // Non-429 failure on at least one probe — pass through unchanged
  // so the body / status fields are visible to the caller.
  return Response.json(health);
}

// ─── Formatting helpers ───────────────────────────────────────────

/**
 * Render a seconds count as a short, human-friendly duration:
 *   45     → "45s"
 *   180    → "3m"
 *   3700   → "1h 2m"
 *   77368  → "21h 30m"
 */
function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Format an ISO timestamp as a Pacific-time string (Malcolm is in
 * LA). Keeps the diagnostic readable without forcing the caller to
 * mentally convert UTC.
 */
function formatLocal(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
