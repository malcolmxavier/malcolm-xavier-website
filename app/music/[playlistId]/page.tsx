// ─────────────────────────────────────────────────────────────────
// /music/[playlistId] — single-playlist detail page.
//
// Hero: large cover, name, description, meta line, action buttons
//       (Open on Spotify, optional Apple Music outlink).
// Body: full track list with album thumbs + durations.
//
// 404 if the playlist isn't owned by Malcolm — guards against
// someone constructing a URL to embed a third party's playlist.
// ─────────────────────────────────────────────────────────────────

import { Suspense, cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Lede } from "@/components/typography/Lede";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
import { Button } from "@/components/primitives/Button";
import { Link } from "@/components/primitives/Link";
import {
  getOwnedPlaylistById,
  formatDuration,
  formatTrackDuration,
  decodeSpotifyDescription,
  pickImage,
  type EnrichedPlaylist,
} from "@/lib/feeds/spotify";
import {
  APPLE_MUSIC_LINKS,
  SPOTIFY_USER_ID,
} from "@/lib/feeds/spotify-config";
import { BackToPlaylists } from "./BackToPlaylists";

export const revalidate = 3600;

// React.cache memoizes the call within a single render pass, so
// generateMetadata + the page component share one Spotify fetch
// rather than hitting the rate-limited /me/playlists bucket twice
// per ISR refresh. The cache scope is per request, so unrelated
// requests still fetch fresh data on each revalidation.
const getCachedPlaylist = cache(
  (userId: string, playlistId: string) =>
    getOwnedPlaylistById(userId, playlistId),
);

type Params = { playlistId: string };

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { playlistId } = await params;
  const playlist = await getCachedPlaylist(SPOTIFY_USER_ID, playlistId);
  // The root layout's title.template appends "—Malcolm Xavier"
  // automatically. The path /music/[id] already encodes the section,
  // so we don't append "—Music" here — that produced a triple-segment
  // title (`{name}—Music—Malcolm Xavier`) flagged in the 2026-04-29
  // /full-review (a-music-id-title-triple).
  if (!playlist) {
    return {
      title: "Playlist not found",
      alternates: { canonical: `/music/${playlistId}` },
    };
  }

  const description =
    decodeSpotifyDescription(playlist.description) ||
    `Public Spotify playlist by Malcolm Xavier—${playlist.tracks.length} tracks.`;
  // Per-playlist OG card uses the Spotify cover art. Without it,
  // every shared playlist URL unfurled as the sitewide Malcolm card
  // (2026-04-29 /full-review, a-per-page-og-twitter). Spotify covers
  // are typically square (640×640) — LinkedIn / Slack / iMessage
  // accept square images and crop sensibly. siteName separates "the
  // playlist name" headline from the "Malcolm Xavier" attribution
  // line in unfurls.
  const cover = pickImage(playlist.images, 640);
  const coverImage = cover
    ? [
        {
          url: cover.url,
          width: cover.width ?? 640,
          height: cover.height ?? 640,
          alt: `Cover art for the playlist ${playlist.name}`,
        },
      ]
    : undefined;

  return {
    // Use title.absolute to bypass the root layout's
    // `%s—Malcolm Xavier` template and emit the always-on
    // "<name>, a playlist by Malcolm Xavier" format. Even
    // descriptive Spotify names ("settle the score", "summer vibes")
    // tell Google nothing on their own — the suffix gives every
    // playlist a consistent, parseable SERP title shape regardless
    // of whether the name is editorial, emoji-only, or symbolic.
    // Closes l-playlist-emoji-titles from the 2026-04-29
    // /full-review (broader fix than the synthesis's "sanitize
    // emoji-only names" recommendation per user direction).
    title: { absolute: `${playlist.name}, a playlist by Malcolm Xavier` },
    description,
    alternates: { canonical: `/music/${playlistId}` },
    openGraph: {
      // og:title stays bare (the playlist name only) — siteName
      // separately provides the "Malcolm Xavier" attribution in
      // unfurl cards, so the suffix would just duplicate.
      title: playlist.name,
      description,
      // schema.org maps Spotify playlists to MusicPlaylist; OG's
      // "music.playlist" subtype is the closest equivalent and is
      // what Spotify itself uses for its own public playlist cards.
      type: "music.playlist",
      url: `/music/${playlistId}`,
      siteName: "Malcolm Xavier",
      locale: "en_US",
      images: coverImage,
    },
    twitter: {
      card: "summary_large_image",
      title: playlist.name,
      description,
      images: cover ? [cover.url] : undefined,
    },
  };
}

export default async function PlaylistDetailPage(
  { params }: { params: Promise<Params> },
) {
  const { playlistId } = await params;
  const playlist = await getCachedPlaylist(SPOTIFY_USER_ID, playlistId);
  if (!playlist) notFound();

  const cover = pickImage(playlist.images, 640);
  const description = decodeSpotifyDescription(playlist.description);
  const appleMusicHref = APPLE_MUSIC_LINKS[playlist.id];

  return (
    <div data-subbrand="music">
      <Container size="md">
        {/* ─── Back nav ──────────────────────────────────────────────
             Small "← All playlists" chip at the top so the user can
             return to the grid. Goes via router.back() when there's
             history, falling back to /music for direct entries.

             BackToPlaylists calls useSearchParams(), which forces the
             route to opt out of static rendering unless wrapped in a
             Suspense boundary. Without it, the page can bail to client-
             only rendering in production (caught in the 2026-04-29
             /full-review, c-suspense-search-params). */}
        <Section padding="md">
          <Suspense fallback={null}>
            <BackToPlaylists />
          </Suspense>
        </Section>

        {/* ─── Hero ──────────────────────────────────────────────── */}
        <Section padding="lg">
          {/* Cover left, copy right at md+. Stacks at small. */}
          <div className="md:grid md:grid-cols-[18rem_minmax(0,1fr)] md:gap-10">
            {/* Cover. Square aspect via aspectRatio + fill so the
                null-dimensioned auto-mosaic covers still render
                cleanly inside a known box. */}
            <div
              className="relative w-full overflow-hidden rounded-md"
              style={{
                aspectRatio: "1 / 1",
                background: "var(--surface-muted)",
              }}
            >
              {cover ? (
                <Image
                  src={cover.url}
                  alt={`Cover art for the playlist ${playlist.name}`}
                  fill
                  sizes="(min-width: 768px) 18rem, 90vw"
                  className="object-cover"
                  priority
                />
              ) : null}
            </div>

            {/* Copy column */}
            <div className="mt-6 md:mt-0">
              <Stack gap="400">
                <Stack gap="200">
                  <Kicker accent>Playlist</Kicker>
                  <Display>{playlist.name}</Display>
                </Stack>

                {description ? <Lede>{description}</Lede> : null}

                <Kicker>
                  {playlist.tracks.length} song
                  {playlist.tracks.length === 1 ? "" : "s"} ·{" "}
                  {formatDuration(playlist.total_duration_ms)}
                </Kicker>

                {/* Action buttons. Spotify is the source of truth;
                    Apple Music is a courtesy outlink for playlists
                    where Malcolm has authored a counterpart. */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    as="a"
                    href={playlist.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="primary"
                    size="md"
                  >
                    Open on Spotify ↗
                  </Button>
                  {appleMusicHref ? (
                    <Button
                      as="a"
                      href={appleMusicHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="secondary"
                      size="md"
                    >
                      Open on Apple Music ↗
                    </Button>
                  ) : null}
                </div>
              </Stack>
            </div>
          </div>
        </Section>

        {/* ─── Track list ─────────────────────────────────────── */}
        <Section padding="md" bordered>
          <Stack gap="500">
            <Stack gap="200">
              <Kicker>Tracks</Kicker>
              <Headline level={2}>The whole list.</Headline>
            </Stack>

            <ol
              // Numbered list in source order — the playlist's own order.
              // role="list" because Safari iOS strips the implicit role
              // when list-style: none is applied.
              role="list"
              className="space-y-3"
              style={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {playlist.tracks.map((entry, i) => (
                <TrackRow
                  key={`${entry.track.id}-${i}`}
                  position={i + 1}
                  track={entry.track}
                />
              ))}
            </ol>
          </Stack>
        </Section>

        {/* ─── Bottom rail ────────────────────────────────────── */}
        <Section padding="md" bordered>
          <Stack gap="300" align="start">
            <Body>
              <Link href="/music">More from the catalog →</Link>
            </Body>
          </Stack>
        </Section>
      </Container>
    </div>
  );
}

// ─── Track row ────────────────────────────────────────────────────

function TrackRow({
  position,
  track,
}: {
  position: number;
  track: EnrichedPlaylist["tracks"][number]["track"];
}) {
  const thumb = pickImage(track.album.images, 64);
  const artists = track.artists.map((a) => a.name).join(", ");

  return (
    <li className="flex items-center gap-4">
      {/* Position number — mono kicker styling, fixed width so
          rows align even when track counts hit triple digits. */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--p-xs-font-size)",
          color: "var(--text-caption)",
          width: "2.5rem",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {String(position).padStart(2, "0")}
      </span>

      {/* Album thumbnail */}
      <div
        className="relative shrink-0 overflow-hidden rounded-sm"
        style={{ width: 56, height: 56 }}
      >
        {thumb ? (
          <Image src={thumb.url} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: "var(--surface-muted)" }}
            aria-hidden
          />
        )}
      </div>

      {/* Track + artist + album */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{
            fontFamily: "var(--font-secondary)",
            fontSize: "var(--p-md-font-size)",
            lineHeight: "var(--p-md-line-height)",
            color: "var(--text-body)",
            fontWeight: 500,
          }}
        >
          {track.name}
        </p>
        <p
          className="truncate"
          style={{
            fontFamily: "var(--font-secondary)",
            fontSize: "var(--p-sm-font-size)",
            lineHeight: "var(--p-sm-line-height)",
            color: "var(--text-caption)",
          }}
        >
          {artists}
          <span className="hidden sm:inline">
            {" · "}
            {track.album.name}
          </span>
        </p>
      </div>

      {/* Duration */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--p-xs-font-size)",
          color: "var(--text-caption)",
          flexShrink: 0,
        }}
      >
        {formatTrackDuration(track.duration_ms)}
      </span>
    </li>
  );
}
