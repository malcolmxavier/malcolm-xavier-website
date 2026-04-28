// ─────────────────────────────────────────────────────────────────
// Tests for pickMosaicCovers — the helper that composes our 2x2
// auto-mosaic from a playlist's first 4 unique album covers when
// Spotify's listing endpoint returns no cover image.
//
// Flagged in the 2026-04-28 follow-up audit's
// cv-test-coverage-on-new-paths.
// ─────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { pickMosaicCovers } from "./PlaylistCard";
import type { EnrichedPlaylist } from "@/lib/feeds/spotify-utils";

// Build a synthetic playlist with N tracks, one per album, where
// each album has exactly one image. Used as the easy baseline.
function makePlaylist(albums: { id: string; name: string; imageUrl: string | null }[]): EnrichedPlaylist {
  return {
    id: "test-playlist",
    name: "Test Playlist",
    description: "",
    images: [],
    external_urls: { spotify: "" },
    public: true,
    collaborative: false,
    snapshot_id: "snap",
    owner: { id: "owner", display_name: "owner" },
    tracks: albums.map((a, i) => ({
      added_at: new Date(2026, 0, i + 1).toISOString(),
      is_local: false,
      track: {
        id: `t${i}`,
        name: `Track ${i}`,
        type: "track" as const,
        duration_ms: 180_000,
        artists: [],
        album: {
          id: a.id,
          name: a.name,
          images: a.imageUrl
            ? [{ url: a.imageUrl, height: 300, width: 300 }]
            : [],
        },
        external_urls: { spotify: "" },
      },
    })),
    total_duration_ms: 0,
    last_added_at_ms: 0,
  } as unknown as EnrichedPlaylist;
}

describe("pickMosaicCovers", () => {
  it("returns empty array when the playlist has no tracks", () => {
    const playlist = makePlaylist([]);
    expect(pickMosaicCovers(playlist)).toEqual([]);
  });

  it("picks the first 4 distinct album covers in track order", () => {
    const playlist = makePlaylist([
      { id: "alb1", name: "Album One", imageUrl: "https://x/1.jpg" },
      { id: "alb2", name: "Album Two", imageUrl: "https://x/2.jpg" },
      { id: "alb3", name: "Album Three", imageUrl: "https://x/3.jpg" },
      { id: "alb4", name: "Album Four", imageUrl: "https://x/4.jpg" },
      { id: "alb5", name: "Album Five", imageUrl: "https://x/5.jpg" },
    ]);
    const out = pickMosaicCovers(playlist);
    expect(out).toHaveLength(4);
    expect(out.map((c) => c.albumName)).toEqual([
      "Album One",
      "Album Two",
      "Album Three",
      "Album Four",
    ]);
  });

  it("dedupes by album.id — repeats don't count toward the 4 cap", () => {
    const playlist = makePlaylist([
      { id: "alb1", name: "Album One", imageUrl: "https://x/1.jpg" },
      { id: "alb1", name: "Album One", imageUrl: "https://x/1.jpg" },
      { id: "alb1", name: "Album One", imageUrl: "https://x/1.jpg" },
      { id: "alb2", name: "Album Two", imageUrl: "https://x/2.jpg" },
      { id: "alb3", name: "Album Three", imageUrl: "https://x/3.jpg" },
    ]);
    const out = pickMosaicCovers(playlist);
    expect(out).toHaveLength(3);
    expect(out.map((c) => c.albumName)).toEqual([
      "Album One",
      "Album Two",
      "Album Three",
    ]);
  });

  it("skips tracks whose album has no usable image", () => {
    const playlist = makePlaylist([
      { id: "alb1", name: "Album One", imageUrl: null },
      { id: "alb2", name: "Album Two", imageUrl: "https://x/2.jpg" },
      { id: "alb3", name: "Album Three", imageUrl: null },
      { id: "alb4", name: "Album Four", imageUrl: "https://x/4.jpg" },
    ]);
    const out = pickMosaicCovers(playlist);
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.albumName)).toEqual([
      "Album Two",
      "Album Four",
    ]);
  });

  it("returns fewer than 4 when the playlist has fewer than 4 unique albums", () => {
    const playlist = makePlaylist([
      { id: "alb1", name: "Album One", imageUrl: "https://x/1.jpg" },
      { id: "alb2", name: "Album Two", imageUrl: "https://x/2.jpg" },
    ]);
    const out = pickMosaicCovers(playlist);
    expect(out).toHaveLength(2);
  });

  it("stops at 4 even when the playlist has many more unique albums", () => {
    const playlist = makePlaylist(
      Array.from({ length: 10 }, (_, i) => ({
        id: `alb${i}`,
        name: `Album ${i}`,
        imageUrl: `https://x/${i}.jpg`,
      })),
    );
    expect(pickMosaicCovers(playlist)).toHaveLength(4);
  });
});
