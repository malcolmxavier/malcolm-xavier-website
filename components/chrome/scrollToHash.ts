// ─────────────────────────────────────────────────────────────────
// scrollToHash — shared in-page anchor scrolling for the TOC family
// (the sticky TableOfContents rail and the mobile TocDisclosure).
//
// Centralizes three behaviors both TOC surfaces need, so they can't
// drift apart:
//   • Honor prefers-reduced-motion. The CSS reduced-motion media query
//     does NOT apply to the JS scrollIntoView / scrollTo APIs, so the
//     preference is read explicitly via matchMedia and the scroll is
//     made instant when reduce is set.
//   • Keep the URL hash in sync without triggering the browser's own
//     instant jump (which would fight the smooth scroll).
//   • Treat the magic "#top" fragment as "scroll to the top of the
//     document" even when no element has id="top" — matching the HTML
//     spec's special-case — so a "Back to top" link needs no sentinel.
//
// Returns true when a target was found and handled (the caller should
// then preventDefault on the click), false when no matching element
// exists (let the browser fall back to its default anchor behavior).
// ─────────────────────────────────────────────────────────────────

export function scrollToHash(href: string): boolean {
  const id = href.replace(/^#/, "");
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const behavior: ScrollBehavior = reduceMotion ? "instant" : "smooth";

  // "#top" with no matching element: scroll to page top per the spec,
  // and drop the hash so the URL returns to the bare page path.
  if (id === "top" && !document.getElementById("top")) {
    window.scrollTo({ top: 0, behavior });
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    return true;
  }

  const el = document.getElementById(id);
  if (!el) return false;
  // Each section carries scroll-margin-top so the jump lands below the
  // fixed Nav rather than behind it.
  el.scrollIntoView({ behavior, block: "start" });
  if (typeof window !== "undefined" && window.history?.replaceState) {
    window.history.replaceState(null, "", href);
  }
  return true;
}
