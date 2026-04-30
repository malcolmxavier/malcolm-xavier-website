// ─────────────────────────────────────────────────────────────────
// BackToPlaylists — small mono link at the top of the detail page.
//
// Behavior:
//   - Click with ?from=music in the URL: navigates back via browser
//     history. The query param is added by MusicShell's PlaylistCard
//     when the user clicks into a playlist from the grid, so this
//     branch only fires on actual in-app navigation. Combined with
//     MusicShell's URL state for `view` and `page`, this restores
//     the exact paginated state the user was looking at.
//   - Click without ?from=music (direct entry, shared/bookmarked
//     URL, deep link): push to /music with a clean URL. The earlier
//     `window.history.length > 1` heuristic was unreliable — even
//     a tab opened directly to the detail page typically has length
//     2 because of the preceding about:blank.
//   - Default <a href="/music"> means middle-click + JS-disabled
//     users still get a working "back to grid" link.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function BackToPlaylists() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMusic = searchParams.get("from") === "music";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let modifier-clicks (cmd-click, ctrl-click, middle-click) pass
    // through to the browser as "open in new tab" — those users want
    // the explicit /music URL, not back navigation.
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
    if (fromMusic) {
      router.back();
    } else {
      router.push("/music");
    }
  };

  return (
    <a
      href="/music"
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
      ← All playlists
    </a>
  );
}
