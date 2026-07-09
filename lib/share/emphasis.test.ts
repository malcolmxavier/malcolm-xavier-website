// Tests for the emphasis profiles — which channels pin above the "More"
// fold per surface, and what the disclosure reveals. The load-bearing
// invariant: every surface can still reach every channel (swing wide),
// so pinned + overflow must partition the full menu with nothing lost or
// duplicated. Also guards the deliberate ordering calls (Reddit pinned,
// X + Bluesky under More) documented in emphasis.ts.

import { describe, expect, it } from "vitest";

import {
  PINNED,
  FULL_ORDER,
  overflowChannels,
  type EmphasisProfile,
} from "./emphasis";
import type { ShareChannelId } from "./build-share-url";

const PROFILES: EmphasisProfile[] = ["professional", "personal"];

describe("PINNED profiles", () => {
  it("professional pins the recruiter-facing set in order (no Reddit)", () => {
    // Reddit is intentionally NOT pinned for the professional audience —
    // a recruiter won't Reddit-share a case study, so it lives under
    // "More" here (see emphasis.ts). Native prepends on mobile.
    expect(PINNED.professional).toEqual(["copy", "linkedin", "email"]);
  });

  it("personal pins the messaging-first set in order", () => {
    expect(PINNED.personal).toEqual(["copy", "messages", "whatsapp", "reddit"]);
  });

  it("always pins Copy first (the universal always-available action)", () => {
    for (const profile of PROFILES) {
      expect(PINNED[profile][0]).toBe("copy");
    }
  });

  it("keeps X unpinned in both profiles (the de-emphasis call)", () => {
    for (const profile of PROFILES) {
      expect(PINNED[profile]).not.toContain("x");
    }
  });

  it("never pins native (the ShareBar prepends it at render time)", () => {
    for (const profile of PROFILES) {
      expect(PINNED[profile]).not.toContain("native");
    }
  });
});

describe("FULL_ORDER menu", () => {
  it("lists every shareable channel except native, with no duplicates", () => {
    const expected: ShareChannelId[] = [
      "copy",
      "messages",
      "whatsapp",
      "bluesky",
      "reddit",
      "x",
      "facebook",
      "linkedin",
      "email",
    ];
    expect(FULL_ORDER).toEqual(expected);
    expect(new Set(FULL_ORDER).size).toBe(FULL_ORDER.length);
    expect(FULL_ORDER).not.toContain("native");
  });

  it("orders Bluesky before X (own platform over the de-emphasized one)", () => {
    expect(FULL_ORDER.indexOf("bluesky")).toBeLessThan(FULL_ORDER.indexOf("x"));
  });

  it("orders Reddit directly after Bluesky (the two high-reach social destinations, paired at the top of the professional 'More' list)", () => {
    expect(FULL_ORDER.indexOf("reddit")).toBe(FULL_ORDER.indexOf("bluesky") + 1);
  });

  it("orders LinkedIn directly above Email (the professional pair at the tail)", () => {
    expect(FULL_ORDER.indexOf("email")).toBe(FULL_ORDER.indexOf("linkedin") + 1);
  });
});

describe("overflowChannels — the 'More' disclosure", () => {
  it("returns the full menu minus the profile's pinned channels, in canonical order", () => {
    for (const profile of PROFILES) {
      const pinned = new Set(PINNED[profile]);
      expect(overflowChannels(profile)).toEqual(
        FULL_ORDER.filter((id) => !pinned.has(id)),
      );
    }
  });

  it("partitions the menu: pinned ∪ overflow === FULL_ORDER, with no overlap", () => {
    // The swing-wide guarantee — no channel is dropped or double-listed.
    for (const profile of PROFILES) {
      // Copy appears in FULL_ORDER once and is pinned, so it should not
      // reappear in overflow.
      const overflow = overflowChannels(profile);
      const pinnedInMenu = PINNED[profile].filter((id) => FULL_ORDER.includes(id));
      const union = new Set([...pinnedInMenu, ...overflow]);
      expect(union).toEqual(new Set(FULL_ORDER));
      // No channel is both pinned and in overflow.
      for (const id of overflow) {
        expect(PINNED[profile]).not.toContain(id);
      }
    }
  });

  it("hides X under More but never drops it (attribution retained regardless)", () => {
    for (const profile of PROFILES) {
      expect(overflowChannels(profile)).toContain("x");
    }
  });
});
