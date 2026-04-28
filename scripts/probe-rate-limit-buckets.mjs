// ─────────────────────────────────────────────────────────────────
// probe-rate-limit-buckets.mjs
//
// One-shot empirical probe to verify whether Spotify's
// `/v1/playlists/{id}` and `/v1/playlists/{id}/items` endpoints
// share a rate-limit bucket — the assumption baked into our
// endpointFamily() heuristic in lib/feeds/spotify.ts.
//
// Method:
//   1. Mint an access token from the project's .env.local.
//   2. Fire sequential GET /v1/playlists/{TARGET_ID} requests
//      with a tight loop (no semaphore, no retry).
//   3. As soon as one returns 429, capture the retry-after
//      value and immediately fire ONE GET /v1/playlists/{TARGET_ID}
//      /tracks?limit=1 request.
//   4. Compare:
//        • if /tracks also returns 429 → same bucket
//          (endpointFamily heuristic correct)
//        • if /tracks returns 200       → separate buckets
//          (heuristic over-groups; cooldown tracking would fast-
//          fail /tracks unnecessarily during a /playlists/{id}
//          cooldown)
//
// Cost: this DELIBERATELY triggers a rate-limit. Retry-After is
// usually 30-60s for a single clean burst, but Spotify escalates
// on repeat offenses to multi-hour windows. Run this when the
// cooldown timing is convenient — late in the day so any
// escalation clears overnight.
//
// The /me/playlists bucket is unaffected (different family);
// /music continues to render via the snapshot fallback during
// the cooldown.
//
// Run:  node scripts/probe-rate-limit-buckets.mjs
// ─────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Public playlist Malcolm owns. The probe only does GETs — no
// state change, no risk to the playlist data. Picked from
// lib/feeds/spotify-config.ts MANUAL_ORDER.
const TARGET_ID = "4OoqZqp9I5LBxs1kcWvbxZ"; // "return"

const MAX_REQUESTS = 300; // safety cap to prevent runaway

// ─── Load env from .env.local ────────────────────────────────────

function loadEnv() {
  const envPath = join(ROOT, ".env.local");
  const raw = readFileSync(envPath, "utf-8");
  const out = {};
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [k, ...rest] = line.split("=");
    out[k.trim()] = rest.join("=").trim();
  }
  return out;
}

const env = loadEnv();

// ─── Mint access token ───────────────────────────────────────────

async function getAccessToken() {
  const auth = Buffer.from(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: env.SPOTIFY_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) {
    throw new Error(`token mint failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ─── Probe ───────────────────────────────────────────────────────

async function probeOnce(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    status: res.status,
    retryAfter: res.headers.get("retry-after"),
  };
}

// ─── Main ────────────────────────────────────────────────────────

const token = await getAccessToken();
console.log("→ access token minted");

const playlistUrl = `https://api.spotify.com/v1/playlists/${TARGET_ID}`;
const tracksUrl = `https://api.spotify.com/v1/playlists/${TARGET_ID}/tracks?limit=1`;

// Fire in parallel batches — sequential at ~3 req/s isn't enough
// to trip Spotify's per-app limit. Burst N concurrent and inspect
// the responses; stop the moment any one comes back 429.
const BATCH_SIZE = 50;
console.log(
  `→ firing GET ${playlistUrl} in parallel batches of ${BATCH_SIZE} ...`,
);
let count = 0;
let triggered = null;
const startTime = Date.now();
outer: for (
  let batchNum = 0;
  batchNum < Math.ceil(MAX_REQUESTS / BATCH_SIZE);
  batchNum++
) {
  const batch = await Promise.all(
    Array.from({ length: BATCH_SIZE }, () => probeOnce(playlistUrl, token)),
  );
  for (const r of batch) {
    count++;
    if (r.status === 429) {
      triggered = r;
      console.log(
        `→ 429 on request ${count} after ${Date.now() - startTime}ms ` +
          `(retry-after: ${r.retryAfter}s)`,
      );
      break outer;
    }
    if (r.status !== 200) {
      console.log(`→ unexpected ${r.status} on request ${count}; stopping`);
      break outer;
    }
  }
}

if (!triggered) {
  console.log(
    `→ no 429 after ${MAX_REQUESTS} requests in ${Date.now() - startTime}ms.`,
  );
  console.log(
    "  Either Spotify's per-endpoint limit is much higher than expected, " +
      "or we hit the user's overall app quota differently. Inconclusive.",
  );
  process.exit(2);
}

console.log(
  `→ probing GET ${tracksUrl} immediately to test bucket boundary ...`,
);
const tracksResult = await probeOnce(tracksUrl, token);
console.log(
  `→ /tracks status: ${tracksResult.status}` +
    (tracksResult.retryAfter ? ` (retry-after: ${tracksResult.retryAfter}s)` : ""),
);

console.log();
console.log("═══════════════════════════════════════");
console.log("RESULT");
console.log("═══════════════════════════════════════");
if (tracksResult.status === 429) {
  console.log(
    "✓ /playlists/{id} and /playlists/{id}/tracks share a rate-limit bucket.",
  );
  console.log(
    "  endpointFamily() heuristic is empirically correct for this pair.",
  );
} else if (tracksResult.status === 200) {
  console.log(
    "✗ /playlists/{id} cooldown did NOT propagate to /playlists/{id}/tracks.",
  );
  console.log(
    "  Buckets are SEPARATE. endpointFamily() over-groups; " +
      "consider keying on the full path (or a finer prefix) instead.",
  );
} else {
  console.log(
    `? /tracks returned ${tracksResult.status} — neither 429 nor 200.`,
  );
  console.log("  Inconclusive; investigate further.");
}
console.log();
console.log(`Cooldown will clear in ${triggered.retryAfter}s.`);
