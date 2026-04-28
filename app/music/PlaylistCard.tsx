// ─────────────────────────────────────────────────────────────────
// PlaylistCard — uniform-height card used by both /music views.
//
// Extracted from page.tsx so MusicShell (client component) can
// render cards directly while paginating / switching views, and
// /music/page.tsx (server component) can still use the same card
// for the initial paint.
//
// No "use client" directive — this is a "shared" component. When
// imported by a server context it SSRs, when imported by a client
// context it ships in the client bundle. Keep server-only imports
// out of this file so both paths work.
//
// Uniform-height contract:
//   - Cover image: 1:1 aspect ratio (width-driven)
//   - Title: line-clamp-2 + min-height 2lh (always 2 lines tall)
//   - Description: same — reserved 2-line slot even when empty
//   - Meta line: 1 line
//   - Track preview: 4 fixed rows pinned to bottom via mt-auto
// All combined → identical card height regardless of content.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
import NextLink from "next/link";
import { Stack } from "@/components/layout/Stack";
import { Headline } from "@/components/typography/Headline";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
import {
  decodeSpotifyDescription,
  formatDuration,
  pickImage,
  type EnrichedPlaylist,
} from "@/lib/feeds/spotify-utils";
import { APPLE_MUSIC_LINKS } from "@/lib/feeds/spotify-config";

const PREVIEW_TRACK_COUNT = 4;

// Pick up to 4 distinct album covers from a playlist's tracks, in
// playlist order, deduped by album.id. Used to compose our own 2x2
// auto-mosaic when Spotify's listing endpoint returns null images
// (which is what happens for any playlist that hasn't had a custom
// cover uploaded — Spotify renders a mosaic in its own UI from the
// same first-4-unique-album-cover logic, but doesn't expose the
// mosaic URL through the listing path). This mirrors Spotify's
// behavior exactly without an extra API call.
//
// Dedup uses album.id, which is region-stable for most albums but
// not all — a playlist with the US release and the EU release of
// the same record back-to-back would render both as separate
// mosaic tiles. Low probability for a curated collection; if it
// ever matters, add a secondary dedup on album.name.
function pickMosaicCovers(playlist: EnrichedPlaylist) {
  const seen = new Set<string>();
  const out: { url: string; albumName: string }[] = [];
  for (const { track } of playlist.tracks) {
    if (seen.has(track.album.id)) continue;
    const img = pickImage(track.album.images, 150);
    if (!img) continue;
    seen.add(track.album.id);
    out.push({ url: img.url, albumName: track.album.name });
    if (out.length === 4) break;
  }
  return out;
}

export function PlaylistCard({ playlist }: { playlist: EnrichedPlaylist }) {
  const cover = pickImage(playlist.images, 300);
  const mosaicCovers = cover ? [] : pickMosaicCovers(playlist);
  const previewTracks = playlist.tracks.slice(0, PREVIEW_TRACK_COUNT);
  const description = decodeSpotifyDescription(playlist.description);
  const appleMusicHref = APPLE_MUSIC_LINKS[playlist.id];

  return (
    <article className="h-full">
      {/* h-full on the outer Stack so it fills the grid cell. The
          mt-auto on the track preview ul below pushes the previews
          to the bottom edge — combined with reserved line-count slots
          on the title and description, every card in the grid renders
          at identical height. */}
      <Stack gap="300" className="h-full">
        {/* ── Cover art ─────────────────────────────────────────
            Square aspect via padding-bottom hack so we don't depend
            on Spotify's null-dimensioned auto-mosaic images. The
            <Image> with fill picks up the surrounding height. */}
        <NextLink
          href={`/music/${playlist.id}?from=music`}
          className="block relative w-full focus-visible:outline-2 focus-visible:outline-offset-4 rounded-md"
          style={{
            outlineColor: "var(--border-focus)",
            aspectRatio: "1 / 1",
          }}
          aria-label={`Open ${playlist.name}`}
        >
          {cover ? (
            <Image
              src={cover.url}
              alt=""
              fill
              sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 24rem, (min-width: 640px) 40vw, 90vw"
              className="rounded-md object-cover"
            />
          ) : mosaicCovers.length === 4 ? (
            // Our own 2x2 mosaic — mirrors what Spotify renders in
            // its UI for playlists that have no uploaded cover. We
            // construct it client-side from the first 4 unique
            // album covers in track order, since the listing API
            // returns null images for these and doesn't expose the
            // mosaic URL.
            //
            // Decorative wrapper (no role/aria-label): the parent
            // NextLink already names the destination via aria-label
            // ("Open {playlist}") so an inner role="img" with a
            // four-album-list label would (a) likely be suppressed
            // by AT under name-from-content priority, (b) bloat
            // SR announcements with verbose album titles, and (c)
            // duplicate semantics the playlist heading already
            // carries below the cover. Keep this as visual chrome.
            //
            // No gutter between cells — matches Spotify's actual
            // mosaic rendering. An earlier iteration tried a 1px
            // hairline divider; user signed off on the gutter-less
            // version during the 2026-04-28 audit verification.
            <div
              aria-hidden
              className="rounded-md w-full h-full overflow-hidden grid grid-cols-2 grid-rows-2"
            >
              {mosaicCovers.map((c) => (
                <div key={c.url} className="relative">
                  <Image
                    src={c.url}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 9rem, (min-width: 1024px) 12rem, (min-width: 640px) 20vw, 45vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : mosaicCovers.length > 0 ? (
            // Fewer than 4 unique albums — Spotify's mosaic logic
            // would also fall back; we use the first available cover
            // so the card isn't empty.
            <Image
              src={mosaicCovers[0].url}
              alt=""
              fill
              sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 24rem, (min-width: 640px) 40vw, 90vw"
              className="rounded-md object-cover"
            />
          ) : (
            // No-cover fallback (rare: empty playlist + no listing
            // image). role="img" + aria-label gives the tile an
            // explicit AT description; the playlist name in the
            // <Headline> below carries the identity.
            <div
              role="img"
              aria-label="No cover art available"
              className="rounded-md w-full h-full"
              style={{ background: "var(--surface-muted)" }}
            />
          )}
        </NextLink>

        {/* ── Name + description + meta ───────────────────────── */}
        <Stack gap="200">
          {/* Title clamps to 2 lines and reserves min-height of 2
              line-heights even when the title is 1 line. Long titles
              (the Pride Mix outliers — `🌬🤍/ 💔🥊 vol. 3:
              [baby daddy Extended Pride Mix]`) get their stylistic
              suffix truncated; the core series identifier survives.
              Full title is on the detail page. */}
          <Headline
            level={3}
            className="line-clamp-2"
            style={{
              fontSize: "var(--h5-font-size)",
              lineHeight: "var(--h5-line-height)",
              minHeight: "2lh",
            }}
          >
            <NextLink
              href={`/music/${playlist.id}?from=music`}
              className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 hover:[color:var(--text-action-hover)]"
              style={{
                color: "var(--text-heading)",
                textDecoration: "none",
                outlineColor: "var(--border-focus)",
              }}
            >
              {playlist.name}
            </NextLink>
          </Headline>

          {/* Description renders in a fixed 2-line slot, even when
              the playlist has no description. The non-breaking-space
              fallback keeps line-clamp's display:-webkit-box from
              collapsing the empty box; min-height: 2lh enforces the
              reservation. Empty-description cards get ~2 lines of
              editorial breathing room here. */}
          <Body
            size="sm"
            className="line-clamp-2"
            style={{
              color: "var(--text-caption)",
              maxWidth: "100%",
              minHeight: "2lh",
            }}
          >
            {description || " "}
          </Body>

          {/* Meta line — count + total duration. Mono kicker voice
              keeps it consistent with the rest of the design system. */}
          <Kicker>
            {playlist.tracks.length} song
            {playlist.tracks.length === 1 ? "" : "s"} ·{" "}
            {formatDuration(playlist.total_duration_ms)}
          </Kicker>

          {/* Outlinks — small mono links to the same playlist on
              streaming services. Spotify is always present (we got
              the playlist data from there). Apple Music renders only
              when an explicit mapping exists in
              lib/feeds/spotify-config.ts APPLE_MUSIC_LINKS.
              ↗ arrow follows the site's external-link convention. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={playlist.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${playlist.name} on Spotify`}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--p-xs-font-size)",
                lineHeight: "var(--p-xs-line-height)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--primary-default)",
                textDecoration: "none",
              }}
              className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
            >
              Spotify ↗
            </a>
            {appleMusicHref ? (
              <a
                href={appleMusicHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${playlist.name} on Apple Music`}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--p-xs-font-size)",
                  lineHeight: "var(--p-xs-line-height)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--primary-default)",
                  textDecoration: "none",
                }}
                className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
              >
                Apple Music ↗
              </a>
            ) : null}
          </div>
        </Stack>

        {/* ── Track preview ─────────────────────────────────── */}
        {previewTracks.length > 0 ? (
          <ul
            // mt-auto pins the preview to the bottom edge of the
            // card. With reserved title/description slots above,
            // every row of cards aligns track previews at the same Y.
            // role="list" because Safari iOS strips the implicit list
            // role when list-style: none is applied.
            role="list"
            className="space-y-2 mt-auto"
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            {previewTracks.map(({ track }, i) => (
              // Index-suffixed key — even if Spotify ever returns a
              // duplicate id (rare but possible for re-added tracks),
              // each row stays uniquely keyed.
              <PreviewRow key={`${track.id}-${i}`} track={track} />
            ))}
          </ul>
        ) : null}
      </Stack>
    </article>
  );
}

// ─── Preview row ──────────────────────────────────────────────────

function PreviewRow({
  track,
}: {
  track: EnrichedPlaylist["tracks"][number]["track"];
}) {
  // 64px is the smallest size Spotify provides — perfect for the
  // 56px display thumb. Picking minWidth=64 preserves clarity.
  const thumb = pickImage(track.album.images, 64);
  const artists = track.artists.map((a) => a.name).join(", ");

  return (
    <li className="flex items-center gap-3">
      {/* Album thumbnail. Decorative — the track name carries the
          real semantic; alt="" prevents redundant SR announcement. */}
      <div
        className="relative shrink-0 overflow-hidden rounded-sm"
        style={{ width: 56, height: 56 }}
      >
        {thumb ? (
          <Image
            src={thumb.url}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: "var(--surface-muted)" }}
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0">
        {/* Truncate both lines so long titles don't break the layout. */}
        <p
          className="truncate"
          style={{
            fontFamily: "var(--font-secondary)",
            fontSize: "var(--p-sm-font-size)",
            lineHeight: "var(--p-sm-line-height)",
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
            fontSize: "var(--p-xs-font-size)",
            lineHeight: "var(--p-xs-line-height)",
            color: "var(--text-caption)",
          }}
        >
          {artists}
        </p>
      </div>
    </li>
  );
}
