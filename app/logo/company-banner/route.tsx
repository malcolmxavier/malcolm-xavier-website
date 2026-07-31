// ─────────────────────────────────────────────────────────────────
// /logo/company-banner — LinkedIn company-page cover for Malcolm
// Xavier Consulting.
//
// Same downloadable-brand-asset pattern as /logo/mx (see that route's
// header comment): rendered through next/og so it stays in lockstep
// with the Nameplate system instead of living in a design tool.
//
// The company cover is deliberately NOT the personal banner's metric
// row — those numbers are Malcolm-as-candidate credentials from
// employer work; on the practice's page they'd read as the practice
// claiming them. The cover carries brand only: the tagline's triad as
// a serif drumbeat ("Product. Data. Content.") with each full stop
// rendered as the brand-green dot — the same baseline-dot gesture as
// the MX avatar — over a quiet mono brand row. LinkedIn renders the
// full tagline sentence directly under the page name, so the cover
// reinforces the triad rather than duplicating the sentence.
//
// Canvas is 2256×382 — 2× LinkedIn's 1128×191 company-cover spec.
// Safe zones: the page's logo avatar overlaps the cover's lower-left
// on desktop, and mobile crops toward the center, so the composition
// is centered with generous side margins and nothing load-bearing in
// the lower-left quarter.
//
// Export: open the URL in a browser and save the PNG (or `curl -o`).
//
// Why hex literals (not CSS vars): Satori doesn't resolve CSS custom
// properties. Values mirror the Nameplate card palette in
// lib/og/case-study-card.tsx.
// ─────────────────────────────────────────────────────────────────

import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og/load-google-font";

const WIDTH = 2256;
const HEIGHT = 382;

// Nameplate card palette — cool near-black ground, cool off-white ink,
// cool-grey kicker, green-400 accent (brand green at its dark-surface
// value).
const GROUND =
  "radial-gradient(125% 135% at 24% -12%, #15171a 0%, #090a0b 56%)";
const INK = "#f2f3f4";
const KICKER = "#808689";
const ACCENT = "#3dfd53";

// The triad the serif line drums out — one word per practice line of
// the tagline, each closed by a green baseline dot.
const WORDS = ["Product", "Data", "Content"];

export async function GET() {
  // Subset each font download to exactly the glyphs it renders.
  const [instrumentSerif, robotoMono] = await Promise.all([
    loadGoogleFont("Instrument+Serif", WORDS.join("")),
    loadGoogleFont("Roboto+Mono", "malxavi.com · est. 2022"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: GROUND,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Serif drumbeat — each word bottom-aligned with its own
            green dot lifted onto the baseline, mirroring /logo/mx. */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 64 }}>
          {WORDS.map((word) => (
            <div
              key={word}
              style={{ display: "flex", alignItems: "flex-end" }}
            >
              <div
                style={{
                  fontFamily: "Instrument Serif",
                  fontSize: 148,
                  lineHeight: 1,
                  letterSpacing: "-0.015em",
                  color: INK,
                }}
              >
                {word}
              </div>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: ACCENT,
                  marginLeft: 8,
                  marginBottom: 28,
                }}
              />
            </div>
          ))}
        </div>

        {/* Quiet mono brand row under the statement. */}
        <div
          style={{
            fontFamily: "Roboto Mono",
            fontSize: 30,
            letterSpacing: "0.18em",
            color: KICKER,
            marginTop: 40,
          }}
        >
          malxavi.com · est. 2022
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: "Instrument Serif",
          data: instrumentSerif,
          style: "normal",
          weight: 400,
        },
        { name: "Roboto Mono", data: robotoMono, style: "normal", weight: 400 },
      ],
    },
  );
}
