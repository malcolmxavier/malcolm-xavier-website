// ─────────────────────────────────────────────────────────────────
// AllOrWatchingToggle — sits above the /television grid and the
// /television/watching grid. Two-state navigation control:
//
//   • All     → /television (the completed-review listing,
//                inheriting any current query string filters)
//   • Watching → /television/watching (the in-progress offshoot)
//
// Visually mirrors /music's All/Collections display toggle:
// fieldset+legend grouping for SR, mono uppercase labels with
// a 2px sub-brand underline on the active state, and a quiet
// caption color on inactive. Same WCAG 2.5.8 target-size posture
// (>=24px tall before the underline counts as part of the chip).
//
// Implementation note: each option renders a NextLink rather than
// a button-with-onClick — these are real route changes, so we
// want crawlable hrefs, middle-click + ⌘-click semantics, and
// browser-history correctness for free. The /music shell's
// ToggleButton uses buttons because its modes are in-shell view
// state (?view=collections), not separate routes.
// ─────────────────────────────────────────────────────────────────

"use client";

import NextLink from "next/link";
import type { ReactNode } from "react";
import { track } from "@vercel/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

type Active = "all" | "watching";
type Surface = "listing" | "genre" | "watching";

// Anchor convention: the "All" link appends `#grid` so a user
// switching back from /watching lands at the grid row rather than
// the top of the listing page (they've already seen that hero).
// The "Watching" link deliberately omits the anchor — entering
// /watching is a fresh-context navigation, and the page's hero
// ("What I'm mid-watch on right now.") frames what the user is
// about to see. Skipping the hero on first visit would strip
// that framing.
//
// BackToTelevision (the detail-page back-link) carries the same
// `#grid` convention since it's always a *return* to a previously-
// visited listing, never a fresh entry.

/** Append `#grid` to a URL, splicing in front of any existing
 *  hash. Defensive — current call sites don't pass hashes, but
 *  keeps the helper safe if a future variant does. */
function withGridAnchor(href: string): string {
  const hashIdx = href.indexOf("#");
  if (hashIdx === -1) return `${href}#grid`;
  return `${href.slice(0, hashIdx)}#grid`;
}

export function AllOrWatchingToggle({
  active,
  watchingCount,
  /**
   * When mounted from a route that should preserve query-string
   * filters on the "All" link (e.g. clicking "All" from a
   * filtered /television view should keep the filter context),
   * pass the relative URL here. Falls back to plain "/television"
   * — appropriate from /television/watching where there are no
   * filters to carry forward.
   */
  allHref = "/television",
  /**
   * Surface label for WATCHING_TAB_CLICK analytics. Names the
   * page the toggle is mounted on so the dashboard can read which
   * surface drives engagement with the watching offshoot:
   *   - "listing" (default) — /television
   *   - "genre"             — /television/genre/<slug>
   *   - "watching"          — /television/watching itself
   */
  from = "listing",
}: {
  active: Active;
  /** Surfaced as a parenthetical count next to "Watching" so the
   *  toggle communicates how much is on the other side. Hidden
   *  when zero so the inactive label doesn't read as empty. */
  watchingCount: number;
  allHref?: string;
  from?: Surface;
}) {
  return (
    <fieldset
      className="flex items-center gap-6"
      style={{ border: 0, padding: 0, margin: 0 }}
    >
      <legend className="sr-only">Television view</legend>
      {/* "All" appends #grid (return-to-grid behavior); "Watching"
          omits the anchor so a fresh entry sees the hero framing.
          See the rationale comment on withGridAnchor above. */}
      <ToggleLink
        href={withGridAnchor(allHref)}
        active={active === "all"}
        from={from}
        to="all"
      >
        All
      </ToggleLink>
      <ToggleLink
        href="/television/watching"
        active={active === "watching"}
        from={from}
        to="watching"
      >
        Watching{watchingCount > 0 ? ` (${watchingCount})` : ""}
      </ToggleLink>
    </fieldset>
  );
}

function ToggleLink({
  href,
  active,
  children,
  from,
  to,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  from: Surface;
  to: Active;
}) {
  return (
    <NextLink
      href={href}
      onClick={() =>
        track(ANALYTICS_EVENTS.WATCHING_TAB_CLICK, { from, to })
      }
      // aria-current names the active route for AT users — the
      // visual underline is decorative; this is the semantic
      // signal. "page" is the spec-correct value for "this is
      // the current page in a navigation set."
      aria-current={active ? "page" : undefined}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: active ? "var(--text-action)" : "var(--text-caption)",
        textDecoration: "none",
        // 4px vertical padding keeps the link >= 24px tall before
        // the underline (matches /music's WCAG 2.5.8 posture).
        padding: "4px 0",
        borderBottom: active
          ? "2px solid var(--text-action)"
          : "2px solid transparent",
        outlineColor: "var(--border-focus)",
      }}
      className="transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {children}
    </NextLink>
  );
}
