// ─────────────────────────────────────────────────────────────────
// /music — Malcolm's public Spotify playlists.
//
// Server component. Fetches all of Malcolm's owned (not followed)
// playlists from Spotify in parallel, enriches each one with full
// track entries (so we can compute total duration + last-added-at
// proxy + show 4-track previews on the grid card), then renders a
// purple-sub-branded grid.
//
// Sort: by most-recent track added_at descending — proxy for "last
// edited" since Spotify doesn't expose a true modified-at field.
// Manual pins via lib/feeds/spotify-config.ts MANUAL_ORDER override
// the proxy for specific playlists.
//
// Caching: ISR via Next.js Route Segment Config. The data's slow-
// moving; revalidate hourly. A daily cron can be wired later for
// tighter freshness.
//
// Each grid card links to /music/[playlistId] (full track list).
// External "Open on Spotify" link sits on the detail page, not here.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Image from "next/image";
import NextLink from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Lede } from "@/components/typography/Lede";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
import {
  getOwnedPlaylists,
  getEnrichedPlaylist,
  sortPlaylistsForDisplay,
  formatDuration,
  decodeSpotifyDescription,
  pickImage,
  type EnrichedPlaylist,
} from "@/lib/feeds/spotify";
import { MANUAL_ORDER, EXCLUDE_IDS } from "@/lib/feeds/spotify-config";

// Revalidate hourly. Spotify data's slow-moving; an hour of
// staleness is fine for a portfolio. On-demand revalidation via
// cron can be layered post-MVP.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Music — Malcolm Xavier",
  description:
    "Public playlists Malcolm builds and maintains on Spotify, sorted by last edit.",
};

const SPOTIFY_USER_ID = process.env.SPOTIFY_USER_ID ?? "malcolmxevans";

// How many preview tracks each grid card shows under the meta line.
const PREVIEW_TRACK_COUNT = 4;

export default async function MusicPage() {
  // Pull every owned + public playlist's metadata in one paginated
  // call, minus anything Malcolm has opted out via EXCLUDE_IDS.
  // Then enrich each survivor (full track list) in parallel.
  // If Spotify is rate-limiting or otherwise unavailable, fall back
  // to a small editorial holding state so the page doesn't 500.
  let playlists: EnrichedPlaylist[];
  try {
    const summaries = await getOwnedPlaylists(SPOTIFY_USER_ID, EXCLUDE_IDS);
    const enriched = await Promise.all(summaries.map(getEnrichedPlaylist));
    playlists = sortPlaylistsForDisplay(enriched, MANUAL_ORDER);
  } catch (err) {
    console.error("[/music] Spotify fetch failed:", err);
    return <SpotifyUnavailable />;
  }

  return (
    // data-subbrand flips --primary-*, --font-primary, and
    // --font-secondary to the music cluster (purple + Roboto Mono +
    // Roboto Slab) for everything inside this wrapper.
    <div data-subbrand="music">
      <Container size="lg">
        {/* ─── Hero ──────────────────────────────────────────────── */}
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>Music · {playlists.length} playlists</Kicker>
            <Display>Now playing.</Display>
            <Lede>
              Public playlists I build and maintain on Spotify. Sorted
              by last edit; pinned ones are pinned. Click any card for
              the full track list.
            </Lede>
          </Stack>
        </Section>

        {/* ─── Grid ──────────────────────────────────────────────── */}
        <Section padding="md" bordered>
          <ul
            // Grid columns scale up at common breakpoints. 4-up at
            // wide-desktop is the upper bound; if the 4-track preview
            // rows feel cramped at xl, we drop to 3 here.
            className={[
              "grid gap-x-8 gap-y-12",
              "grid-cols-1",
              "sm:grid-cols-2",
              "lg:grid-cols-3",
              "xl:grid-cols-4",
            ].join(" ")}
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            {playlists.map((p) => (
              <li key={p.id}>
                <PlaylistCard playlist={p} />
              </li>
            ))}
          </ul>
        </Section>
      </Container>
    </div>
  );
}

// ─── Fallback ─────────────────────────────────────────────────────

/**
 * Editorial holding state when Spotify is rate-limiting or otherwise
 * unreachable. Keeps the chrome / sub-brand flip / nav consistent
 * with the working state — only the body changes.
 */
function SpotifyUnavailable() {
  return (
    <div data-subbrand="music">
      <Container size="md">
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>Music · temporarily unavailable</Kicker>
            <Display>Spotify isn&rsquo;t talking right now.</Display>
            <Lede>
              The playlist feed is hitting a rate limit upstream.
              Refresh in a minute or two and it should be back. In
              the meantime, the canonical home for everything is on
              Spotify.
            </Lede>
            <div>
              <a
                href="https://open.spotify.com/user/malcolmxevans"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-action)",
                  textDecoration: "underline",
                  textUnderlineOffset: "0.25em",
                }}
              >
                Open my profile on Spotify &rarr;
              </a>
            </div>
          </Stack>
        </Section>
      </Container>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────

function PlaylistCard({ playlist }: { playlist: EnrichedPlaylist }) {
  const cover = pickImage(playlist.images, 300);
  const previewTracks = playlist.tracks.slice(0, PREVIEW_TRACK_COUNT);
  const description = decodeSpotifyDescription(playlist.description);

  return (
    <article>
      <Stack gap="300">
        {/* ── Cover art ─────────────────────────────────────────
            Square aspect via padding-bottom hack so we don't depend
            on Spotify's null-dimensioned auto-mosaic images. The
            <Image> with fill picks up the surrounding height. */}
        <NextLink
          href={`/music/${playlist.id}`}
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
          ) : (
            <div
              className="rounded-md w-full h-full"
              style={{ background: "var(--surface-muted)" }}
              aria-hidden
            />
          )}
        </NextLink>

        {/* ── Name + description ────────────────────────────── */}
        <Stack gap="200">
          <Headline
            level={3}
            style={{
              fontSize: "var(--h5-font-size)",
              lineHeight: "var(--h5-line-height)",
            }}
          >
            <NextLink
              href={`/music/${playlist.id}`}
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

          {description ? (
            <Body
              size="sm"
              // Clamp to 3 lines so cards stay roughly aligned in
              // the grid even when descriptions vary in length.
              className="line-clamp-3"
              style={{
                color: "var(--text-caption)",
                maxWidth: "100%",
              }}
            >
              {description}
            </Body>
          ) : null}

          {/* Meta line — count + total duration. Mono kicker voice
              keeps it consistent with the rest of the design system. */}
          <Kicker>
            {playlist.tracks.length} song
            {playlist.tracks.length === 1 ? "" : "s"} ·{" "}
            {formatDuration(playlist.total_duration_ms)}
          </Kicker>
        </Stack>

        {/* ── Track preview ─────────────────────────────────── */}
        {previewTracks.length > 0 ? (
          <ul
            // Borderless list of 4 small rows — album thumb on the
            // left, track name above artist on the right.
            className="space-y-2"
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

function PreviewRow({ track }: { track: EnrichedPlaylist["tracks"][number]["track"] }) {
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
