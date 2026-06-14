// ─────────────────────────────────────────────────────────────────
// BackLink — the cluster back-navigation chrome, matching the
// /television/watching design: a mono, uppercase, sub-brand-accent link
// in a padded row above the hero. Unlike BackToTelevision/BackToFilms
// (smart detail→listing links that replay the source URL), this points at
// a FIXED destination — used by the collections hub (→ cluster landing)
// and the per-collection leaves (→ collections hub).
//
// Server component: a plain <NextLink>; the hover/focus affordances are
// CSS, so no client JS is needed. Styling is copied verbatim from
// BackToTelevision so the two read identically across the cluster.
// ─────────────────────────────────────────────────────────────────

import NextLink from "next/link";
import type { ReactNode, CSSProperties } from "react";

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        paddingTop: "var(--scale-600)",
        paddingBottom: "var(--scale-400)",
      }}
    >
      <NextLink
        href={href}
        style={linkStyle}
        className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
      >
        {children}
      </NextLink>
    </div>
  );
}

const linkStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-xs-font-size)",
  lineHeight: "var(--p-xs-line-height)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-action)",
  textDecoration: "none",
  outlineColor: "var(--border-focus)",
  // 3px block padding clears the 24px SC 2.5.8 target floor without
  // shifting the baseline (matches BackToTelevision).
  paddingBlock: "3px",
  display: "inline-block",
};
