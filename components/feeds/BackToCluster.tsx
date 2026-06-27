// ─────────────────────────────────────────────────────────────────
// BackToCluster — the shared "← All {cluster}" link at the top of a
// detail page (and the watching page). Generalized from the old
// per-cluster BackToTelevision / BackToFilms, which had diverged: TV
// pushed to the source listing, films called router.back(). They now
// converge on the push model because multi-hop neighbour browsing breaks
// router.back() (it walks one detail page at a time instead of returning
// to the listing).
//
// Behaviour:
//   1. Pushes to the source listing URL carried in `?from=` (with a
//      `#grid` anchor so the listing lands at its grid row, not the
//      hero). NOT router.back() — see above. Exact scroll position is
//      restored separately by useScrollRestoration on the listing.
//   2. Keeps `?from=` in the URL after mount (the detail page's
//      adjacent-title nav reads it every render); strips only `?ref=`,
//      a pure back-nav signal with no other consumer.
//   3. No `from` (direct entry / shared / bookmarked URL) → pushes to the
//      cluster's default listing.
//
// The default <a href> is the fallback listing too, so middle-click and
// no-JS users get a working link.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Append `#grid` to a URL, replacing any existing hash. Lets every
 *  "back to listing" affordance land at the grid row (the grid wrapper
 *  carries id="grid" + scroll-margin-top to clear the sticky nav). */
function withGridAnchor(href: string): string {
  const hashIdx = href.indexOf("#");
  return hashIdx === -1 ? `${href}#grid` : `${href.slice(0, hashIdx)}#grid`;
}

export function BackToCluster({
  fallbackHref,
  label,
}: {
  /** Cluster default listing, used when there's no `?from=`. */
  fallbackHref: string;
  /** Visible link text, e.g. "← All films". */
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const from = searchParams.get("from");
  // Cache the from URL once: the strip below removes `?ref=`, after which
  // useSearchParams would no longer see the params — but `from` (which we
  // intentionally keep) stays, and this ref keeps the click target stable.
  // Only accept an absolute-path `from` (must start with "/") so a stray /
  // legacy value (e.g. the pre-rename `?from=films`) can't produce a
  // relative push — it falls back to the cluster default instead.
  const arrivedFromHref = useRef(from && from.startsWith("/") ? from : null);

  useEffect(() => {
    // Strip `?ref=` only — it's a back-nav signal with no use past mount.
    // `from` stays: the detail page reads it on every render for
    // adjacent-title nav. replace (not push) keeps history intact.
    if (ref === null) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ref");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [ref, pathname, router, searchParams]);

  const dest = withGridAnchor(arrivedFromHref.current ?? fallbackHref);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let modifier-clicks fall through to "open in new tab."
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    // Always push to the listing (never router.back()) so multi-hop
    // neighbour browsing returns to the original listing, not the
    // previous detail page. useScrollRestoration restores the exact
    // scroll on arrival; the #grid anchor is the no-saved-position
    // fallback.
    router.push(dest);
  };

  return (
    <a
      href={dest}
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
        // Pad the target to clear the 24×24 SC 2.5.8 floor without
        // shifting the text baseline (12px font / 18px line-height +
        // 3px top/bottom = 24px). inline-block keeps the focus ring
        // hugging the text.
        paddingBlock: "3px",
        display: "inline-block",
      }}
      className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
    >
      {label}
    </a>
  );
}
