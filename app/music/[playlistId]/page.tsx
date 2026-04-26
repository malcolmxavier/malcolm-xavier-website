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
import { APPLE_MUSIC_LINKS } from "@/lib/feeds/spotify-config";
import { BackToPlaylists } from "./BackToPlaylists";

export const revalidate = 3600;

const SPOTIFY_USER_ID = process.env.SPOTIFY_USER_ID ?? "malcolmxevans";

type Params = { playlistId: string };

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { playlistId } = await params;
  const playlist = await getOwnedPlaylistById(SPOTIFY_USER_ID, playlistId);
  if (!playlist) {
    return { title: "Playlist not found — Malcolm Xavier" };
  }
  return {
    title: `${playlist.name} — Music — Malcolm Xavier`,
    description:
      decodeSpotifyDescription(playlist.description) ||
      `Public Spotify playlist by Malcolm Xavier — ${playlist.tracks.length} tracks.`,
  };
}

export default async function PlaylistDetailPage(
  { params }: { params: Promise<Params> },
) {
  const { playlistId } = await params;
  const playlist = await getOwnedPlaylistById(SPOTIFY_USER_ID, playlistId);
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
             history, falling back to /music for direct entries. */}
        <Section padding="md">
          <BackToPlaylists />
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
                  alt=""
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
              Want the rest? Browse{" "}
              <Link href="/music">all playlists →</Link>
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
