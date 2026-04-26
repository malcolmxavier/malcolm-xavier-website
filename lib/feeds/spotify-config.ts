// ─────────────────────────────────────────────────────────────────
// Spotify display configuration — editable curation layer.
//
// Spotify doesn't expose a true "last modified" timestamp, so the
// /music grid sorts by the most-recent track added_at (proxy for
// last-edited). When that proxy is wrong for a specific playlist —
// e.g. Malcolm fixed a typo on a "released" playlist months later
// and doesn't want it bumping to the top — pin the playlist's ID
// here at the position where it should live.
//
// Behavior:
//   • MANUAL_ORDER: playlist IDs pinned at the top of the grid in
//     the order written here. Everything else slots beneath them
//     by the last-added-at proxy. Empty array = full auto.
//   • EXCLUDE_IDS: playlist IDs that should NEVER appear on /music
//     even if they're public. For auto-generated, third-party-app,
//     or legacy playlists Malcolm wants buried.
//   • APPLE_MUSIC_LINKS: per-playlist Apple Music outlinks; surface
//     "Also on Apple Music →" on the detail page when present.
// ─────────────────────────────────────────────────────────────────

export const MANUAL_ORDER: readonly string[] = [
  // Example — uncomment + replace with real IDs to pin:
  // "7hV8FJ0uMRUCWmGFctZSu9",  // My 2026 Gov Ball Playlist
];

export const EXCLUDE_IDS: ReadonlySet<string> = new Set<string>([
  // Add playlist IDs to hide them from /music entirely.
  // Find IDs in the URL: open.spotify.com/playlist/<ID>?...
]);

export const APPLE_MUSIC_LINKS: Readonly<Record<string, string>> = {
  // "<spotifyPlaylistId>": "https://music.apple.com/...",
};
