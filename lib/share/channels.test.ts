// Tests for the share-channel registry — the buildHref templates that
// turn a UTM-tagged share URL into each platform's intent link. These
// are user-critical: a malformed intent URL either fails to open the
// composer or drops the attribution credit (X `via`, Bluesky handle).
// We assert structure + encoding + attribution per channel, plus the
// registry-completeness invariant so a new ShareChannelId can't be added
// without a registry entry.

import { describe, expect, it } from "vitest";

import { CHANNELS } from "./channels";
import type { ShareChannelId } from "./build-share-url";

// A representative already-built share URL (absolute + UTM-tagged, as the
// ShareBar hands it to buildHref) and a title with characters that MUST
// be percent-encoded — space, ampersand, colon — to prove encoding.
const SHARE_URL = "https://malxavi.com/films/parasite?utm_source=x&utm_medium=share";
const TITLE = "Parasite: a review & recommendation";

/** Pull a channel that is guaranteed to have a buildHref (all web-intent
 *  channels do); throws in-test if the id is copy/native. */
function href(id: ShareChannelId, title = TITLE): string {
  const build = CHANNELS[id].buildHref;
  if (!build) throw new Error(`${id} has no buildHref`);
  return build(SHARE_URL, title);
}

describe("registry completeness", () => {
  const ALL_IDS: ShareChannelId[] = [
    "copy",
    "native",
    "messages",
    "whatsapp",
    "x",
    "bluesky",
    "linkedin",
    "facebook",
    "reddit",
    "email",
  ];

  it("has an entry for every ShareChannelId, keyed by its own id", () => {
    for (const id of ALL_IDS) {
      expect(CHANNELS[id]).toBeDefined();
      expect(CHANNELS[id].id).toBe(id);
      expect(CHANNELS[id].label.length).toBeGreaterThan(0);
      expect(CHANNELS[id].icon).toBeTypeOf("function");
    }
  });

  it("gives copy/native no buildHref (handled imperatively) and web-intents a buildHref", () => {
    expect(CHANNELS.copy.buildHref).toBeUndefined();
    expect(CHANNELS.native.buildHref).toBeUndefined();
    expect(CHANNELS.copy.kind).toBe("copy");
    expect(CHANNELS.native.kind).toBe("native");
    for (const id of ALL_IDS) {
      if (id === "copy" || id === "native") continue;
      expect(CHANNELS[id].kind).toBe("web-intent");
      expect(CHANNELS[id].buildHref).toBeTypeOf("function");
    }
  });
});

describe("web-intent hrefs — structure, encoding, attribution", () => {
  it("messages: sms: body carries the encoded 'title url'", () => {
    const out = href("messages");
    expect(out.startsWith("sms:?&body=")).toBe(true);
    expect(out).toContain(encodeURIComponent(`${TITLE} ${SHARE_URL}`));
  });

  it("whatsapp: wa.me text carries the encoded 'title url'", () => {
    const out = href("whatsapp");
    expect(out.startsWith("https://wa.me/?text=")).toBe(true);
    expect(out).toContain(encodeURIComponent(`${TITLE} ${SHARE_URL}`));
  });

  it("x: encodes url + text separately and appends the via=malxavi credit", () => {
    const out = href("x");
    expect(out.startsWith("https://twitter.com/intent/tweet?")).toBe(true);
    expect(out).toContain(`url=${encodeURIComponent(SHARE_URL)}`);
    expect(out).toContain(`text=${encodeURIComponent(TITLE)}`);
    expect(out.endsWith("&via=malxavi")).toBe(true);
  });

  it("bluesky: compose text ends with the 'via @handle' attribution", () => {
    const out = href("bluesky");
    expect(out.startsWith("https://bsky.app/intent/compose?text=")).toBe(true);
    expect(out).toContain(
      encodeURIComponent(`${TITLE} ${SHARE_URL}\n\nvia @malcolmx.bsky.social`),
    );
  });

  it("linkedin: share-offsite carries only the encoded url (no text params)", () => {
    const out = href("linkedin");
    expect(out).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
    );
    // The de-emphasis/attribution note: LinkedIn intent takes url only.
    expect(out).not.toContain("text=");
    expect(out).not.toContain("title=");
  });

  it("facebook: sharer carries the encoded url", () => {
    const out = href("facebook");
    expect(out).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`,
    );
  });

  it("reddit: submit carries encoded url + title", () => {
    const out = href("reddit");
    expect(out).toContain(`url=${encodeURIComponent(SHARE_URL)}`);
    expect(out).toContain(`title=${encodeURIComponent(TITLE)}`);
  });

  it("email: mailto encodes the title as subject and the url as body", () => {
    const out = href("email");
    expect(out.startsWith("mailto:?subject=")).toBe(true);
    expect(out).toContain(`subject=${encodeURIComponent(TITLE)}`);
    expect(out).toContain(`body=${encodeURIComponent(SHARE_URL)}`);
  });

  it("percent-encodes reserved characters in the title across every intent", () => {
    // The '&' and ':' in TITLE must never appear raw in a query value —
    // a raw '&' would split the intent's own params.
    for (const id of ["x", "reddit", "email", "whatsapp", "messages"] as const) {
      const out = href(id);
      expect(out).toContain("%26"); // encoded &
      expect(out).not.toContain(`text=${TITLE}`); // never raw
    }
  });
});
