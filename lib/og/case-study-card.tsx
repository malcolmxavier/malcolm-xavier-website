// ─────────────────────────────────────────────────────────────────
// Case-study Open Graph / Twitter card — shared generator.
//
// Every /case-studies/* article renders the SAME card treatment as a
// per-article opengraph-image, differing only in copy. The treatment
// is a "nameplate": a magazine-style masthead (a single accent hairline
// under a mono brand row and kicker), a left-aligned Instrument Serif
// title, a short rule, the subtitle, and a faint baseline that closes
// the card like a printed leaf. It is the same masthead language as the
// downloadable review cards (lib/og/review-card.tsx), so every share
// surface — unfurls, review images, and the LinkedIn banner — reads as
// one identity.
//
// This file owns the layout so the six case studies don't each carry a
// copy of it; each article's opengraph-image.tsx is a thin wrapper that
// supplies its title lines and subtitle and calls renderCaseStudyCard.
// Per-article specifics that live in the wrapper:
//
//   • titleLines — the article title, pre-split into 1–3 lines so the
//     wrap is deliberate (Satori won't balance a soft-wrapped title).
//   • titleSize  — dialed per title so the longest line fills the card
//     without overflowing; short titles stay at the 128px default.
//   • subtitle   — the article's in-page Hero subtitle verbatim, so a
//     reader who clicks through from the unfurl meets the same framing.
//
// Accent: case studies aren't an official sub-brand, so they key to the
// site's DEFAULT accent — the brand green, at its dark-surface value
// (green-400 #3dfd53, the same lift the review-card star uses on black;
// --primary-default resolves to green on this codebase). A film / TV /
// music card would pass its sub-brand hue instead, so the single
// hairline carries the color the old dot band used to scatter.
//
// Why hex literals (not CSS vars): Satori doesn't resolve CSS custom
// properties. The values below mirror app/globals.css; if a swatch
// changes there, update this file by hand.
// ─────────────────────────────────────────────────────────────────

import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og/load-google-font";

// Shared metadata each opengraph-image.tsx re-exports (the App Router
// reads `size` and `contentType` from the route module).
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

// Card palette — a cool near-black ground with cool-neutral ink. The
// black is deliberately NOT warm: a brown-tinted black muddies against
// the cool brand green, so the neutrals carry a faint cool bias instead,
// which lets the green read clean. Card-specific hexes (chosen for depth
// over the old flat pure-black), consistent with the green from
// app/globals.css.
const INK = "#f2f3f4"; // cool off-white
const INK_MUTED = "#a7acb0"; // subtitle, cool grey
const KICKER = "#808689"; // masthead kicker, cool grey
const HAIRLINE = "rgba(242, 243, 244, 0.4)"; // interior rule
const BASELINE = "rgba(242, 243, 244, 0.13)"; // closing rule

// Default accent for non-sub-brand cards: the brand green at its
// dark-surface value (green-400). A sub-brand card overrides via
// `accent`.
const DEFAULT_ACCENT = "#3dfd53";

export type CaseStudyCardInput = {
  /** Article title, pre-split into deliberate lines (1–3). */
  titleLines: string[];
  /** In-page Hero subtitle, verbatim. */
  subtitle: string;
  /** Hero font size in px. Default 128; step down for long titles. */
  titleSize?: number;
  /** Masthead kicker. Default "CASE STUDY". */
  eyebrow?: string;
  /** Brand wordmark in the masthead. Default "malxavi.com". */
  url?: string;
  /** Accent hairline color. Default = brand green (non-sub-brand);
   *  pass a sub-brand hex for film / TV / music cards. */
  accent?: string;
};

/** Render one case-study card as a next/og ImageResponse. */
export async function renderCaseStudyCard({
  titleLines,
  subtitle,
  titleSize = 128,
  eyebrow = "CASE STUDY",
  url = "malxavi.com",
  accent = DEFAULT_ACCENT,
}: CaseStudyCardInput): Promise<ImageResponse> {
  // Subset each font to exactly the glyphs it renders. Instrument Serif
  // now carries BOTH the title and the subtitle (the card is all-serif —
  // more editorial than the old serif-plus-sans mix); Roboto Mono
  // carries the masthead brand row and kicker.
  const serifText = titleLines.join("") + subtitle;
  const monoText = `${eyebrow}${url}`;
  const [instrumentSerif, robotoMono] = await Promise.all([
    loadGoogleFont("Instrument+Serif", serifText),
    // Sitewide locked mono is Roboto Mono (see app/layout.tsx + the type
    // system memory) — mirroring keeps the unfurl and on-site typography
    // reading as one family.
    loadGoogleFont("Roboto+Mono", monoText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          // Cool near-black with a soft top-left lift — material depth
          // instead of the old flat #000, with a faint cool bias so the
          // brand green doesn't muddy against a warm ground.
          background:
            "radial-gradient(125% 135% at 24% -12%, #15171a 0%, #090a0b 56%)",
          color: INK,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Instrument Serif",
          padding: "52px 96px 44px",
        }}
      >
        {/* Masthead — mono brand row (accent dot + wordmark) on the left,
            kicker on the right, over a single accent hairline. This is
            the whole of the color story: one tailored line where the old
            card scattered fourteen dots. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 20,
            borderBottom: `3px solid ${accent}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              fontFamily: "Roboto Mono",
              fontSize: 22,
              letterSpacing: "0.04em",
              color: INK,
            }}
          >
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: "50%",
                background: accent,
              }}
            />
            {url}
          </div>
          <div
            style={{
              fontFamily: "Roboto Mono",
              fontSize: 19,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: KICKER,
            }}
          >
            {eyebrow}
          </div>
        </div>

        {/* Body — title left-aligned, vertically centered in the space
            between masthead and baseline. */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Title lines rendered explicitly so the wrap is deliberate;
              tight leading stacks them like a set headline. */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {titleLines.map((line, i) => (
              <div
                key={`title-${i}`}
                style={{
                  fontSize: titleSize,
                  lineHeight: 0.98,
                  letterSpacing: "-0.015em",
                  color: INK,
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Short neutral rule between title and subtitle — kept
              off-accent so the green stays a single gesture. */}
          <div
            style={{
              width: 72,
              height: 2,
              background: HAIRLINE,
              margin: "30px 0 26px",
            }}
          />

          <div
            style={{
              fontSize: 34,
              lineHeight: 1.24,
              color: INK_MUTED,
              maxWidth: 860,
              display: "flex",
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Baseline — a faint full-width rule that frames the card like a
            printed page and echoes the masthead above. */}
        <div style={{ height: 2, background: BASELINE }} />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Instrument Serif", data: instrumentSerif, style: "normal", weight: 400 },
        { name: "Roboto Mono", data: robotoMono, style: "normal", weight: 400 },
      ],
    },
  );
}
