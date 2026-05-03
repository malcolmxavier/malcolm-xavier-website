// ─────────────────────────────────────────────────────────────────
// CriticDisclaimer — cheeky footer note shown on every critical-
// review surface (films today, TV next, future review surfaces).
//
// Reframes the rating distribution: low ratings shouldn't read as
// hostility. Italic serif voice (matches the Footer's other
// editorial line, "Built in Los Angeles, edited at hours that
// should embarrass me.") keeps it from reading like legal chrome.
//
// Single source of truth for the disclaimer copy across review
// surfaces. Add a new path to CRITIC_ROUTE_PREFIXES when a new
// review-driven sub-brand ships.
//
// Client component — uses usePathname so the Footer itself can
// stay server-rendered. Returns null off review surfaces.
// ─────────────────────────────────────────────────────────────────

"use client";

import { usePathname } from "next/navigation";

/**
 * URL path prefixes that surface Malcolm-as-critic content. Films
 * lives here today; TV (Serializd-backed, also pulls TMDB metadata)
 * lands next. Append future review surfaces to this list rather than
 * forking the component.
 */
export const CRITIC_ROUTE_PREFIXES = ["/films", "/tv"] as const;

export function CriticDisclaimer() {
  const pathname = usePathname();
  if (!isCriticRoute(pathname)) return null;

  return (
    <p
      className="italic-kern"
      style={{
        fontFamily: "var(--font-primary)",
        fontStyle: "italic",
        fontSize: "var(--p-sm-font-size)",
        lineHeight: "var(--p-sm-line-height)",
        color: "var(--text-caption)",
        margin: 0,
        // text-wrap: balance lets the browser pick the cleanest
        // line breaks for the available width — replaces the
        // manual <br /> that used to force a desktop-only split
        // at "...shouldn't be / misconstrued" and produced a
        // three-line wrap on mid-range viewports. maxWidth keeps
        // the disclaimer from sprawling on ultra-wide layouts.
        maxWidth: "80ch",
        textWrap: "balance",
      }}
    >
      Most art is spiritually 5-star and should be celebrated. My
      taste shouldn&rsquo;t be misconstrued as disparaging, even
      when the opinion is critical.
    </p>
  );
}

/** Exported so TmdbAttribution can match the same surfaces without
 *  duplicating the prefix list. */
export function isCriticRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return CRITIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
