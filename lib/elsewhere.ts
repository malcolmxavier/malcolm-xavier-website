// ─────────────────────────────────────────────────────────────────
// "Elsewhere on the internet" — the cultural rail of platforms
// where Malcolm posts publicly. Same set surfaces in two places
// today (Footer + Contact page); this module centralizes them so
// a URL change is one edit, not two. Closes m-elsewhere-duplicated
// from the 2026-04-29 /full-review.
//
// Substack and StoryGraph are intentionally excluded until URLs
// are confirmed and the matching sub-brand pages ship.
//
// Per the "no handles on platform links" rule, the visible label
// is the platform name only; href carries the actual handle.
// ─────────────────────────────────────────────────────────────────

export type ElsewhereLink = {
  label: string;
  href: string;
};

export const ELSEWHERE: readonly ElsewhereLink[] = [
  { label: "Letterboxd", href: "https://letterboxd.com/malxavi/" },
  {
    label: "Serializd",
    href: "https://www.serializd.com/user/malxavi/profile",
  },
  { label: "Spotify", href: "https://open.spotify.com/user/malcolmxevans" },
];
