// ─────────────────────────────────────────────────────────────────
// Share-URL builder.
//
// Turns a site-relative path into an absolute, UTM-tagged URL for a
// specific share channel. The on-site canonical URL stays clean (see
// each route's `alternates.canonical`); only the outbound link a
// visitor shares carries the UTM parameters, so share-driven traffic
// is attributable in Vercel Web Analytics without polluting the
// canonical that search engines index.
//
// UTM model (deliberately simple — one medium, source per channel):
//   utm_medium   = "share"        → all ShareBar traffic as one class
//   utm_source   = <channel id>   → which button they used
//   utm_campaign = <surface tag>  → what they shared (optional), e.g.
//                                   "case-study-user-interviews"
//
// This intentionally differs from the manual editorial convention
// (utm_medium=social on Malcolm's own LinkedIn announcement posts), so
// visitor shares and owner announcements stay distinguishable.
// ─────────────────────────────────────────────────────────────────

import { SITE_URL } from "@/lib/site-config";

/** Every channel the ShareBar can emit. `copy` and `native` are real
 *  channels for attribution purposes even though they don't open a
 *  third-party intent URL. */
export type ShareChannelId =
  | "copy"
  | "native"
  | "messages"
  | "whatsapp"
  | "x"
  | "bluesky"
  | "linkedin"
  | "facebook"
  | "reddit"
  | "email";

/**
 * Build an absolute, UTM-tagged share URL for one channel.
 *
 * @param path     Site-relative path being shared (e.g. "/films/foo").
 *                 Absolute URLs are passed through host-checked.
 * @param channel  The channel id — becomes utm_source.
 * @param campaign Optional surface/content tag — becomes utm_campaign.
 */
export function buildShareUrl(
  path: string,
  channel: ShareChannelId,
  campaign?: string,
): string {
  // `new URL(path, base)` resolves a relative path against the canonical
  // host and ignores the base when `path` is already absolute — so a
  // caller can pass either "/films/foo" or a full URL safely.
  const url = new URL(path, SITE_URL);
  url.searchParams.set("utm_source", channel);
  url.searchParams.set("utm_medium", "share");
  if (campaign) url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}
