// ─────────────────────────────────────────────────────────────────
// Banner layout — minimal wrapper for chrome-free banner routes.
//
// The root layout's ChromeGate already hides Nav and Footer on any
// /banner/* path, so this layout's only job is to neutralize the
// page padding/margin that other site pages inherit and to keep the
// banner content flush to the top-left of the viewport for clean
// screenshot capture.
//
// The dark palette is forced here regardless of system preference
// because the banner is calibrated for black — LinkedIn renders the
// banner on the visitor's profile chrome, so a dark export keeps the
// design feeling intentional rather than "page in light mode".
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LinkedIn Banner—Malcolm Xavier",
  // Banners are export artifacts, not navigational destinations.
  // Keep them out of search indexes and link previews.
  robots: { index: false, follow: false },
  // Explicit canonical so the inherited "/" canonical doesn't ride
  // along with the noindex (contradictory signal even if harmless
  // under noindex). Closes m-banner-canonical-noindex from the
  // 2026-04-29 /full-review.
  alternates: {
    canonical: "/banner/linkedin",
  },
};

export default function BannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Re-pin the semantic design tokens to their dark-palette values
    // for this whole subtree. We can't rely on data-theme="dark"
    // because next-themes sets data-theme on <html>, and CSS variable
    // inheritance from the html element wins over a child div with
    // a different data-theme attribute (the rules are scoped to
    // [data-theme="dark"] / :root, not to arbitrary descendants).
    //
    // Forcing the dark palette here means a recruiter viewing the
    // banner page in light-mode preference still sees the design as
    // calibrated, and screenshot exports are deterministic.
    <div
      style={
        {
          // Force the DARK palette regardless of the visitor's
          // system preference. Banner is calibrated for black.
          //
          // We use foundation/grey primitives directly because the
          // --neutral-* aliases the rest of the site uses are scoped
          // to [data-subbrand="..."] blocks in globals.css and don't
          // resolve on chrome-free routes. The foundation tokens are
          // defined at the true :root and always resolve.
          background: "var(--foundation-black)",
          "--surface-page": "var(--foundation-black)",
          "--text-body": "var(--foundation-white)",
          "--text-heading": "var(--foundation-white)",
          "--text-caption": "var(--grey-300)",
          "--text-action": "var(--purple-400)",
          // Divider color — punched up from the default grey-50
          // hairline (which would vanish on black) to grey-600,
          // visible but quiet against the dark background.
          "--border-default": "var(--grey-600)",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
