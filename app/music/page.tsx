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
// Caching: dynamic — `/music` reads the `Save-Data` request header
// (see MusicPage below) so the page can't be statically pre-rendered.
// Per-request cost is low: snapshot read + HTML, no Spotify call at
// request time post-cron-snapshot architecture. Future optimization
// path is `Vary: Save-Data` cached at the edge.
//
// Each grid card links to /music/[playlistId] (full track list).
// External "Open on Spotify" link sits on the detail page, not here.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ShareBar } from "@/components/share/ShareBar";
import { twitterAttribution } from "@/lib/site-config";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Lede } from "@/components/typography/Lede";
import { Kicker } from "@/components/typography/Kicker";
import { Link } from "@/components/primitives/Link";
import { getMusicData, type MusicDataResult } from "@/lib/feeds/spotify";
import {
  COLLECTIONS,
  EXCLUDE_IDS,
  MANUAL_BOTTOM_ORDER,
  MANUAL_ORDER,
  SPOTIFY_USER_ID,
} from "@/lib/feeds/spotify-config";
import { MusicShell } from "./MusicShell";

// Per-page openGraph + twitter blocks because Next.js App Router
// REPLACES (does not merge) parent-layout OG blocks when a page
// declares its own. Without these, /music shared anywhere unfurled
// with the sitewide Malcolm card and no per-page positioning.
// (2026-04-29 /full-review, a-per-page-og-twitter.)
const MUSIC_DESCRIPTION =
  "What I’m playing right now and what I’ve played for years. Monthly Spotify drops from Malcolm Xavier.";
const MUSIC_OG_TITLE = "Malcolm Xavier’s Playlists · New every month";

export const metadata: Metadata = {
  title: "Music",
  description: MUSIC_DESCRIPTION,
  // Explicit canonical override — without it, /music inherits the
  // root layout's canonical-of-"/" and Googlebot treats it as a
  // duplicate of the landing page (2026-04-29 /full-review,
  // c-canonicals-all-root).
  alternates: {
    canonical: "/music",
  },
  openGraph: {
    title: MUSIC_OG_TITLE,
    description: MUSIC_DESCRIPTION,
    type: "website",
    url: "/music",
    siteName: "Malcolm Xavier",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Malcolm Xavier—Senior product manager. Tech, media, and streaming.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    ...twitterAttribution,
    title: MUSIC_OG_TITLE,
    description: MUSIC_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default async function MusicPage() {
  // Save-Data is an opt-in request header (IETF draft) sent by
  // browsers when the user has Data Saver / Low Data Mode enabled.
  // Reading it on the server lets us send the right initial paint
  // (3 cards instead of 12) without the post-hydration re-render
  // that a client-only `navigator.connection.saveData` check would
  // require. Closes part of l-music-no-prefers-reduced-data from
  // the 2026-04-29 /full-review.
  const headersList = await headers();
  const saveData = headersList.get("save-data") === "on";

  // getMusicData reads the on-disk snapshot in all Vercel environments
  // (SPOTIFY_OFFLINE=1). The live Spotify path inside the function
  // remains for `dev:online` workflows that power the refresh script;
  // user-facing renders never touch it. Throws only when the snapshot
  // itself is unreadable — SpotifyUnavailable is the holding state.
  let result: MusicDataResult;
  try {
    result = await getMusicData(
      SPOTIFY_USER_ID,
      EXCLUDE_IDS,
      MANUAL_ORDER,
      MANUAL_BOTTOM_ORDER,
    );
  } catch (err) {
    console.error("[/music] live AND snapshot failed:", err);
    return <SpotifyUnavailable />;
  }
  const { playlists } = result;

  return (
    // data-subbrand flips --primary-*, --font-primary, and
    // --font-secondary to the music cluster (purple + Roboto Mono +
    // Roboto Slab) for everything inside this wrapper.
    <div data-subbrand="music">
      <Container size="lg">
        {/* ─── Hero ──────────────────────────────────────────────── */}
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>Music</Kicker>
            <Display>My taste. Your next listen.</Display>
            <Lede>
              I release a new playlist each month. Click any card for
              the full track list. And click through to listen on Spotify
              or Apple Music. Check back in each month to see what’s new.
            </Lede>
            {/* Share the music landing. Personal emphasis. */}
            <ShareBar
              path="/music"
              title="Playlists by Malcolm Xavier"
              emphasis="personal"
              surface="music"
              campaign="music-landing"
              label="Share"
            />
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
            <MusicShell
              playlists={playlists}
              collections={COLLECTIONS}
              saveData={saveData}
            />
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
            <Display>Spotify isn’t talking right now.</Display>
            <Lede>
              The playlist feed is hitting a rate limit upstream.
              Refresh in a minute or two and it should be back. In
              the meantime, the canonical home for everything is on
              Spotify.
            </Lede>
            <div>
              {/* Use the Link primitive so focus styling matches the
                  rest of the site (--border-focus outline) and so
                  the external-link semantics (rel="noopener",
                  target="_blank") are handled consistently. The
                  raw <a> here was a pre-existing inconsistency
                  caught in the 2026-04-28 follow-up audit. */}
              <Link
                href="https://open.spotify.com/user/malcolmxevans"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Open my profile on Spotify →
              </Link>
            </div>
          </Stack>
        </Section>
      </Container>
    </div>
  );
}
