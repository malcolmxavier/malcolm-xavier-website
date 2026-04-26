// ─────────────────────────────────────────────────────────────────
// Spotify display utilities — universal (server + client safe).
//
// Split out from lib/feeds/spotify.ts so client components can
// import types and pure formatting helpers without dragging in the
// server-only auth + fetch + snapshot-loading code (which depends on
// node:fs and explodes when bundled for the client).
//
// Anything in this file must be POURE and have no server-specific
// imports. Auth flow, network calls, token management, and snapshot
// loading all stay in spotify.ts.
// ─────────────────────────────────────────────────────────────────

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

export type SpotifyPlaylistItemsPage = {
  href: string;
  next: string | null;
  previous: string | null;
  limit: number;
  offset: number;
  total: number;
  items: SpotifyPlaylistEntry[];
};

export type EnrichedPlaylist = SpotifyPlaylistSummary & {
  /** All track entries (episodes filtered out). */
  tracks: { added_at: string; track: SpotifyTrack }[];
  /** Sum of every track's duration_ms. */
  total_duration_ms: number;
  /** Most-recent added_at across tracks; used as a "last edited" proxy. */
  last_added_at_ms: number;
};

// ─── Display helpers (pure functions) ─────────────────────────────

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
 * "&#x2F;" for "/", "&#x27;" for "'". Decode all numeric entities
 * generically (both hex and decimal forms) plus the named entities
 * we actually see, so descriptions render with proper punctuation.
 *
 * Earlier versions hard-coded individual entity strings (`&#39;`
 * but missing `&#x27;`) and missed the hex apostrophe form, leaving
 * raw "&#x27;" in playlist descriptions like "yesterday&#x27;s".
 */
export function decodeSpotifyDescription(input: string | null): string {
  if (!input) return "";
  return input
    // Named entities first — Spotify's most common encoded characters.
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Numeric entities (hex form: &#x27;, &#x2F;) — catches any
    // character Spotify might escape, not just the ones we predicted.
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    // Numeric entities (decimal form: &#39;, &#34;).
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCharCode(parseInt(dec, 10)),
    );
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
 * in `manualOrder` is pinned to that explicit position at the head
 * of the grid. Symmetrically, any ID in `manualBottom` is pinned
 * to that position at the END of the grid (used when the last-added
 * proxy ranks an old playlist falsely high). Everything else slots
 * in between by the proxy.
 */
export function sortPlaylistsForDisplay(
  playlists: EnrichedPlaylist[],
  manualOrder: readonly string[],
  manualBottom: readonly string[] = [],
): EnrichedPlaylist[] {
  const topPin = new Map(manualOrder.map((id, i) => [id, i]));
  const bottomPin = new Map(manualBottom.map((id, i) => [id, i]));
  const top: EnrichedPlaylist[] = [];
  const middle: EnrichedPlaylist[] = [];
  const bottom: EnrichedPlaylist[] = [];
  for (const p of playlists) {
    if (topPin.has(p.id)) top.push(p);
    else if (bottomPin.has(p.id)) bottom.push(p);
    else middle.push(p);
  }
  top.sort(
    (a, b) => (topPin.get(a.id) as number) - (topPin.get(b.id) as number),
  );
  bottom.sort(
    (a, b) =>
      (bottomPin.get(a.id) as number) - (bottomPin.get(b.id) as number),
  );
  middle.sort((a, b) => b.last_added_at_ms - a.last_added_at_ms);
  return [...top, ...middle, ...bottom];
}
