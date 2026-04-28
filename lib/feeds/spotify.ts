// ─────────────────────────────────────────────────────────────────
// Spotify Web API client.
//
// Auth model: Authorization Code flow with refresh-token persistence.
// Why: Spotify deprecated Client Credentials access to user/playlist
// endpoints for apps registered after Nov 2024. The catalog-only
// flow no longer reaches /v1/users/{id}/playlists or even most
// /v1/playlists/{id}/tracks reads. Authorization Code with a
// stored refresh token is the only path that works for new apps.
//
// API surface (post-Nov-2024 reshape):
//   - List the authorized user's playlists:  GET /v1/me/playlists
//     (the /users/{id}/playlists endpoint returns 403 even with
//      user-OAuth — fully deprecated for new apps)
//   - Single-playlist metadata only:         GET /v1/playlists/{id}
//     (returns name/description/images/owner; no tracks at all)
//   - Playlist track entries (paginated):    GET /v1/playlists/{id}/items
//     (renamed from /tracks; each entry's track is under `item`,
//      not `track`, because playlists now hold tracks OR episodes)
//
// One-time human step (dev only, see /api/spotify/authorize):
//   1. Malcolm visits /api/spotify/authorize in a browser.
//   2. Spotify shows the consent screen; Malcolm clicks "Agree".
//   3. Spotify redirects to /api/spotify/callback with a code.
//   4. The callback exchanges the code for { access_token, refresh_token }
//      and prints the refresh_token to the page for Malcolm to copy
//      into .env.local as SPOTIFY_REFRESH_TOKEN.
//
// Runtime model:
//   - Server-side only. Never expose the client secret or refresh
//     token to the browser.
//   - Module-scoped cache holds the current access token + its expiry.
//     Access tokens live ~1 hour; we refresh proactively when within
//     the safety window.
//   - All read calls go through getAccessToken() so callers don't
//     have to think about expiry.
// ─────────────────────────────────────────────────────────────────

import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// Re-export universal types + display helpers from spotify-utils so
// existing call sites (`import { formatDuration } from "@/lib/feeds/spotify"`)
// keep working. Client components should import from spotify-utils
// directly to avoid pulling this server-only file into their bundle.
export {
  decodeSpotifyDescription,
  formatDuration,
  formatTrackDuration,
  pickImage,
  sortPlaylistsForDisplay,
} from "./spotify-utils";
export type {
  EnrichedPlaylist,
  SpotifyAlbumRef,
  SpotifyArtistRef,
  SpotifyImage,
  SpotifyPlaylistEntry,
  SpotifyPlaylistItemsPage,
  SpotifyPlaylistSummary,
  SpotifyTrack,
} from "./spotify-utils";

import type {
  EnrichedPlaylist,
  SpotifyPlaylistSummary,
  SpotifyPlaylistItemsPage,
  SpotifyTrack,
} from "./spotify-utils";

// ─── Response schemas (zod) ─────────────────────────────────────
// We validate Spotify responses at the network boundary rather than
// asserting types via `as` casts. Spotify reshaped these fields in
// Nov 2024 (track → item, items.tracks → items.total) — a schema
// catches that class of change with a clear error pointing at the
// renamed field instead of a silent runtime null. Schemas are
// permissive on extra fields (zod default) so additive changes
// upstream don't break the build.

const SpotifyImageSchema = z.object({
  url: z.string(),
  height: z.number().nullable(),
  width: z.number().nullable(),
});

const SpotifyArtistRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  external_urls: z.object({ spotify: z.string() }),
});

const SpotifyAlbumRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  images: z.array(SpotifyImageSchema),
});

const SpotifyTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal("track"),
  duration_ms: z.number(),
  artists: z.array(SpotifyArtistRefSchema),
  album: SpotifyAlbumRefSchema,
  external_urls: z.object({ spotify: z.string() }),
  preview_url: z.string().nullable(),
});

// Each playlist entry's `item` is either a track, an episode (which
// we filter out), or null (rare, but Spotify returns null for
// removed tracks the playlist still references).
const SpotifyPlaylistEntrySchema = z.object({
  added_at: z.string(),
  is_local: z.boolean().optional(),
  item: z.union([
    SpotifyTrackSchema,
    z.object({ type: z.literal("episode") }).passthrough(),
    z.null(),
  ]),
});

const SpotifyPlaylistSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  images: z.array(SpotifyImageSchema),
  external_urls: z.object({ spotify: z.string() }),
  public: z.boolean().nullable(),
  collaborative: z.boolean(),
  snapshot_id: z.string(),
  owner: z.object({
    id: z.string(),
    display_name: z.string().nullable(),
  }),
  // Reference object — holds the count, not the tracks themselves.
  items: z.object({ href: z.string(), total: z.number() }),
});

const SpotifyPlaylistItemsPageSchema = z.object({
  href: z.string(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
  items: z.array(SpotifyPlaylistEntrySchema),
});

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const API_BASE = "https://api.spotify.com/v1";

// Must match the Redirect URI registered in the Spotify dashboard.
// Per Spotify's recent policy change, http://localhost is rejected;
// the loopback IP form is allowed.
const REDIRECT_URI = "http://127.0.0.1:3001/api/spotify/callback";

// Scopes requested at consent time. playlist-read-private is required
// to enumerate the user's playlists, even the public ones — Spotify
// gates the listing endpoint behind this scope.
const SCOPES = ["playlist-read-private"];

// Refresh proactively when the access token has less than this many
// seconds of life left. Avoids races where a request starts with a
// nearly-expired token and 401s mid-flight.
const REFRESH_BUFFER_SECONDS = 60;

type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
  // refresh_token is only returned on the initial code-exchange;
  // subsequent refreshes may or may not return a new one.
  refresh_token?: string;
};

// ─── Authorization-flow helpers (one-time, dev-only) ──────────────

/**
 * Build the URL Malcolm visits once to grant the app permission.
 * After he accepts the consent screen, Spotify redirects to
 * /api/spotify/callback with a one-time `code` query param.
 */
export function getAuthorizationUrl(): string {
  const clientId = requireEnv("SPOTIFY_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    // show_dialog forces the consent screen even if the user already
    // authorized previously — useful when changing scopes.
    show_dialog: "true",
  });
  return `${AUTHORIZE_URL}?${params}`;
}

/**
 * Exchange the one-time authorization code (from the callback) for
 * an access_token + refresh_token pair. The refresh_token is the
 * long-lived secret we save to .env.local; the access_token from
 * this exchange is discarded (we'll mint fresh ones via refresh).
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<TokenResponse> {
  const id = requireEnv("SPOTIFY_CLIENT_ID");
  const secret = requireEnv("SPOTIFY_CLIENT_SECRET");
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Spotify token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

// ─── Runtime token management ─────────────────────────────────────

// Module-scoped cache. Survives within a single Node process; on
// Vercel each function instance has its own cache, which is fine —
// the small extra refresh overhead is bounded by the access-token
// expiry (~1 hour).
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a valid access token. Refreshes from the long-lived refresh
 * token when expired or near expiry. All API calls go through here.
 */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (
    cachedAccessToken &&
    cachedAccessToken.expiresAt - REFRESH_BUFFER_SECONDS > now
  ) {
    return cachedAccessToken.token;
  }

  const refreshToken = requireEnv("SPOTIFY_REFRESH_TOKEN");
  const id = requireEnv("SPOTIFY_CLIENT_ID");
  const secret = requireEnv("SPOTIFY_CLIENT_SECRET");
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Spotify token refresh failed: ${res.status} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as TokenResponse;
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in,
  };
  return data.access_token;
}

// ─── Offline mode (snapshot-backed) ───────────────────────────────
//
// When SPOTIFY_OFFLINE=1 (or "true"), the three exported read entry
// points (getOwnedPlaylists, getEnrichedPlaylist, getOwnedPlaylistById)
// short-circuit to read from a pre-captured JSON snapshot instead of
// hitting Spotify. This protects against re-triggering the rate-limit
// penalty box during dev iteration and during production builds.
//
// The snapshot is captured manually via `npm run spotify:snapshot`,
// which curls /api/spotify/snapshot and writes the response to
// lib/feeds/_fixtures/spotify-snapshot.json. The file is committed
// to git so Vercel builds can read it without hitting Spotify.
//
// Refresh cadence is human-driven: when Malcolm adds/edits playlists
// and wants the change to show up online, he re-runs the snapshot
// script and commits the updated file.

const SNAPSHOT_PATH = join(
  process.cwd(),
  "lib",
  "feeds",
  "_fixtures",
  "spotify-snapshot.json",
);

type SpotifySnapshot = {
  capturedAt: string;
  ownedPlaylists: SpotifyPlaylistSummary[];
  enrichedById: Record<string, EnrichedPlaylist>;
};

// Module-scoped cache. Loaded lazily on first offline-mode call;
// re-used across every subsequent call within the same Node process.
let cachedSnapshot: SpotifySnapshot | null = null;

function isOfflineMode(): boolean {
  const v = process.env.SPOTIFY_OFFLINE;
  return v === "1" || v === "true";
}

function loadSnapshot(): SpotifySnapshot {
  if (cachedSnapshot) return cachedSnapshot;
  let raw: string;
  try {
    raw = readFileSync(SNAPSHOT_PATH, "utf-8");
  } catch {
    // Fail loud rather than silently falling through to a live API
    // call. The whole point of offline mode is to never hit Spotify.
    // Silent fallback would hide misconfigurations and defeat the
    // protection.
    throw new Error(
      `SPOTIFY_OFFLINE is set but no snapshot exists at ${SNAPSHOT_PATH}. ` +
        `Capture one with \`npm run spotify:snapshot\` (requires the dev ` +
        `server running and Spotify out of cool-down).`,
    );
  }
  cachedSnapshot = JSON.parse(raw) as SpotifySnapshot;
  return cachedSnapshot;
}

// ─── Read API ─────────────────────────────────────────────────────

/**
 * Fetch every playlist visible to the authenticated user — i.e. the
 * playlists they own AND the playlists they follow. Owner-filtering
 * happens in getOwnedPlaylists.
 */
async function getMyPlaylists(): Promise<SpotifyPlaylistSummary[]> {
  const all: SpotifyPlaylistSummary[] = [];
  // Schema for the listing endpoint — separate from the per-
  // playlist-items page schema. We only validate the fields we
  // consume; Spotify's full /me/playlists response carries more.
  const ListingPageSchema = z.object({
    items: z.array(SpotifyPlaylistSummarySchema),
    next: z.string().nullable(),
  });

  let url: string | null = `${API_BASE}/me/playlists?limit=50`;
  while (url) {
    const r = await spotifyFetch(url);
    const page = ListingPageSchema.parse(await r.json());
    all.push(...page.items);
    url = page.next;
  }
  return all;
}

/**
 * Filter the authenticated user's playlist listing down to what
 * /music should actually surface:
 *
 *   1. owned by `ownerId` (excludes playlists the user merely follows)
 *   2. public === true (excludes private playlists)
 *   3. id not in `excludeIds` (manual opt-out for auto-generated /
 *      legacy / third-party-integration playlists)
 *
 * The /v1/users/{id}/playlists endpoint that historically mapped 1:1
 * to "what's on my Spotify profile" was deprecated in Nov 2024 for
 * new apps. The public-flag filter is the closest viable proxy;
 * collaborative playlists set to public will pass (intentional —
 * keeps the door open to surfacing collab work later).
 */
export async function getOwnedPlaylists(
  ownerId: string,
  excludeIds: ReadonlySet<string> = new Set(),
): Promise<SpotifyPlaylistSummary[]> {
  // Offline mode: the snapshot was captured by this same function
  // with the same ownerId/excludeIds, so its contents are already
  // filtered. Don't re-filter here — if those args change, the right
  // fix is to refresh the snapshot, not to filter the snapshot at
  // read-time.
  if (isOfflineMode()) {
    return loadSnapshot().ownedPlaylists;
  }
  const all = await getMyPlaylists();
  return all.filter(
    (p) =>
      p.owner?.id === ownerId &&
      p.public === true &&
      !excludeIds.has(p.id),
  );
}

/**
 * Fetch every track entry on a playlist. Pages through /items
 * (50 per page max) until exhaustion. Filters out:
 *   • episode entries (this is /music, not /podcast)
 *   • local-file entries (mp3s the user uploaded — they have
 *     null IDs, no album metadata, and aren't playable for
 *     visitors anyway, so they don't belong in the public listing)
 */
export async function getPlaylistTracks(
  playlistId: string,
): Promise<{ added_at: string; track: SpotifyTrack }[]> {
  const result: { added_at: string; track: SpotifyTrack }[] = [];
  let url: string | null =
    `${API_BASE}/playlists/${playlistId}/items?limit=50`;
  while (url) {
    const r = await spotifyFetch(url);
    const page = SpotifyPlaylistItemsPageSchema.parse(await r.json());
    for (const entry of page.items) {
      // is_local is on the entry, not the item. When true, item is
      // an mp3 the user uploaded — skip entirely (no playable URL
      // for visitors, missing album metadata).
      if (entry.is_local) continue;
      const item = entry.item;
      // After zod-parse, `item.type === "track"` narrows to the
      // SpotifyTrack shape — no cast needed. Episodes and null
      // entries fall through.
      if (!item || item.type !== "track" || !item.id) continue;
      result.push({ added_at: entry.added_at, track: item });
    }
    url = page.next;
  }
  return result;
}

/**
 * Fetch a single playlist's metadata directly by ID. Used by the
 * /music/[id] detail page where we don't need to enumerate the
 * entire library to find one playlist.
 */
async function getPlaylistMetadata(
  playlistId: string,
): Promise<SpotifyPlaylistSummary> {
  const r = await spotifyFetch(`${API_BASE}/playlists/${playlistId}`);
  return SpotifyPlaylistSummarySchema.parse(await r.json());
}

/**
 * Fetch a single playlist by ID, but only if it's owned by the given
 * user. Returns null if the playlist isn't owned (used for the 404
 * branch on the detail page so we don't render someone else's
 * playlist via a guessed URL).
 */
export async function getOwnedPlaylistById(
  ownerId: string,
  playlistId: string,
): Promise<EnrichedPlaylist | null> {
  // Offline mode: pull straight from the snapshot keyed by id, then
  // re-check owner so guessed-URL access (someone visiting a playlist
  // ID that isn't ours) still 404s identically to live mode.
  if (isOfflineMode()) {
    const enriched = loadSnapshot().enrichedById[playlistId];
    if (!enriched) return null;
    if (enriched.owner?.id !== ownerId) return null;
    return enriched;
  }
  let meta: SpotifyPlaylistSummary;
  try {
    meta = await getPlaylistMetadata(playlistId);
  } catch {
    return null;
  }
  if (meta.owner?.id !== ownerId) return null;
  return getEnrichedPlaylist(meta);
}

/**
 * Combine playlist metadata + all track entries into a single
 * EnrichedPlaylist with computed totals and the "last edited" proxy.
 *
 * Convenience wrapper for the common case; for the grid we typically
 * call getOwnedPlaylists once + this for each owned playlist in
 * parallel, then sort.
 */
export async function getEnrichedPlaylist(
  summary: SpotifyPlaylistSummary,
): Promise<EnrichedPlaylist> {
  // Offline mode: serve the pre-enriched copy keyed by id. Throw
  // (rather than fall through) when the playlist is missing from the
  // snapshot so misconfigurations surface loudly instead of silently
  // hitting Spotify.
  if (isOfflineMode()) {
    const enriched = loadSnapshot().enrichedById[summary.id];
    if (!enriched) {
      throw new Error(
        `SPOTIFY_OFFLINE is set but playlist ${summary.id} ` +
          `(${summary.name}) is missing from the snapshot. ` +
          `Refresh with \`npm run spotify:snapshot\`.`,
      );
    }
    return enriched;
  }
  const tracks = await getPlaylistTracks(summary.id);
  let total = 0;
  let lastAdded = 0;
  for (const { added_at, track } of tracks) {
    total += track.duration_ms;
    const t = Date.parse(added_at);
    if (!Number.isNaN(t) && t > lastAdded) lastAdded = t;
  }
  return {
    ...summary,
    tracks,
    total_duration_ms: total,
    last_added_at_ms: lastAdded,
  };
}

/**
 * Maximum concurrent in-flight requests to Spotify's API. The /music
 * grid fetches /items for every owned playlist; bursting all of them
 * in parallel via Promise.all gets the app rate-limited (429s after
 * ~50 simultaneous requests, plus a multi-minute cool-down for
 * repeat offenses). 3 trades a few seconds of build time for
 * robust headroom under Spotify's per-app cap.
 */
const MAX_CONCURRENT_REQUESTS = 3;

/** Number of times to retry after a 429 before giving up. */
const RATE_LIMIT_MAX_RETRIES = 4;

/**
 * Threshold (seconds) above which we treat the Retry-After header
 * as "this is a multi-minute / multi-hour cool-down, give up now".
 * For short bursts (a few seconds) it's worth sleeping and retrying;
 * for anything longer the user is better served by an immediate
 * fallback than a tab that spins for two minutes before failing.
 */
const RATE_LIMIT_FAST_FAIL_SECONDS = 60;

/**
 * Fetch wrapper that adds the Authorization header, throttles
 * concurrent requests via a tiny semaphore, and retries on 429
 * honoring Spotify's Retry-After header.
 *
 * Two distinct 429 paths:
 *   1. Short Retry-After (≤ FAST_FAIL_SECONDS): sleep up to 30s and
 *      retry, up to RATE_LIMIT_MAX_RETRIES times. Right call for a
 *      brief burst limit.
 *   2. Long Retry-After (> FAST_FAIL_SECONDS): throw immediately
 *      without sleeping. Spotify's clock isn't moved by us continuing
 *      to wait, and a multi-hour cool-down should fall through to
 *      whatever fallback the call-site has (e.g. SpotifyUnavailable
 *      on /music) in <1s, not after 4 × 30s = 2 min of dead time.
 */
async function spotifyFetch(url: string): Promise<Response> {
  return withSemaphore(async () => {
    // Mint the access token once outside the retry loop. The token
    // refresh is its own failure mode (network glitch, refresh-token
    // expiry) — keeping it outside means a 429 retry cycle won't mask
    // the original 429 with a downstream auth error. Only re-mint on
    // a 401 inside the loop, which is the actual signal that the
    // cached token expired mid-flight.
    let token = await getAccessToken();
    for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        // Defer caching to Next.js at the call-site.
        cache: "no-store",
      });
      // Token expired between mint and request — re-mint and retry
      // this attempt without consuming a 429 retry slot.
      if (res.status === 401 && attempt < RATE_LIMIT_MAX_RETRIES) {
        token = await getAccessToken();
        continue;
      }
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") ?? "1");

        // Fast-fail on long cool-downs — sleeping doesn't move
        // Spotify's clock, and the call-site's fallback can render
        // immediately instead of after minutes of dead retries.
        if (retryAfter > RATE_LIMIT_FAST_FAIL_SECONDS) {
          throw new Error(
            `Spotify API: rate-limited with Retry-After=${retryAfter}s ` +
              `on ${url} — exceeds fast-fail threshold ` +
              `(${RATE_LIMIT_FAST_FAIL_SECONDS}s), failing now so ` +
              `the call-site fallback can render.`,
          );
        }

        // Short cool-down — sleep and retry. Cap at 30s per attempt
        // so even an unexpectedly long short-burst Retry-After
        // doesn't hang the request.
        if (attempt < RATE_LIMIT_MAX_RETRIES) {
          const waitMs = Math.min(Math.max(retryAfter, 1), 30) * 1000;
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }
      if (!res.ok) {
        throw new Error(
          `Spotify API ${res.status} on ${url}: ${await res.text()}`,
        );
      }
      return res;
    }
    throw new Error(`Spotify API: 429 retries exhausted on ${url}`);
  });
}

// Tiny FIFO semaphore — waiters resolve in order, in-flight count
// is bounded by MAX_CONCURRENT_REQUESTS. Reset per Node process.
let inFlight = 0;
const queue: Array<() => void> = [];

async function withSemaphore<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    const next = queue.shift();
    if (next) next();
  }
}

// ─── Health / penalty-box diagnostic ──────────────────────────────

/**
 * Per-endpoint result for a single probe of the Spotify API.
 *
 * Spotify rate-limits per endpoint family, not globally — `/v1/me`
 * can be clear while `/v1/me/playlists` is in cool-down (or vice
 * versa). So we probe each bucket independently and report each
 * result; the aggregate `ok` is true only when every probe is clear.
 *
 * Discriminated union on `status`:
 *   - 200 → clear
 *   - 429 → penalty box; carries authoritative Retry-After + clearAt
 *   - other → unexpected error; body is included for inspection
 */
export type SpotifyProbeResult =
  | { endpoint: string; ok: true; status: 200 }
  | {
      endpoint: string;
      ok: false;
      status: 429;
      retryAfterSeconds: number;
      clearAt: string; // ISO 8601, UTC
    }
  | { endpoint: string; ok: false; status: number; body: string };

/**
 * Aggregated health: per-endpoint probes plus a top-level `ok` and
 * the longest Retry-After across all 429s (so the caller has a
 * single "wait at least this long" answer when multiple buckets
 * are limited).
 */
export type SpotifyHealth = {
  ok: boolean;
  probes: SpotifyProbeResult[];
  worstRetryAfterSeconds: number;
};

/**
 * Probe a single Spotify endpoint with a fresh, uncached request and
 * surface the raw status + Retry-After. Bypasses our usual
 * `spotifyFetch` wrapper on purpose — that wrapper retries-and-sleeps
 * internally and caps the wait at 30s, which would mask the true
 * Retry-After value we want to read here.
 */
async function probeSpotifyEndpoint(
  pathWithQuery: string,
): Promise<SpotifyProbeResult> {
  const token = await getAccessToken();
  const url = `${API_BASE}${pathWithQuery}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.ok) {
    return { endpoint: pathWithQuery, ok: true, status: 200 };
  }

  if (res.status === 429) {
    // Spotify's Retry-After header is in seconds. Default to 0 if
    // somehow missing so the JSON is still well-formed.
    const retryAfterSeconds = Number(res.headers.get("retry-after") ?? "0");
    const clearAt = new Date(
      Date.now() + retryAfterSeconds * 1000,
    ).toISOString();
    return {
      endpoint: pathWithQuery,
      ok: false,
      status: 429,
      retryAfterSeconds,
      clearAt,
    };
  }

  // Trim any other error body so JSON responses stay sane.
  const body = (await res.text()).slice(0, 1000);
  return { endpoint: pathWithQuery, ok: false, status: res.status, body };
}

/**
 * Detect whether we're in Spotify's rate-limit penalty box across
 * the endpoints `/music` actually depends on.
 *
 * Probes (in order):
 *   - `/me` — the user-profile bucket. Cheap; baseline auth check.
 *   - `/me/playlists?limit=1` — the bucket `/music` hits hardest;
 *     the page paginates this to enumerate every owned playlist.
 *
 * The token-refresh endpoint (`accounts.spotify.com/api/token`) is
 * a separate rate-limit bucket from the API endpoints — we can mint
 * an access token even when the API itself is in cool-down, which
 * is exactly what makes this diagnostic useful.
 *
 * The two probes run sequentially to keep the diagnostic honest:
 * if we paralleled them and both 429ed, we'd still only see one
 * worth of usage in the bucket counters. Sequential = realistic.
 */
export async function pingSpotifyHealth(): Promise<SpotifyHealth> {
  const probes: SpotifyProbeResult[] = [];
  probes.push(await probeSpotifyEndpoint("/me"));
  probes.push(await probeSpotifyEndpoint("/me/playlists?limit=1"));

  // Aggregate: the worst-case wait across all 429s. Anything not 429
  // contributes 0, so a clear bucket doesn't pull the max down.
  const worstRetryAfterSeconds = probes.reduce((max, p) => {
    if (!p.ok && p.status === 429 && "retryAfterSeconds" in p) {
      return Math.max(max, p.retryAfterSeconds);
    }
    return max;
  }, 0);

  return {
    ok: probes.every((p) => p.ok),
    probes,
    worstRetryAfterSeconds,
  };
}

// ─── Internal ─────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
