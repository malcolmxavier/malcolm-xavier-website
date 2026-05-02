// ─────────────────────────────────────────────────────────────────
// BackToFilms — small mono link at the top of /films/[slug].
//
// Behavior:
//   - Click with ?from=films in the URL: navigates back via browser
//     history. The query param is added by FilmCard's NextLink when
//     the user clicks into a detail page from the grid (added in a
//     follow-up commit alongside this component). Combined with the
//     URL state for filter + page, this restores the exact slice
//     of the grid the user was looking at.
//   - Click without ?from=films (direct entry, shared/bookmarked
//     URL, deep link): push to /films with a clean URL.
//   - Default <a href="/films"> means middle-click + JS-disabled
//     users still get a working "back to grid" link.
//
// Pattern mirrors BackToPlaylists in /music/[playlistId].
// ─────────────────────────────────────────────────────────────────

"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function BackToFilms() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromFilms = searchParams.get("from") === "films";

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
    if (fromFilms) {
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
        color: "var(--primary-default)",
        textDecoration: "none",
        outlineColor: "var(--border-focus)",
      }}
      className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
    >
      ← All films
    </a>
  );
}
