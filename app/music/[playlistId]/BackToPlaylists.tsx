// ─────────────────────────────────────────────────────────────────
// BackToPlaylists — small mono link at the top of the detail page.
//
// Behavior:
//   - Click: navigates back via browser history. Combined with
//     MusicShell's URL state for `view` and `page`, this restores
//     the exact paginated state the user was looking at when they
//     clicked into the playlist.
//   - Direct entry (no in-app history, e.g. shared/bookmarked URL):
//     fall back to navigating to /music. Detected via
//     window.history.length <= 1.
//   - Default <a href="/music"> means middle-click + JS-disabled
//     users still get a working "back to grid" link.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useRouter } from "next/navigation";

export function BackToPlaylists() {
  const router = useRouter();

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
    if (window.history.length > 1) {
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
      }}
      className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
    >
      ← All playlists
    </a>
  );
}
