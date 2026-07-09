// ─────────────────────────────────────────────────────────────────
// Emphasis profiles.
//
// Every surface can share to every channel ("swing wide"). An emphasis
// profile only controls which channels are *pinned* above the "More"
// fold, and in what order — it does not restrict what's available.
//
//   professional → case studies (recruiter-facing)
//   personal     → films, TV, reviews, landings, stats, lists, music
//
// `native` is not listed here: the ShareBar prepends it as the first
// pinned button on devices that support navigator.share, and omits it
// entirely elsewhere.
//
// Reddit is pinned (not Bluesky) as a deliberate reach play: Reddit's
// film/TV/music communities are a high-virality destination for this
// kind of content, so it earns a pinned slot for visitor sharing.
// Bluesky and X both live under "More" — Bluesky is Malcolm's own
// handle (niche, and still fully attributed in channels.ts), X is
// de-emphasized. Both retain their in-intent attribution regardless of
// pin state.
// ─────────────────────────────────────────────────────────────────

import type { ShareChannelId } from "./build-share-url";

export type EmphasisProfile = "professional" | "personal";

/** Channels pinned above the "More" fold, in display order. */
export const PINNED: Record<EmphasisProfile, ShareChannelId[]> = {
  professional: ["copy", "linkedin", "email", "reddit"],
  personal: ["copy", "messages", "whatsapp", "reddit"],
};

/** Canonical order for the full menu (the "More" list shows every
 *  channel here that isn't already pinned for the active profile).
 *  Bluesky sits before X (Malcolm's platform over the de-emphasized
 *  one); LinkedIn sits directly above Email so they read as the
 *  professional pair at the tail of the personal profile's "More" list. */
export const FULL_ORDER: ShareChannelId[] = [
  "copy",
  "messages",
  "whatsapp",
  "bluesky",
  "x",
  "facebook",
  "reddit",
  "linkedin",
  "email",
];

/** The unpinned channels for a profile, in canonical order — i.e. what
 *  the "More" disclosure reveals. */
export function overflowChannels(profile: EmphasisProfile): ShareChannelId[] {
  const pinned = new Set(PINNED[profile]);
  return FULL_ORDER.filter((id) => !pinned.has(id));
}
