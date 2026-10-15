import { describe, expect, it } from "vitest";
import { clipToBudget, excerpt, flattenProse } from "./excerpt";

// A "lone surrogate" is half of an emoji — the thing a plain .slice can
// leave behind, and the thing encodeURIComponent throws on.
const hasLoneSurrogate = (s: string) =>
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);

describe("flattenProse", () => {
  it("strips Letterboxd's inline italics and collapses paragraph breaks", () => {
    expect(flattenProse("Better than <i>Jurassic Park</i>.\n\nSecond   para.")).toBe(
      "Better than Jurassic Park. Second para.",
    );
  });
});

describe("clipToBudget", () => {
  it("drops an emoji whole rather than splitting it", () => {
    // "ab" + 😮 (2 units): a budget of 3 lands mid-emoji.
    expect(clipToBudget("ab😮", 3)).toBe("ab");
    expect(clipToBudget("ab😮", 4)).toBe("ab😮");
  });

  it("keeps joined and skin-toned emoji intact", () => {
    const family = "👨‍👩‍👧"; // 8 units, one character
    for (let budget = 0; budget < family.length; budget++) {
      expect(clipToBudget(`x${family}`, budget + 1)).toBe("x");
    }
    expect(clipToBudget("ok👍🏽", 5)).toBe("ok");
  });

  it("keeps an emoji with its variation selector", () => {
    expect(clipToBudget("go ➡️", 4)).toBe("go ");
  });
});

describe("excerpt", () => {
  it("returns short text unchanged", () => {
    expect(excerpt("Loved it 😮‍💨", 50)).toBe("Loved it 😮‍💨");
  });

  it("never leaves half an emoji at any budget", () => {
    const review = "A thrill 😮‍💨 from start ➡️ to finish 👍🏽👨‍👩‍👧 and then some";
    for (let budget = 1; budget <= review.length; budget++) {
      const out = excerpt(review, budget);
      expect(hasLoneSurrogate(out)).toBe(false);
      expect(() => encodeURIComponent(out)).not.toThrow();
    }
  });

  it("backs off to a word boundary when one is close", () => {
    expect(excerpt("one two three four", 10)).toBe("one two…");
  });

  it("falls back to a character-safe clip inside one long token", () => {
    expect(excerpt("😮😮😮😮😮😮", 5)).toBe("😮😮…");
  });
});
