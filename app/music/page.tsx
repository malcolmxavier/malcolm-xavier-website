// ─────────────────────────────────────────────────────────────────
// /music — Malcolm's public Spotify playlists.
//
// Server component. Fetches all of Malcolm's owned (not followed)
// playlists from Spotify in parallel, enriches each one with full
// track entries (so we can compute total duration + last-added-at
// proxy + show 4-track previews on the grid card), then hands off
// to MusicShell (client) for view + pagination.
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
import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Lede } from "@/components/typography/Lede";
import { Kicker } from "@/components/typography/Kicker";
import {
  getOwnedPlaylists,
  getEnrichedPlaylist,
  sortPlaylistsForDisplay,
  type EnrichedPlaylist,
} from "@/lib/feeds/spotify";
import {
  COLLECTIONS,
  EXCLUDE_IDS,
  MANUAL_BOTTOM_ORDER,
  MANUAL_ORDER,
} from "@/lib/feeds/spotify-config";
import { MusicShell } from "./MusicShell";

// Revalidate hourly. Spotify data's slow-moving; an hour of
// staleness is fine for a portfolio. On-demand revalidation via
// cron can be layered post-MVP.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Music",
  description:
    "Public playlists Malcolm builds and maintains on Spotify, sorted by last edit.",
};

const SPOTIFY_USER_ID = process.env.SPOTIFY_USER_ID ?? "malcolmxevans";

export default async function MusicPage() {
  // Pull every owned + public playlist's metadata in one paginated
  // call, minus anything Malcolm has opted out via EXCLUDE_IDS.
  // Then enrich each survivor (full track list) in parallel.
  // If Spotify is rate-limiting or otherwise unavailable, fall back
  // to a small editorial holding state so the page doesn't 500.
  let playlists: EnrichedPlaylist[];
  try {
    const summaries = await getOwnedPlaylists(SPOTIFY_USER_ID, EXCLUDE_IDS);
    // Promise.all over every summary is intentionally unbounded here —
    // the underlying spotifyFetch in lib/feeds/spotify.ts caps actual
    // concurrency at MAX_CONCURRENT_REQUESTS via a head-pointer
    // semaphore (see "Spotify rate-limit incident" in the case study).
    // Without that guard, ~57 parallel /tracks calls would burn the
    // /me/playlists bucket and trigger Retry-After.
    const enriched = await Promise.all(summaries.map(getEnrichedPlaylist));
    playlists = sortPlaylistsForDisplay(
      enriched,
      MANUAL_ORDER,
      MANUAL_BOTTOM_ORDER,
    );
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
            <Display>My taste. Your next listen.</Display>
            <Lede>
              I release a new playlist each month. Click any card for
              the full track list. And click through to listen on Spotify
              or Apple Music. Check back in each month to see what's new.
            </Lede>
          </Stack>
        </Section>

        {/* ─── Grid + view toggle ────────────────────────────────
             MusicShell is the client wrapper that owns view state
             (All vs Collections) and pagination. It renders the same
             PlaylistCard the server would have, but slices the data
             per page and switches groupings on toggle. */}
        <Section padding="md" bordered>
          {/* MusicShell calls useSearchParams() to drive view + page state.
              Next.js requires that hook to live inside a Suspense boundary
              so the page can stream rather than bail out of static rendering.
              Loading caption gives users with deferred JS something to read
              instead of an empty section below the hero. */}
          <Suspense
            fallback={
              <p
                role="status"
                aria-live="polite"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--p-xs-font-size)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-caption)",
                  margin: 0,
                }}
              >
                Loading playlists…
              </p>
            }
          >
            <MusicShell playlists={playlists} collections={COLLECTIONS} />
          </Suspense>
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
