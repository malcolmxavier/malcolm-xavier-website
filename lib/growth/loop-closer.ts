// ─────────────────────────────────────────────────────────────────
// Share-loop closer — resolution logic.
//
// The ShareBar is the *outbound* arc of the share loop: an existing
// visitor hands a page to someone new, tagging the link with
// `utm_medium=share` (see lib/share/build-share-url.ts). A visitor who
// arrives on one of those links is the warmest inbound segment the site
// gets — someone vouched for the content personally.
//
// This module decides whether that warm arrival should be met with a
// "follow along" nudge, and if so, which platform to point them at. It
// is deliberately a PERSONAL-only surface:
//
//   • Case-study (professional) pages already close their own loop —
//     every one ends with a journey-staged exit ramp (résumé primary,
//     Calendly secondary, next-study nav), all instrumented. A nudge
//     card there would duplicate a CTA the reader hits organically and
//     interrupt the one audience you least want to pop-up. So the
//     professional cluster is intentionally excluded here.
//
//   • The film / TV / music clusters have no equivalent exit ramp — a
//     detail page ends on the next review, not a "keep up with me"
//     hook. That is the real loop leak, and it is exactly where a warm
//     share-arrival earns a next step.
//
// The nudge closes into "follow, don't subscribe": it routes to the
// platform where Malcolm already posts publicly (from lib/elsewhere.ts),
// matched to the cluster the visitor arrived on. No email, no backend,
// no consent surface, zero PII — it only reads UTM params already in the
// URL. Emphasis-aware, one level deeper than the ShareBar itself: a film
// share closes into Letterboxd, a music share into Spotify.
// ─────────────────────────────────────────────────────────────────

import { ELSEWHERE } from "@/lib/elsewhere";

/** The three personal clusters the loop-closer serves. */
export type LoopCloserSection = "films" | "television" | "music";

/** A fully resolved nudge — everything the card needs to render plus
 *  the analytics dimensions. `null` from resolveLoopCloser means "don't
 *  show anything here." */
export type LoopCloserTarget = {
  section: LoopCloserSection;
  /** Platform display name — must match a label in lib/elsewhere.ts. */
  platform: string;
  /** Outbound follow URL, sourced from lib/elsewhere.ts (single source
   *  of truth for the handles). */
  href: string;
  /** Warm one-line hook shown above the CTA. */
  blurb: string;
  /** CTA link text. */
  cta: string;
  /** The share channel the visitor arrived through (utm_source, e.g.
   *  "reddit" | "messages" | "linkedin"), or "unknown" when the param is
   *  absent. Carried into analytics only — lets the dashboard see which
   *  share channels drive follows. */
  channel: string;
};

/** Per-section copy + platform mapping. Platform must resolve to a
 *  label in ELSEWHERE or the section fails closed (no card). Copy is
 *  first-person and warm — this is editorial voice, not system chrome —
 *  and uses real Unicode glyphs (em-dash without spaces) per the house
 *  typography convention. */
const CONTENT: Record<
  LoopCloserSection,
  { platform: string; blurb: string; cta: string }
> = {
  films: {
    platform: "Letterboxd",
    blurb:
      "I log every film I watch on Letterboxd, a few hundred and counting—one honest diary entry at a time.",
    cta: "Follow along on Letterboxd",
  },
  television: {
    platform: "Serializd",
    blurb:
      "I track every show on Serializd, a few hundred and counting—season by season, as I watch.",
    cta: "Follow along on Serializd",
  },
  music: {
    platform: "Spotify",
    blurb:
      "New playlists land on Spotify monthly—hand-sequenced, built to play front to back.",
    cta: "Follow along on Spotify",
  },
};

/** Map a pathname to its cluster by prefix. Matches the cluster root and
 *  anything under it (detail pages, stats, lists). Returns null for
 *  anything outside the three personal clusters — including
 *  /stats/connected, which is a cross-cluster mashup with no single
 *  natural follow target, and the professional /case-studies/* pages,
 *  which close their own loop. */
function sectionForPath(pathname: string): LoopCloserSection | null {
  if (pathname === "/films" || pathname.startsWith("/films/")) return "films";
  if (pathname === "/television" || pathname.startsWith("/television/"))
    return "television";
  if (pathname === "/music" || pathname.startsWith("/music/")) return "music";
  return null;
}

/**
 * Decide whether to show the loop-closer, and with what content.
 *
 * @param pathname   The current route (from usePathname()).
 * @param utmMedium  utm_medium query value — must be exactly "share" to
 *                   qualify (only the ShareBar emits that; owner
 *                   announcements use "social", so this never fires on
 *                   Malcolm's own posts).
 * @param utmSource  utm_source query value — the share channel, carried
 *                   through to analytics.
 * @returns A resolved target, or null when the visit doesn't qualify.
 */
export function resolveLoopCloser(args: {
  pathname: string;
  utmMedium: string | null;
  utmSource: string | null;
}): LoopCloserTarget | null {
  // Gate 1: only warm share-arrivals. Everything else — direct traffic,
  // search, owner announcements — sees nothing.
  if (args.utmMedium !== "share") return null;

  // Gate 2: only the three personal clusters.
  const section = sectionForPath(args.pathname);
  if (!section) return null;

  // Gate 3: the platform URL must actually be configured. If a handle
  // is ever pulled from lib/elsewhere.ts, fail closed rather than render
  // a dead CTA.
  const content = CONTENT[section];
  const link = ELSEWHERE.find((l) => l.label === content.platform);
  if (!link) return null;

  return {
    section,
    platform: content.platform,
    href: link.href,
    blurb: content.blurb,
    cta: content.cta,
    channel: args.utmSource ?? "unknown",
  };
}
