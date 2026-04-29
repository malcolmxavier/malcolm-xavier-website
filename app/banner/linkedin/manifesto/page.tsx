// ─────────────────────────────────────────────────────────────────
// LinkedIn manifesto banner — exact 1584×396px.
//
// The second banner in the LinkedIn Premium 5-banner carousel.
// Where /banner/linkedin (metrics) is data-forward and credentialing,
// this one is voice-forward: a single editorial statement, no
// numbers, no decoration competing with the typography.
//
// Voice line: "Senior product manager, with an artist's eye." — the
// same positioning that lives in the site's <meta description>, set
// in two lines with italic on the second so the modifier feels like
// a quiet aside rather than a strapline.
//
// LinkedIn safe zones honored:
//
//   - The desktop avatar overlaps the lower-left ~256×200px of the
//     banner. The headline is centered horizontally — its leftmost
//     character lands at ~x=264 on the longer line, just clearing
//     the avatar zone.
//   - LinkedIn's mobile crop shows the centered ~876px. Both lines
//     overflow that on the edges, but the visual hierarchy survives:
//     even cropped to the center, "product manager, / with an artist's"
//     reads through as the load-bearing fragment.
//
// Inherits dark palette + chrome-free chrome from the parent layout
// at /app/banner/linkedin/layout.tsx (no separate layout needed).
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import {
  BANNER_HEIGHT,
  BANNER_WIDTH,
  BOTTOM_DOTS,
  DotBand,
  TOP_DOTS,
} from "../dots";

export const metadata: Metadata = {
  title: "LinkedIn Banner—Manifesto · Malcolm Xavier",
  robots: { index: false, follow: false },
};

/**
 * The manifesto banner — Instrument Serif headline carries the
 * meaning; the shared sub-brand dot bands tie this banner visually
 * to the metrics variant so the carousel reads as one family.
 */
function Banner() {
  return (
    <div
      role="img"
      aria-label="Senior product manager, with an artist's eye."
      style={{
        position: "relative",
        width: BANNER_WIDTH,
        height: BANNER_HEIGHT,
        background: "var(--surface-page)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <DotBand dots={TOP_DOTS} />
      <DotBand dots={BOTTOM_DOTS} />

      {/* Headline block. Two lines, centered. Inline-styled so the
          font sizing is exact pixels (the responsive type scale
          would otherwise shift this between breakpoints — bad for
          a fixed-export image). */}
      <div
        style={{
          fontFamily: "var(--font-primary)",
          fontSize: 104,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: "var(--text-heading)",
          textAlign: "center",
        }}
      >
        <span style={{ display: "block" }}>Senior product manager,</span>
        <span className="italic-kern" style={{ display: "block", fontStyle: "italic" }}>
          with an artist&rsquo;s eye.
        </span>
      </div>
    </div>
  );
}

export default function ManifestoBannerPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--grey-100)",
        padding: "24px 24px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Info strip — same pattern as /banner/linkedin so both pages
          feel like they belong to the same export tool. */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.06em",
          color: "var(--grey-800)",
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 16px",
          alignItems: "baseline",
          maxWidth: "min(100%, 880px)",
        }}
      >
        <span style={{ fontWeight: 600 }}>1584 × 396 px</span>
        <span>LinkedIn banner spec (4:1) · Manifesto variant</span>
        <span style={{ color: "var(--grey-700)" }}>
          · Banner is wider than your viewport on screens &lt;1584px —
          scroll → to view, or zoom out (Cmd −).
        </span>
        <span style={{ color: "var(--grey-700)" }}>
          · Export: right-click banner → Capture node screenshot.
        </span>
      </div>

      <Banner />
    </div>
  );
}
