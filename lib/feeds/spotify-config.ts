// ─────────────────────────────────────────────────────────────────
// Spotify display configuration — editable curation layer.
//
// SPOTIFY_USER_ID below is the central source of truth for the
// Spotify account whose public playlists drive /music. Previously
// duplicated across three files; consolidated here per
// m-spotify-user-id-tripled from the 2026-04-29 /full-review.
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
//   • COLLECTIONS: named groupings shown in the /music Collections
//     view. Each collection has a display name and an ordered list
//     of playlist IDs (chronological / narrative within the series).
//     Playlists not in any collection are "standalones" — they only
//     appear in the All view, not Collections.
//   • APPLE_MUSIC_LINKS: per-playlist Apple Music outlinks; surface
//     "Also on Apple Music →" on the detail page when present.
// ─────────────────────────────────────────────────────────────────

/** The Spotify user whose public playlists drive /music. Override
 *  via SPOTIFY_USER_ID env var if needed (e.g. preview deploys
 *  pointing at a test account). */
export const SPOTIFY_USER_ID = process.env.SPOTIFY_USER_ID ?? "malcolmxevans";

export const MANUAL_ORDER: readonly string[] = [
  // Example — uncomment + replace with real IDs to pin:
  // "7hV8FJ0uMRUCWmGFctZSu9",  // My 2026 Gov Ball Playlist
];

/**
 * Symmetric to MANUAL_ORDER but for the bottom of the grid. Use when
 * the last-added-at proxy ranks a playlist higher than its true age
 * deserves — e.g. Malcolm tweaked an old playlist last week and now
 * it's masquerading as a recent release.
 *
 * Order within the array is preserved at the end of the grid (first
 * entry = first of the bottom-pinned, last entry = absolute end).
 */
export const MANUAL_BOTTOM_ORDER: readonly string[] = [
  "4OoqZqp9I5LBxs1kcWvbxZ", // return — actually the oldest playlist;
  //                          last_added_at_ms ranks it falsely high
  //                          because tracks were re-added later.
];

export const EXCLUDE_IDS: ReadonlySet<string> = new Set<string>([
  // Add playlist IDs to hide them from /music entirely.
  // Find IDs in the URL: open.spotify.com/playlist/<ID>?...
  "5fsW8MAh5XzOHI0W9Wml0R", // wig
  "5PI2tB1Sis3tPtKKNulddv", // daytime job; nighttime attitude
  "1faTg8HQjS2bVn0NjSs6ZD", // something something like a g6
]);

export const APPLE_MUSIC_LINKS: Readonly<Record<string, string>> = {
  // Ordered roughly newest-first to match the curation worksheet.
  // To add a mapping, paste the Apple Music share URL keyed by the
  // Spotify playlist ID (find IDs in playlist-curation.md).
  "73ul92F8QeL0r1X4T2hnLC": // settle the score
    "https://music.apple.com/us/playlist/settle-the-score/pl.u-e98lkXjileGDz",
  "5Ns160cnwk4uNjaRXOyna0": // !!!!
    "https://music.apple.com/us/playlist/pl.u-d2b0ky2skdrvM",
  "3m3hkV3BZHoFuTIpxsIGmL": // 100.4°
    "https://music.apple.com/us/playlist/100-4/pl.u-e98lkNmCleGDz",
  "4ynGp7fxXPrxuYe7lypbKK": // follow the sound
    "https://music.apple.com/us/playlist/follow-the-sound/pl.u-d2b0k4LCkdrvM",
  "6glJjWVMD5e91LDFubBPbP": // another vision
    "https://music.apple.com/us/playlist/another-vision/pl.u-11zBXNVhaj0Y8",
  "2lghBhUzxsbLLuiWsq2Z1T": // before and afters
    "https://music.apple.com/us/playlist/before-and-afters/pl.u-aZb0kW0u7zE0P",
  "127sqPv4ytVCzMRDbFps5r": // outrageous fortune
    "https://music.apple.com/us/playlist/outrageous-fortune/pl.u-JPAZE8GuzJxgD",
  "6kn8nVheRxnVSrdnKRUlYc": // truant disposition
    "https://music.apple.com/us/playlist/truant-disposition/pl.u-e98lkyECleGDz",
  "6ds9S4rzI0wGdttBVn3ayR": // open era
    "https://music.apple.com/us/playlist/open-era/pl.u-d2b0kKZskdrvM",
  "4WYplVjCWg4ZxTKgAlmNh8": // lowkey nsfw karaoke
    "https://music.apple.com/us/playlist/lowkey-nsfw-karaoke/pl.u-11zBXDbfaj0Y8",
  "5S4ZJxywkaJNnktoD7nFeb": // it's not clocking to you
    "https://music.apple.com/us/playlist/its-not-clocking-to-you/pl.u-aZb0kK4u7zE0P",
};

/**
 * Named collections for the /music Collections view. Two shapes:
 *
 *   1. Flat: { name, ids }
 *      The collection renders as one grid; e.g. WAR, convertible.
 *
 *   2. Volumed: { name, volumes: [{ label, ids }, ...] }
 *      The collection renders as one grouped section, with each
 *      volume getting its own sub-kicker + grid; e.g. the 🌬🤍 / 💔🥊
 *      series, where vol. 1 / vol. 2 / vol. 3 each pair a 🌬🤍 + 💔🥊
 *      release with a crossover Extended Pride Mix.
 *
 * Order within `ids` (or within each volume's `ids`) is the narrative
 * order — chronological / story-arc — not a re-sort of the page's
 * default last-edit-descending. Order within `volumes` is the same.
 *
 * Playlists not in any collection are "standalones" and appear only
 * in the All view, not in Collections.
 */
type FlatCollection = {
  name: string;
  ids: readonly string[];
};

type VolumedCollection = {
  name: string;
  volumes: ReadonlyArray<{
    label: string;
    ids: readonly string[];
  }>;
};

export type Collection = FlatCollection | VolumedCollection;

export const COLLECTIONS: ReadonlyArray<Collection> = [
  {
    name: "🌬🤍 / 💔🥊",
    // Three volumes. Each volume pairs a 🌬🤍 release with a 💔🥊
    // release, plus a crossover Extended Pride Mix that pulls from
    // both. Ordered chronologically within each volume.
    volumes: [
      {
        label: "vol. 1",
        ids: [
          "2Y0Djaue2kqFajUTw2khVc", // 🌬🤍
          "6vcft3DDVy9LJ4tgTkylN3", // 💔🥊
          "6bE7Ap6MqZkvLoSjsXTWqh", // 🌬🤍/ 💔🥊 [H Word Summer Extended Pride Mix]
        ],
      },
      {
        label: "vol. 2",
        ids: [
          "31IZozdT6irffGxYb7fhya", // 🌬🤍 vol. 2: ❤️‍🔥highonyou🍫
          "5pdYnjjLoiCBXERN9dbMsR", // 💔🥊 vol. 2: ❤️‍🩹comingdown🩹
          "1tjHsS2nfYaoR53w5sbQYB", // 🌬🤍/ 💔🥊 vol. 2: [Pride Never Ends Extended Mix]
        ],
      },
      {
        label: "vol. 3",
        ids: [
          "7gIvQRUycNb1E50EUvHONx", // 🌬🤍 vol. 3: daddy's home
          "1vYOnZBMrXNbzccWsRDPCr", // 💔🥊 vol. 3: cry, baby
          "01CRFeIy7YK7eZL9jwRmmF", // 🌬🤍/ 💔🥊 vol. 3: [baby daddy Extended Pride Mix]
        ],
      },
    ],
  },
  {
    name: "WAR",
    ids: [
      "3Cb7suWSWbpgW6xRTShtYF", // 01.CIVIL_
      "6pOwxeXR8ClGPoyXPUKm3u", // 02._ON_DRUGS
      "2I6fbmsS4ffu5dlqsIVidU", // 03._ON_TERROR
      "3aPtcxJqwhHxBG7O4zP2jl", // 04._ON_TRUTH
    ],
  },
  {
    name: "convertible",
    ids: [
      "5UbK2OZWkE2hIjoDx1RyFk", // moonroof
      "6lEGFrI77pHgOmnnGmO9Dj", // sunroof
      "4cGUTASO8620lL4gsf4PtT", // skylight
    ],
  },
];
