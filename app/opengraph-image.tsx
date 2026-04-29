// ─────────────────────────────────────────────────────────────────
// Open Graph / Twitter card image — 1200×630.
//
// Renders at build time via Next.js's `app/opengraph-image.tsx` file
// convention. The result is referenced by <meta property="og:image">
// and <meta name="twitter:image"> in every page's <head>, so any
// time someone shares a malxavi.com URL on LinkedIn, Slack, iMessage,
// Discord, etc., the unfurled preview shows this card instead of a
// generic gray Vercel default.
//
// Design treatment matches the LinkedIn banner family
// (app/banner/linkedin/*): true-black canvas with two horizontal
// "dot bands" of sub-brand colors. Anyone who sees both the banner
// and the OG card recognizes them as one design system.
//
// Why hex literals (not CSS vars):
//   ImageResponse is rendered by Satori, which doesn't resolve CSS
//   custom properties — `var(--green-500)` would render as black.
//   The hex values below mirror the canonical sub-brand swatches
//   defined in app/globals.css. If a swatch changes there, this
//   file must be updated by hand.
// ─────────────────────────────────────────────────────────────────

import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og/load-google-font";

export const alt =
  "Malcolm Xavier—Senior product manager. Tech, media, streaming.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Sub-brand swatches — must mirror --{color}-500 in app/globals.css.
// Same mapping as app/banner/linkedin/dots.tsx.
const SUB_BRAND_HEX = {
  newsletter: "#0cfc28", // green
  film: "#ef941e", // orange
  tv: "#0d1dcd", // blue
  music: "#740bd0", // purple
  podcast: "#f726fb", // pink
  games: "#e10004", // red
  books: "#faef2d", // yellow
} as const;

type DotColor = keyof typeof SUB_BRAND_HEX;
type Dot = { x: number; y: number; color: DotColor };

// Top dot band — 14 dots, x ranging 80→1110, y jittered 28→44.
// Color sequence deliberately avoids adjacent repeats so the band
// reads as scattered confetti, not a rainbow stripe.
const TOP_DOTS: Dot[] = [
  { x: 80, y: 32, color: "tv" },
  { x: 155, y: 42, color: "podcast" },
  { x: 235, y: 28, color: "newsletter" },
  { x: 315, y: 40, color: "film" },
  { x: 390, y: 30, color: "music" },
  { x: 470, y: 44, color: "books" },
  { x: 545, y: 26, color: "games" },
  { x: 625, y: 40, color: "tv" },
  { x: 700, y: 32, color: "podcast" },
  { x: 780, y: 42, color: "film" },
  { x: 860, y: 28, color: "music" },
  { x: 940, y: 38, color: "newsletter" },
  { x: 1020, y: 30, color: "tv" },
  { x: 1095, y: 44, color: "games" },
];

// Bottom dot band — mirror placement, 14 dots near the bottom edge.
const BOTTOM_DOTS: Dot[] = [
  { x: 95, y: 596, color: "film" },
  { x: 170, y: 586, color: "music" },
  { x: 250, y: 600, color: "tv" },
  { x: 330, y: 588, color: "books" },
  { x: 405, y: 600, color: "newsletter" },
  { x: 485, y: 590, color: "podcast" },
  { x: 560, y: 586, color: "games" },
  { x: 640, y: 600, color: "music" },
  { x: 720, y: 590, color: "tv" },
  { x: 795, y: 586, color: "film" },
  { x: 875, y: 598, color: "podcast" },
  { x: 955, y: 588, color: "books" },
  { x: 1035, y: 600, color: "games" },
  { x: 1115, y: 588, color: "newsletter" },
];

export default async function OpenGraphImage() {
  const heroText = "Malcolm Xavier";
  const subtitleText = "Senior product manager";
  const taglineText = "Tech, media, streaming.";
  const urlText = "malxavi.com";

  const [instrumentSerif, dmSans, robotoMono] = await Promise.all([
    loadGoogleFont("Instrument+Serif", heroText),
    loadGoogleFont("DM+Sans", `${subtitleText}${taglineText}`),
    // Sitewide locked mono is Roboto Mono (see app/layout.tsx + the
    // type system memory). The OG card mirrors the site, so the URL
    // chip should also render in Roboto Mono — not DM Mono, which
    // would create a Slack-unfurl-vs-site drift.
    loadGoogleFont("Roboto+Mono", urlText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#000000",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          fontFamily: "DM Sans",
          overflow: "hidden",
        }}
      >
        {/* Top dot band — sub-brand confetti hugging the upper edge.
            Mirrors app/banner/linkedin/page.tsx so the OG card and
            the LinkedIn banner read as one family. */}
        {TOP_DOTS.map((d, i) => (
          <span
            key={`top-${i}`}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: SUB_BRAND_HEX[d.color],
            }}
          />
        ))}

        {/* Hero block — vertically centered between the dot bands.
            Same hierarchy as the recruiter cluster's landing page:
            Instrument Serif name, DM Sans role + tagline. */}
        <div
          style={{
            position: "absolute",
            left: 96,
            right: 96,
            top: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              fontFamily: "Instrument Serif",
              fontSize: 144,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            {heroText}
          </div>
          <div
            style={{
              fontSize: 40,
              lineHeight: 1.2,
              fontWeight: 500,
              color: "#e5e5e5",
            }}
          >
            {subtitleText}
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.2,
              fontWeight: 400,
              color: "#a3a3a3",
            }}
          >
            {taglineText}
          </div>
        </div>

        {/* Bottom dot band. */}
        {BOTTOM_DOTS.map((d, i) => (
          <span
            key={`bot-${i}`}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: SUB_BRAND_HEX[d.color],
            }}
          />
        ))}

        {/* URL signature — small mono in the lower-right, just above
            the bottom dot band. Low-contrast on purpose so it reads
            as a quiet anchor next to the dots rather than competing
            with the hero text. */}
        <div
          style={{
            position: "absolute",
            right: 96,
            bottom: 56,
            fontFamily: "Roboto Mono",
            fontSize: 22,
            color: "#737373",
            letterSpacing: "0.02em",
            display: "flex",
          }}
        >
          {urlText}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Instrument Serif",
          data: instrumentSerif,
          style: "normal",
          weight: 400,
        },
        {
          name: "DM Sans",
          data: dmSans,
          style: "normal",
          weight: 400,
        },
        {
          name: "Roboto Mono",
          data: robotoMono,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
