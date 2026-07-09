// Tests for buildShareUrl — the UTM-tagging step every ShareBar link
// passes through. This is the user-critical attribution path: if the
// UTM triple is wrong, share-driven traffic is misattributed in Web
// Analytics; if the builder leaks into the canonical, SEO suffers. The
// canonical-stays-clean guarantee lives in each route's metadata, so
// here we assert the narrower contract: the builder only ever ADDS the
// three utm params to the outbound copy and never mutates its input.

import { describe, expect, it } from "vitest";

import { buildShareUrl } from "./build-share-url";

// Mirror of lib/site-config.ts — asserted here so a host change trips a
// test rather than silently repointing every share link.
const SITE_ORIGIN = "https://malxavi.com";

describe("buildShareUrl — UTM model", () => {
  it("resolves a site-relative path to an absolute URL on the canonical host", () => {
    const out = new URL(buildShareUrl("/films/parasite", "copy"));
    expect(out.origin).toBe(SITE_ORIGIN);
    expect(out.pathname).toBe("/films/parasite");
  });

  it("sets utm_source to the channel id and utm_medium to the fixed 'share' class", () => {
    const out = new URL(buildShareUrl("/films/parasite", "whatsapp"));
    expect(out.searchParams.get("utm_source")).toBe("whatsapp");
    expect(out.searchParams.get("utm_medium")).toBe("share");
  });

  it("omits utm_campaign when no campaign tag is supplied", () => {
    const out = new URL(buildShareUrl("/television", "x"));
    expect(out.searchParams.has("utm_campaign")).toBe(false);
  });

  it("adds utm_campaign as the surface tag when supplied", () => {
    const out = new URL(
      buildShareUrl("/case-studies/user-interviews", "linkedin", "case-study-user-interviews"),
    );
    expect(out.searchParams.get("utm_campaign")).toBe("case-study-user-interviews");
  });

  it("emits exactly the utm triple and nothing else for a clean path", () => {
    const out = new URL(buildShareUrl("/music", "email", "music-landing"));
    expect([...out.searchParams.keys()].sort()).toEqual([
      "utm_campaign",
      "utm_medium",
      "utm_source",
    ]);
  });

  it("preserves query params already on the path and layers the utm triple on top", () => {
    const out = new URL(buildShareUrl("/films/reviews?tag=heist", "reddit"));
    expect(out.searchParams.get("tag")).toBe("heist");
    expect(out.searchParams.get("utm_source")).toBe("reddit");
    expect(out.searchParams.get("utm_medium")).toBe("share");
  });

  it("preserves a fragment/anchor (the per-review deep-link case)", () => {
    // Per-review shares hang off #review-N anchors — the UTM tagging
    // must not clobber the hash the ShareBar deep-links to.
    const out = new URL(buildShareUrl("/films/parasite#review-3", "messages"));
    expect(out.hash).toBe("#review-3");
    expect(out.searchParams.get("utm_source")).toBe("messages");
  });

  it("re-tags a fresh copy per channel without carrying another channel's source", () => {
    // Same path, two channels → two independent utm_source values. Guards
    // against any shared-mutable-URL regression in the builder.
    const a = new URL(buildShareUrl("/films/parasite", "bluesky"));
    const b = new URL(buildShareUrl("/films/parasite", "facebook"));
    expect(a.searchParams.get("utm_source")).toBe("bluesky");
    expect(b.searchParams.get("utm_source")).toBe("facebook");
  });

  it("passes an already-absolute same-host URL through, adding the utm triple", () => {
    // Documented behavior: an absolute URL resolves to itself (the base
    // is ignored by new URL), then gets tagged like any other.
    const out = new URL(
      buildShareUrl("https://malxavi.com/television/severance", "copy"),
    );
    expect(out.origin).toBe(SITE_ORIGIN);
    expect(out.pathname).toBe("/television/severance");
    expect(out.searchParams.get("utm_source")).toBe("copy");
  });
});
