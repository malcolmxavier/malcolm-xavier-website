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
import NextLink from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ShareBar } from "@/components/share/ShareBar";
import { twitterAttribution } from "@/lib/site-config";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Lede } from "@/components/typography/Lede";
import { Kicker } from "@/components/typography/Kicker";
import { Button } from "@/components/primitives/Button";
import {
  getMusicData,
  formatDuration,
  formatTrackDuration,
  decodeSpotifyDescription,
  pickImage,
  type EnrichedPlaylist,
} from "@/lib/feeds/spotify";
import {
  APPLE_MUSIC_LINKS,
  EXCLUDE_IDS,
  MANUAL_BOTTOM_ORDER,
  MANUAL_ORDER,
  SPOTIFY_USER_ID,
} from "@/lib/feeds/spotify-config";
import { BackToPlaylists } from "./BackToPlaylists";

export const revalidate = 3600;

// React.cache memoizes the call within a single render pass so
// generateMetadata + the page component share one Spotify fetch
// rather than hitting the rate-limited /me/playlists bucket twice
// per ISR refresh. Switched from getOwnedPlaylistById (single
// playlist) to getMusicData (full sorted list) because the detail
// page now renders adjacent-playlist navigation, which needs the
// list to compute newer/older siblings — same pattern as
// /films/[slug] and /television/[showSlug]. The full list is
// already what /music renders, so the snapshot is warm.
//
// Cost note: in prod (SPOTIFY_OFFLINE=1) this reads the snapshot
// — fast. In dev:online, getMusicData fetches all owned playlists
// + one enriched-track call per playlist (batched at 3
// concurrent). At ~30 playlists, ISR cold-start would noticeably
// slow. Currently ~25 playlists. If the catalog grows past ~30,
// revisit and split into a single-playlist fetch + a lightweight
// neighbor-summary fetch (neighbors only need id, name,
// tracks.length, total_duration_ms — no track enrichment).
const getCachedMusicData = cache(() =>
  getMusicData(
    SPOTIFY_USER_ID,
    EXCLUDE_IDS,
    MANUAL_ORDER,
    MANUAL_BOTTOM_ORDER,
  ),
);

type Params = { playlistId: string };

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { playlistId } = await params;
  const { playlists } = await getCachedMusicData();
  const playlist = playlists.find((p) => p.id === playlistId) ?? null;
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
      ...twitterAttribution,
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
  const { playlists } = await getCachedMusicData();
  const idx = playlists.findIndex((p) => p.id === playlistId);
  const playlist = idx >= 0 ? playlists[idx] : null;
  if (!playlist) notFound();

  // Adjacent-playlist neighbors — Newer LEFT, Older RIGHT in the
  // listing's display order. Same convention as /films/[slug] and
  // /television/[showSlug] so a reader carrying "further right =
  // older" as their mental model stays consistent across clusters.
  // sortPlaylistsForDisplay honors MANUAL_ORDER (top-pinned), then
  // date order, then MANUAL_BOTTOM_ORDER — so the neighbors here
  // are exactly the ones flanking this playlist on the listing
  // grid.
  const newerPlaylist = idx > 0 ? playlists[idx - 1] : null;
  const olderPlaylist =
    idx >= 0 && idx < playlists.length - 1 ? playlists[idx + 1] : null;

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

                {/* Share this playlist. Personal emphasis — sits below
                    the Spotify / Apple Music actions since those are the
                    primary CTAs. */}
                <ShareBar
                  path={`/music/${playlist.id}`}
                  title={`${playlist.name}, a playlist by Malcolm Xavier`}
                  emphasis="personal"
                  surface="music"
                  label="Share"
                />
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

        {/* ─── Adjacent playlists (chronological prev/next) ────
            Sibling-to-sibling links between playlist detail pages.
            Newer LEFT, Older RIGHT — same convention as
            /films/[slug] and /television/[showSlug] so a reader
            carrying "further right = older" as their mental model
            stays consistent across clusters. Replaces the prior
            "More from the catalog →" CTA, which sent users back
            to the listing root and lost the in-flight context. */}
        {(newerPlaylist || olderPlaylist) ? (
          <Section padding="md" bordered>
            <nav
              aria-label="Adjacent playlists"
              className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8"
            >
              {newerPlaylist ? (
                <NeighborLink playlist={newerPlaylist} direction="newer" />
              ) : (
                <span aria-hidden="true" />
              )}
              {olderPlaylist ? (
                <NeighborLink playlist={olderPlaylist} direction="older" />
              ) : (
                <span aria-hidden="true" />
              )}
            </nav>
          </Section>
        ) : null}
      </Container>
    </div>
  );
}

// ─── Adjacent-playlist NeighborLink ───────────────────────────────
// Card-shaped link to a sibling playlist. Mirrors the
// NeighborLink components in /films/[slug] and /television/[showSlug]
// (bordered wrapper, padding, hover-color-shift on the border)
// so the cross-cluster "what's next?" affordance reads identically
// regardless of which sub-brand the visitor is browsing.

function NeighborLink({
  playlist,
  direction,
}: {
  playlist: EnrichedPlaylist;
  direction: "newer" | "older";
}) {
  const kicker =
    direction === "newer" ? "← Newer playlist" : "Older playlist →";
  return (
    <NextLink
      href={`/music/${playlist.id}`}
      style={{
        textDecoration: "none",
        display: "block",
        padding: "var(--scale-400)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--border-radius-md)",
        outlineColor: "var(--border-focus)",
        color: "inherit",
      }}
      className="hover:[border-color:var(--text-action)] focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Stack gap="100">
        <Kicker>{kicker}</Kicker>
        <p
          style={{
            fontFamily: "var(--font-primary)",
            fontSize: "var(--p-lg-font-size)",
            lineHeight: "var(--p-lg-line-height)",
            color: "var(--text-body)",
            margin: 0,
          }}
        >
          {playlist.name}
        </p>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--p-sm-font-size)",
            lineHeight: "var(--p-sm-line-height)",
            color: "var(--text-caption)",
            letterSpacing: "0.04em",
            margin: 0,
          }}
        >
          {playlist.tracks.length} song
          {playlist.tracks.length === 1 ? "" : "s"} ·{" "}
          {formatDuration(playlist.total_duration_ms)}
        </p>
      </Stack>
    </NextLink>
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
