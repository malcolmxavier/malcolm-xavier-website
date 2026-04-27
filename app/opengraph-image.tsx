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
// Design: recruiter cluster styling (warm cream background, black
// text, Instrument Serif display + DM Sans body). Hero name +
// professional positioning + URL in mono as a subtle bottom-right
// anchor.
// ─────────────────────────────────────────────────────────────────

import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og/load-google-font";

export const alt =
  "Malcolm Xavier — Senior product manager. Tech, media, streaming.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  // Pull only the glyphs that appear on the card — keeps the font
  // download under a few KB per family.
  const heroText = "Malcolm Xavier";
  const subtitleText = "Senior product manager";
  const taglineText = "Tech, media, streaming.";
  const urlText = "malxavi.com";
  const allText = `${heroText}${subtitleText}${taglineText}${urlText}`;

  const [instrumentSerif, dmSans, dmMono] = await Promise.all([
    loadGoogleFont("Instrument+Serif", heroText),
    loadGoogleFont("DM+Sans", `${subtitleText}${taglineText}`),
    loadGoogleFont("DM+Mono", urlText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f5f6f5", // recruiter cluster cream
          color: "#000000",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 96px",
          fontFamily: "DM Sans",
        }}
      >
        {/* Hero block — name in Instrument Serif, role + tagline in
            DM Sans. Mirrors how the same hierarchy reads on the
            landing page, so the OG card and the destination feel
            like the same brand. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginTop: 40,
          }}
        >
          <div
            style={{
              fontFamily: "Instrument Serif",
              fontSize: 144,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
            }}
          >
            {heroText}
          </div>
          <div
            style={{
              fontSize: 40,
              lineHeight: 1.2,
              fontWeight: 500,
              color: "#1a1a1a",
            }}
          >
            {subtitleText}
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.2,
              fontWeight: 400,
              color: "#4a4a4a",
            }}
          >
            {taglineText}
          </div>
        </div>

        {/* Bottom-right URL — small, mono, low-contrast. Reads as
            a quiet signature, not a CTA. */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontFamily: "DM Mono",
            fontSize: 24,
            color: "#6a6a6a",
            letterSpacing: "0.02em",
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
          name: "DM Mono",
          data: dmMono,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
