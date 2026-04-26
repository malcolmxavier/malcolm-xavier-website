// ─────────────────────────────────────────────────────────────────
// LinkedIn banner — exact 1584×396px (LinkedIn's spec for the
// profile cover image, 4:1 ratio).
//
// What's on the canvas:
//
//   1. Two horizontal "dot bands" (top + bottom) of small colored
//      dots. The 7 colors map 1:1 to the 7 sub-brands defined in
//      the design system (Newsletter → green, Film → orange,
//      TV → blue, Music → purple, Podcast → pink, Games → red,
//      Books → yellow). The dots quietly telegraph the breadth of
//      Malcolm's sub-brand architecture without naming it.
//
//   2. Four metrics in a row, vertically centered. Each metric has:
//        - a large Instrument Serif numeral
//        - a DM Sans uppercase label below
//      The metrics cross-reference numbers in the resume page so
//      banner copy doesn't drift from /resume.
//
// LinkedIn safe zones honored:
//
//   - The desktop avatar overlaps the lower-left ~256×200px of the
//     banner. Metric grid + bottom dot band both start at x ≥ 288
//     to clear that zone.
//   - LinkedIn's mobile crop shows the centered ~876px. All four
//     metrics fall inside the central ~1000px so nothing critical
//     gets cropped on phones.
//
// Export workflow (cleanest result, no dev-tooling artifacts):
//
//   1. npm run dev
//   2. Open http://localhost:<port>/banner/linkedin in Chrome
//   3. Open DevTools → Elements panel
//   4. Find the <div role="img" aria-label="Malcolm Xavier — Senior
//      Product Manager…"> element (the banner itself)
//   5. Right-click that element → "Capture node screenshot"
//   6. Browser downloads a pixel-perfect 1584×396 PNG of just the
//      banner — no Next.js dev indicator, no surrounding padding
//   7. Upload to LinkedIn → Profile → camera icon on banner
//
// (If you'd rather full-page screenshot: run `npm run build &&
// npm run start` first so dev-only overlays are gone, then use
// DevTools → Cmd+Shift+P → "Capture full size screenshot".)
//
// ─────────────────────────────────────────────────────────────────

import {
  BANNER_HEIGHT,
  BANNER_WIDTH,
  BOTTOM_DOTS,
  DotBand,
  TOP_DOTS,
} from "./dots";

// The 4 metrics. Numbers are cross-referenced against the resume
// (app/resume/resume-data.tsx) so the banner doesn't drift from
// what the resume itself claims:
//
//   33% YoY growth — email/lifecycle revenue, recent role
//   2× LTV         — content-specific newsletter program
//   22M+ users     — MarTech platform reach at People Inc.
//   40+ brands     — same People Inc. portfolio, breadth angle
//
// Labels are punchy uppercase verbs/nouns in DM Sans. (Earlier
// drafts also carried mono "eyebrow" kickers above each numeral
// but they read as redundant noise next to the labels — removed.)
const METRICS = [
  { numeral: "33%", label: "YoY Revenue Growth" },
  { numeral: "2×", label: "User LTV" },
  { numeral: "22M+", label: "Users Reached" },
  { numeral: "40+", label: "Brands Powered" },
] as const;

/**
 * The banner itself — fixed at LinkedIn's spec dimensions of
 * 1584×396px. This is what gets exported via DevTools "Capture node
 * screenshot" — the dimensions stay constant regardless of viewport.
 */
function Banner() {
  return (
    <div
      role="img"
      aria-label="Malcolm Xavier — Senior Product Manager. 33% year-over-year revenue growth, 2x user lifetime value, 22 million plus users reached, 40 plus brands powered."
      style={{
        position: "relative",
        width: BANNER_WIDTH,
        height: BANNER_HEIGHT,
        background: "var(--surface-page)",
        overflow: "hidden",
      }}
    >
      <DotBand dots={TOP_DOTS} />
      <DotBand dots={BOTTOM_DOTS} />

      {/* Metric grid. Starts at x=288 to clear the desktop avatar
          overlap zone in the lower-left. Right margin of 80px keeps
          the rightmost metric from kissing the edge. */}
      <div
        style={{
          position: "absolute",
          left: 288,
          right: 80,
          top: 50,
          bottom: 50,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          alignItems: "center",
        }}
      >
        {METRICS.map((m, i) => (
          <div
            key={m.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              // Vertical divider between cells (skip the first).
              // 2px and a punched-up grey reads against the dark
              // background — the previous 1px hairline disappeared.
              borderLeft:
                i > 0 ? "2px solid var(--border-default)" : "none",
              padding: "12px 24px",
              height: "100%",
            }}
          >
            {/* Inline-styled instead of using <Display> because the
                banner needs an exact pixel size that doesn't shift
                with the responsive type scale. */}
            <div
              style={{
                fontFamily: "var(--font-primary)",
                fontSize: 108,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "var(--text-heading)",
              }}
            >
              {m.numeral}
            </div>
            <div
              style={{
                fontFamily: "var(--font-secondary)",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-body)",
                whiteSpace: "nowrap",
              }}
            >
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LinkedInBannerPage() {
  return (
    // Page wraps the banner in a scrollable area with an info strip
    // above. The info strip clarifies that the banner's 1584×396
    // dimensions are LinkedIn's official spec — overflowing the
    // viewport is expected on screens narrower than 1584px.
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
      {/* Info strip — clarifies the dimensions and how to export.
          Stays on screen in the visible viewport regardless of
          banner overflow because the page itself is the scroll
          container, not this strip. */}
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
        <span>LinkedIn banner spec (4:1)</span>
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
