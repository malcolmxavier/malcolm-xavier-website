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

// ─── Types (matching Spotify's post-Nov-2024 response shapes) ─────

export type SpotifyImage = {
  url: string;
  height: number | null;
  width: number | null;
};

export type SpotifyArtistRef = {
  id: string;
  name: string;
  external_urls: { spotify: string };
};

export type SpotifyAlbumRef = {
  id: string;
  name: string;
  images: SpotifyImage[];
};

/**
 * A track on a playlist. Under Spotify's unified item model, the
 * playable thing on each playlist entry could in theory be a podcast
 * episode — we filter to type === "track" before treating it as one.
 */
export type SpotifyTrack = {
  id: string;
  name: string;
  type: "track";
  duration_ms: number;
  artists: SpotifyArtistRef[];
  album: SpotifyAlbumRef;
  external_urls: { spotify: string };
  preview_url: string | null;
};

export type SpotifyPlaylistEntry = {
  added_at: string;
  /** Renamed from `track` in the post-Nov-2024 reshape. */
  item: SpotifyTrack | { type: "episode"; [k: string]: unknown } | null;
};

/**
 * Shape returned by GET /v1/me/playlists items[i]. The "items" field
 * here is a *reference* — { href, total } pointing at the playlist's
 * /items sub-endpoint — not the actual track data.
 */
export type SpotifyPlaylistSummary = {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  external_urls: { spotify: string };
  public: boolean | null;
  collaborative: boolean;
  snapshot_id: string;
  owner: { id: string; display_name: string | null };
  /** Reference object, not the tracks themselves. Use total for count. */
  items: { href: string; total: number };
};

/**
 * Result of GET /v1/playlists/{id}/items, paginated.
 */
export type SpotifyPlaylistItemsPage = {
  href: string;
  next: string | null;
  previous: string | null;
  limit: number;
  offset: number;
  total: number;
  items: SpotifyPlaylistEntry[];
};

/**
 * What our app actually wants per playlist — a denormalized,
 * playable-only view assembled from the metadata + items endpoints.
 */
export type EnrichedPlaylist = SpotifyPlaylistSummary & {
  /** All track entries (episodes filtered out). */
  tracks: { added_at: string; track: SpotifyTrack }[];
  /** Sum of every track's duration_ms. */
  total_duration_ms: number;
  /** Most-recent added_at across tracks; used as a "last edited" proxy. */
  last_added_at_ms: number;
};

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

// ─── Read API ─────────────────────────────────────────────────────

/**
 * Fetch every playlist visible to the authenticated user — i.e. the
 * playlists they own AND the playlists they follow. Owner-filtering
 * happens in getOwnedPlaylists.
 */
async function getMyPlaylists(): Promise<SpotifyPlaylistSummary[]> {
  const all: SpotifyPlaylistSummary[] = [];
  let url: string | null = `${API_BASE}/me/playlists?limit=50`;
  while (url) {
    const r = await spotifyFetch(url);
    const page = (await r.json()) as {
      items: SpotifyPlaylistSummary[];
      next: string | null;
    };
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
    const page = (await r.json()) as SpotifyPlaylistItemsPage;
    for (const entry of page.items) {
      // is_local is on the entry, not the item. When true, item.id
      // is null and album metadata is absent — skip entirely.
      if ((entry as { is_local?: boolean }).is_local) continue;
      const item = entry.item as SpotifyTrack | null;
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
  return (await r.json()) as SpotifyPlaylistSummary;
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
 * Fetch wrapper that adds the Authorization header, throttles
 * concurrent requests via a tiny semaphore, and retries on 429
 * honoring Spotify's Retry-After header.
 */
async function spotifyFetch(url: string): Promise<Response> {
  return withSemaphore(async () => {
    for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
      const token = await getAccessToken();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        // Defer caching to Next.js at the call-site.
        cache: "no-store",
      });
      if (res.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
        // Spotify returns Retry-After in seconds. Cap the wait so
        // a multi-minute cool-down doesn't hang the request forever
        // — we'd rather surface the error and let ISR serve stale.
        const retryAfter = Number(res.headers.get("retry-after") ?? "1");
        const waitMs = Math.min(Math.max(retryAfter, 1), 30) * 1000;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
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

// ─── Display helpers ──────────────────────────────────────────────

/**
 * Format a millisecond duration as "1 hr 12 min" or "47 min" — the
 * shape Spotify uses in its own UI for playlist totals.
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

/**
 * Format a single track's duration as "3:42" — the shape Spotify uses
 * inline next to track names.
 */
export function formatTrackDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Spotify returns descriptions with HTML entities escaped — e.g.
 * "&#x2F;" for "/". Decode the small set we actually see; full
 * entity decoding isn't worth a dependency for our needs.
 */
export function decodeSpotifyDescription(input: string | null): string {
  if (!input) return "";
  return input
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Pick the smallest image whose width is at least `minWidth`. Used
 * for choosing playlist covers and album thumbnails — Spotify
 * returns multiple sizes (640 / 300 / 64) and we don't need to
 * download the 640 for a 56px album thumb.
 *
 * Auto-mosaic playlist covers come back with null dimensions; in
 * that case we always return the (only) image so it can render at
 * an explicitly-sized container.
 */
export function pickImage(
  images: SpotifyImage[] | undefined,
  minWidth: number,
): SpotifyImage | null {
  if (!images || images.length === 0) return null;
  // If any image has a null width (auto-mosaic), just take the first.
  if (images.some((i) => i.width == null)) return images[0];
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  for (const img of sorted) {
    if ((img.width ?? 0) >= minWidth) return img;
  }
  return images[0];
}

/**
 * Sort an array of enriched playlists by the most-recent added_at
 * timestamp descending — proxy for "last edited" since Spotify
 * doesn't expose a true last-modified field.
 *
 * Apply MANUAL_ORDER pins on top of this: any playlist ID present
 * in MANUAL_ORDER is pinned to that explicit position at the head
 * of the grid; everything else slots in by the proxy.
 */
export function sortPlaylistsForDisplay(
  playlists: EnrichedPlaylist[],
  manualOrder: readonly string[],
): EnrichedPlaylist[] {
  const pinIndex = new Map(manualOrder.map((id, i) => [id, i]));
  const pinned: EnrichedPlaylist[] = [];
  const rest: EnrichedPlaylist[] = [];
  for (const p of playlists) {
    if (pinIndex.has(p.id)) pinned.push(p);
    else rest.push(p);
  }
  pinned.sort(
    (a, b) =>
      (pinIndex.get(a.id) as number) - (pinIndex.get(b.id) as number),
  );
  rest.sort((a, b) => b.last_added_at_ms - a.last_added_at_ms);
  return [...pinned, ...rest];
}

// ─── Internal ─────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
