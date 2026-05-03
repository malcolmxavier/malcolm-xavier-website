// ─────────────────────────────────────────────────────────────────
// BackToFilms — small mono link at the top of /films/[slug].
//
// Behavior:
//   - Click with ?ref=internal (or legacy ?from=films) in the URL:
//     navigates back via browser history. The query param is added
//     by FilmCard's NextLink when the user clicks into a detail
//     page from the grid. Combined with the URL state for filter +
//     page, this restores the exact slice of the grid the user was
//     looking at.
//   - Click without an internal-ref marker (direct entry, shared
//     or bookmarked URL, deep link): push to /films with a clean
//     URL.
//   - Default <a href="/films"> means middle-click + JS-disabled
//     users still get a working "back to grid" link.
//
// We also strip the marker from the URL via router.replace on mount
// so any link the user shares from the detail page comes out clean
// — `?ref=internal` is meta-state for back-nav, not part of the
// content URL. Using replace (not push) means History stays intact:
// the previous /films?<filters>&page=N entry is still there for
// router.back() when the user does click "All films."
//
// Pattern mirrors BackToPlaylists in /music/[playlistId].
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function BackToFilms() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const from = searchParams.get("from");
  // Capture once on first render. Once we strip the params from the
  // URL, the searchParams hook will see them gone — so we cache the
  // arrived-via-internal signal in a ref to keep the back-nav
  // behavior intact for the lifetime of the page.
  const arrivedInternal = useRef(ref === "internal" || from === "films");

  // Strip the meta-state markers from the URL so a copy/paste of
  // the current page comes out clean. router.replace doesn't add a
  // history entry — the prior /films?<filters>&page=N stays at the
  // top of the back stack.
  useEffect(() => {
    if (ref === null && from === null) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ref");
    params.delete("from");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [ref, from, pathname, router, searchParams]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Modifier-clicks pass through to the browser as "open in new
    // tab" — those users want the explicit /films URL, not back nav.
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
    if (arrivedInternal.current) {
      router.back();
    } else {
      router.push("/films");
    }
  };

  return (
    <a
      href="/films"
      onClick={handleClick}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        // --text-action is the semantic alias for "interactive
        // foreground in the active sub-brand cluster." Using
        // --primary-default here is a literal-color reference that
        // skips the alias layer — fine in practice (both resolve
        // to the same orange today) but it freezes the link's
        // color at the raw orange instead of riding the alias if
        // the cluster ever rebinds it.
        color: "var(--text-action)",
        textDecoration: "none",
        outlineColor: "var(--border-focus)",
      }}
      className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
    >
      ← All films
    </a>
  );
}
