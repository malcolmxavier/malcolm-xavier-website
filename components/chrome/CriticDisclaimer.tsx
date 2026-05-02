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
        // 80ch fits line 1 ("...My taste shouldn't be" ~78ch) on
        // a single line so the manual <br /> below produces a
        // visibly even two-line break. On viewports narrower than
        // ~80ch the natural CSS wrap takes over and the two halves
        // each wrap as needed.
        maxWidth: "80ch",
      }}
    >
      Most art is spiritually 5-star and should be celebrated. My
      taste shouldn&rsquo;t be
      {/* Editorial line break — splits the sentence at "...be /
          misconstrued" so the two lines read as roughly even visual
          weight on desktop. */}
      <br />
      misconstrued as disparaging, even when the opinion is critical.
    </p>
  );
}

/** Exported so TmdbAttribution can match the same surfaces without
 *  duplicating the prefix list. */
export function isCriticRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return CRITIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
