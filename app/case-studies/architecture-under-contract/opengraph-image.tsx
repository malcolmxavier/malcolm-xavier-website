// ─────────────────────────────────────────────────────────────────
// Open Graph / Twitter card image — per-article variant for
// /case-studies/architecture-under-contract.
//
// Mirrors the sitewide app/opengraph-image.tsx visual treatment
// (true-black canvas, two horizontal dot bands of sub-brand colors,
// Instrument Serif hero) so the article unfurl reads as the same
// brand family as the homepage. Differences from the sitewide card:
//
//   • Hero text is the article title, wrapped onto two lines so the
//     27-character title doesn't shrink below the sitewide card's
//     visual presence.
//   • A "Case study" eyebrow above the title signals the venue
//     to a scroller before they parse the words.
//   • Subtitle is the article's Hero subtitle verbatim — "How three
//     integrations stay online when their upstreams don’t." — so
//     the unfurl preview matches the in-article framing.
//
// Why this exists as a separate file (App Router convention):
//   Next.js 16 App Router resolves `opengraph-image.tsx` at the
//   nearest route segment that defines one. Without this file,
//   /case-studies/architecture-under-contract would inherit the
//   sitewide card — which works, but loses the article-specific
//   framing on LinkedIn / Slack / iMessage unfurls. The campaign
//   launch (2026-05-13) drives readers from a LinkedIn post; the
//   unfurl is the article's first impression.
//
// Why hex literals (not CSS vars):
//   Satori doesn't resolve CSS custom properties. Hex values
//   below mirror the sitewide card and the canonical --{color}-500
//   swatches in app/globals.css. If a swatch changes there, this
//   file must be updated by hand alongside app/opengraph-image.tsx.
// ─────────────────────────────────────────────────────────────────

import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og/load-google-font";

export const alt =
  "Architecture under contract — Case study. How three integrations stay online when their upstreams don’t.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Sub-brand swatches — must mirror --{color}-500 in app/globals.css.
// Identical to app/opengraph-image.tsx; kept inline so this file
// is fully self-contained for the Satori render pipeline.
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

// Top + bottom dot bands. Same x/y/color arrangement as the sitewide
// OG card so the visual family reads consistently across malxavi.com
// surfaces. Color sequence deliberately avoids adjacent repeats.
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
  // Article-specific copy. Subtitle matches the in-article Hero
  // subtitle verbatim so a reader who clicks through from the
  // unfurl sees the same framing on the page.
  const eyebrowText = "CASE STUDY";
  const titleLine1 = "Architecture";
  const titleLine2 = "under contract";
  const subtitleText = "How three integrations stay online when their upstreams don’t.";
  const urlText = "malxavi.com";

  const [instrumentSerif, dmSans, robotoMono] = await Promise.all([
    loadGoogleFont("Instrument+Serif", `${titleLine1}${titleLine2}`),
    loadGoogleFont("DM+Sans", subtitleText),
    // The mono on this card carries the eyebrow + URL signature.
    // Sitewide locked mono is Roboto Mono (see app/layout.tsx + the
    // type system memory) — mirroring keeps Slack unfurl and on-site
    // typography reading as one family.
    loadGoogleFont("Roboto+Mono", `${eyebrowText}${urlText}`),
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
        {/* Top dot band — matches sitewide OG card. */}
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

        {/* Content block — vertically centered between the dot bands.
            Eyebrow → 2-line title → subtitle. The two-line title
            wrap keeps the Instrument Serif type at full presence
            (128px); a one-line render of the 27-character title
            would have to shrink to ~80px to fit, losing visual
            weight against the sitewide card. */}
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
            gap: 20,
          }}
        >
          {/* Eyebrow — mono uppercase, mirrors the in-article kicker
              treatment so a recruiter who's seen one immediately
              recognizes the venue. Muted color (a3a3a3 ≥ 7:1 AA) so
              it reads as a label, not as competing copy. */}
          <div
            style={{
              fontFamily: "Roboto Mono",
              fontSize: 24,
              letterSpacing: "0.22em",
              color: "#a3a3a3",
              marginBottom: 12,
            }}
          >
            {eyebrowText}
          </div>

          <div
            style={{
              fontFamily: "Instrument Serif",
              fontSize: 128,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            {titleLine1}
          </div>
          <div
            style={{
              fontFamily: "Instrument Serif",
              fontSize: 128,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            {titleLine2}
          </div>

          <div
            style={{
              fontSize: 32,
              lineHeight: 1.3,
              fontWeight: 400,
              color: "#a3a3a3",
              marginTop: 16,
              maxWidth: 920,
            }}
          >
            {subtitleText}
          </div>
        </div>

        {/* Bottom dot band — matches sitewide OG card. */}
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

        {/* URL signature — small mono in the lower-right, above the
            bottom dot band. Same treatment as the sitewide card so
            the brand anchor is recognizable. */}
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
