// ─────────────────────────────────────────────────────────────────
// BackToTelevision — small mono link at the top of /television/
// watching and /television/[showSlug].
//
// Diverges from BackToFilms in two important ways:
//
//   1. Always pushes to the source listing URL (carried in the
//      `?from=` param) rather than calling router.back(). Reason:
//      multi-hop browsing — clicking "Older review" walks the
//      history one step deeper, so router.back() returns to the
//      previous detail page, not to the listing the user
//      originally came from. router.push(fromHref) gives a
//      consistent "always lands on the listing" experience.
//
//   2. Keeps `?from=` in the URL after mount. The detail page's
//      adjacent-show navigation reads `from` to compute filter-
//      aware neighbors; if we strip it on mount, the server
//      re-renders with no `from`, neighbor links lose their
//      context, and multi-hop navigation falls back to default
//      ordering. Stripping `?ref=` is fine — that's a pure back-
//      nav signal with no consumer beyond this component.
//
// The shared-URL trade-off: a user who copies the URL bar mid-
// browse will share `/television/<slug>?from=<encoded-listing>`.
// That's fine — the recipient inherits the same adjacent-show
// context, which is arguably more useful than landing on a
// context-free detail page.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Append `#grid` to a URL, splicing in front of any existing
 * hash. Mirrors the helper in AllOrWatchingToggle so all
 * "All Television" affordances (the back-link here + the
 * toggle on the listings) share one anchor convention. Inlined
 * rather than imported because the helper is small and a
 * shared utility module wouldn't earn its weight.
 */
function withGridAnchor(href: string): string {
  const hashIdx = href.indexOf("#");
  if (hashIdx === -1) return `${href}#grid`;
  return `${href.slice(0, hashIdx)}#grid`;
}

export function BackToTelevision() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const from = searchParams.get("from");
  // Cache the from URL once so the back link continues to work
  // even after the strip below removes `?ref=` from the URL. The
  // strip doesn't touch `from` — see the file header for why.
  const arrivedFromHref = useRef(from);

  useEffect(() => {
    // Strip `?ref=` only — the back-nav signal isn't useful past
    // mount. `from` stays in the URL because the detail page's
    // adjacent-show navigation reads it on every render.
    if (ref === null) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ref");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [ref, pathname, router, searchParams]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Modifier-clicks pass through as "open in new tab" — those
    // users want the explicit fallback URL.
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    ) {
      return;
    }
    e.preventDefault();
    // Always push to the source listing URL when we have one. No
    // router.back() — that walks browser history one step, which
    // returns to the previous detail page in multi-hop flows
    // rather than to the original listing.
    //
    // #grid anchor: tells the destination listing to scroll to
    // its grid row (matches the AllOrWatchingToggle's anchor
    // pattern), so the user lands at the same context level
    // they navigated from rather than the page hero. The grid
    // wrapper carries `id="grid"` + scroll-margin-top so the
    // landing point clears the sticky site nav.
    const dest = arrivedFromHref.current ?? "/television/reviews";
    router.push(withGridAnchor(dest));
  };

  // Default href reflects the click target — when `from` is
  // present, middle-clicks / no-JS users land on the source
  // listing too; otherwise the cluster root. Both carry #grid
  // so non-JS navigation lands at the grid as well.
  const fallbackHref = withGridAnchor(
    arrivedFromHref.current ?? "/television/reviews",
  );

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-action)",
        textDecoration: "none",
        outlineColor: "var(--border-focus)",
        // Pad the click target to clear the 24×24 SC 2.5.8 floor.
        // Text is ~18px tall (12px font / 18px line-height); 3px
        // top + 3px bottom = 24px total without changing the text
        // baseline. Inline-block keeps the rounded-sm radius on
        // the visible target so focus rings still hug the text.
        paddingBlock: "3px",
        display: "inline-block",
      }}
      className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
    >
      ← All television
    </a>
  );
}
