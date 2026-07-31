// ─────────────────────────────────────────────────────────────────
// /logo/mx — MX monogram, the Malcolm Xavier Consulting page avatar.
//
// A downloadable brand asset, not a link-unfurl preview — same
// rationale as the review-image routes: it renders through next/og so
// the mark stays in lockstep with the design system (real Instrument
// Serif, the Nameplate palette) instead of living as a one-off export
// in a design tool.
//
// The mark: "MX" in Instrument Serif with the brand-green dot from the
// Nameplate masthead brand row sitting on the baseline as a full stop.
// That dot is the identity's single color gesture (see
// lib/og/case-study-card.tsx) — the avatar carries the same one.
//
// Canvas is 600×600 (LinkedIn recommends 300×300 for company logos;
// 2× uploads cleanly and survives LinkedIn's re-encode crisper).
// LinkedIn shows the avatar as small as ~48px in feeds, so the mark is
// two glyphs and a dot — nothing that vanishes at 1/12 scale.
//
// Query: `?theme=light` → white ground with near-black ink; default is
// the dark Nameplate ground, matching the banner and OG cards so the
// company page reads as the same identity. Both are solid-ground (no
// transparency), so the avatar is safe on LinkedIn's light AND dark
// chrome either way.
//
// Export: open the URL in a browser and save the PNG (or `curl -o`).
//
// Why hex literals (not CSS vars): Satori doesn't resolve CSS custom
// properties. Values mirror app/globals.css and the card palette in
// lib/og/case-study-card.tsx; if a swatch changes there, update here
// by hand.
// ─────────────────────────────────────────────────────────────────

import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og/load-google-font";

const SIZE = 600;

// Dark variant — the Nameplate card palette: cool near-black ground
// with a soft top-left lift, cool off-white ink, green-400 accent (the
// brand green at its dark-surface value).
const DARK = {
  ground: "radial-gradient(125% 135% at 24% -12%, #15171a 0%, #090a0b 56%)",
  ink: "#f2f3f4",
  accent: "#3dfd53",
};

// Light variant — surface-page white, the same cool near-black as ink,
// green-500 accent (light-mode --primary-default).
const LIGHT = {
  ground: "#ffffff",
  ink: "#090a0b",
  accent: "#0cfc28",
};

export async function GET(request: Request) {
  const palette =
    new URL(request.url).searchParams.get("theme") === "light" ? LIGHT : DARK;

  // Subset the font download to the two glyphs the mark renders.
  const instrumentSerif = await loadGoogleFont("Instrument+Serif", "MX");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: palette.ground,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Instrument Serif",
        }}
      >
        {/* Monogram row — the glyphs and the dot bottom-align, then the
            dot lifts by the descender space so it sits ON the baseline
            like a full stop rather than hanging below it. */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div
            style={{
              fontSize: 330,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: palette.ink,
            }}
          >
            MX
          </div>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: palette.accent,
              marginLeft: 14,
              marginBottom: 62,
            }}
          />
        </div>
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: [
        {
          name: "Instrument Serif",
          data: instrumentSerif,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
