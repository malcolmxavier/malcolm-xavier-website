// ─────────────────────────────────────────────────────────────────
// Share-channel registry.
//
// One universal set of channels, available on every ShareBar. Which
// ones are *pinned* above the "More" fold is decided per-surface by the
// emphasis profile (see emphasis.ts) — this file just defines what each
// channel is and how to build its outbound link.
//
// Attribution is baked in here where the platform supports it inside
// the share intent:
//   - X       → `via=malxavi` (prefills "via @malxavi" in the draft)
//   - Bluesky → "via @malcolmx.bsky.social" appended to the compose text
// LinkedIn has no in-intent attribution (its share endpoint takes only
// `url`); that attribution is handled via OG `article:author` metadata,
// not here. Facebook and Reddit have no owner accounts to attribute.
//
// `copy` and `native` carry no buildHref — the ShareBar handles them
// imperatively (clipboard write / navigator.share).
// ─────────────────────────────────────────────────────────────────

import type { ComponentType } from "react";

import {
  IconBluesky,
  IconEmail,
  IconFacebook,
  IconLink,
  IconLinkedIn,
  IconMessages,
  IconReddit,
  IconShare,
  IconWhatsApp,
  IconX,
} from "@/components/icons";

import type { ShareChannelId } from "./build-share-url";

/** In-intent attribution handles (only where the platform supports it). */
const X_VIA = "malxavi";
const BLUESKY_VIA = "malcolmx.bsky.social";

export type ChannelKind = "copy" | "native" | "web-intent";

export type ShareChannel = {
  id: ShareChannelId;
  /** Human label — also the accessible name on the icon-only button. */
  label: string;
  icon: ComponentType<{ size?: number }>;
  kind: ChannelKind;
  /** Build the outbound href. `shareUrl` is already absolute and
   *  UTM-tagged. Absent for `copy`/`native` (handled in the component). */
  buildHref?: (shareUrl: string, title: string, text?: string) => string;
};

export const CHANNELS: Record<ShareChannelId, ShareChannel> = {
  copy: {
    id: "copy",
    label: "Copy link",
    icon: IconLink,
    kind: "copy",
  },
  native: {
    id: "native",
    label: "Share…",
    icon: IconShare,
    kind: "native",
  },
  messages: {
    id: "messages",
    label: "Messages",
    icon: IconMessages,
    kind: "web-intent",
    // `sms:` opens the device Messages app (iOS routes Apple-to-Apple
    // to iMessage automatically). Mobile-first; desktop typically has
    // no handler, so native share covers desktop messaging instead.
    buildHref: (url, title) =>
      `sms:?&body=${encodeURIComponent(`${title} ${url}`)}`,
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    icon: IconWhatsApp,
    kind: "web-intent",
    buildHref: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  x: {
    id: "x",
    label: "X",
    icon: IconX,
    kind: "web-intent",
    // The intent needs no handle to work; `via` only adds the "via
    // @malxavi" attribution credit to the draft tweet.
    buildHref: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        url,
      )}&text=${encodeURIComponent(title)}&via=${X_VIA}`,
  },
  bluesky: {
    id: "bluesky",
    label: "Bluesky",
    icon: IconBluesky,
    kind: "web-intent",
    // Bluesky auto-detects the URL and @handle in the compose text and
    // turns them into a link facet / mention.
    buildHref: (url, title) =>
      `https://bsky.app/intent/compose?text=${encodeURIComponent(
        `${title} ${url}\n\nvia @${BLUESKY_VIA}`,
      )}`,
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    icon: IconLinkedIn,
    kind: "web-intent",
    // share-offsite accepts only `url` — prefilled text/title params
    // were deprecated. Attribution comes from OG article:author.
    buildHref: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url,
      )}`,
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    icon: IconFacebook,
    kind: "web-intent",
    buildHref: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  reddit: {
    id: "reddit",
    label: "Reddit",
    icon: IconReddit,
    kind: "web-intent",
    buildHref: (url, title) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(
        url,
      )}&title=${encodeURIComponent(title)}`,
  },
  email: {
    id: "email",
    label: "Email",
    icon: IconEmail,
    kind: "web-intent",
    buildHref: (url, title) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
        url,
      )}`,
  },
};
