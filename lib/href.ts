// ─────────────────────────────────────────────────────────────────
// href.ts — small classifier shared across link-rendering surfaces
// (Link primitive, Footer link rows, the BackToPlaylists button).
//
// Three semantics, decided purely from the href string shape:
//   • internal — same-app route, served via Next router (next/link).
//   • hashOrProtocol — in-page anchor, mailto:, or tel:. Same tab,
//     same window, no router treatment.
//   • external — http(s):// to a different origin. Open in new tab,
//     scrub referrer.
//
// Without this helper, the same three predicates were inlined in
// each consumer; if the protocol list ever needs to grow (sms:,
// ftp:, etc.) it grew in three places and quietly drifted.
// ─────────────────────────────────────────────────────────────────

export type HrefKind = "internal" | "hashOrProtocol" | "external";

/** Same-app route — starts with "/" but not "//" (which is a protocol-relative external URL). */
export function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

/** In-page anchor or mailto:/tel: — same-tab, plain anchor. */
export function isHashOrProtocolHref(href: string): boolean {
  return (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

/** Off-origin link — opens in a new tab with rel scrubbed. */
export function isExternalHref(href: string): boolean {
  return !isInternalHref(href) && !isHashOrProtocolHref(href);
}

/** Single classify pass — returns the matching HrefKind. */
export function classifyHref(href: string): HrefKind {
  if (isInternalHref(href)) return "internal";
  if (isHashOrProtocolHref(href)) return "hashOrProtocol";
  return "external";
}
