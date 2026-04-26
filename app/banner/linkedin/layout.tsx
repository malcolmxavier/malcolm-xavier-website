// ─────────────────────────────────────────────────────────────────
// Banner layout — minimal wrapper for chrome-free banner routes.
//
// The root layout's ChromeGate already hides Nav and Footer on any
// /banner/* path, so this layout's only job is to neutralize the
// page padding/margin that other site pages inherit and to keep the
// banner content flush to the top-left of the viewport for clean
// screenshot capture.
//
// Light mode is forced here regardless of system preference because
// LinkedIn renders banners on a neutral background and the banner is
// designed for the light palette.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LinkedIn Banner — Malcolm Xavier",
  // Banners are export artifacts, not navigational destinations.
  // Keep them out of search indexes and link previews.
  robots: { index: false, follow: false },
};

export default function BannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Re-pin the semantic design tokens to their light-mode values
    // for this whole subtree. We can't rely on data-theme="light"
    // because next-themes sets data-theme on <html>, and CSS variable
    // inheritance from the html element wins over a child div with
    // a different data-theme attribute (the rules are scoped to
    // [data-theme="dark"] / :root, not to arbitrary descendants).
    //
    // Forcing the light palette here means a recruiter viewing the
    // banner page in dark-mode preference still sees the design as
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
