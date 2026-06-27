// Tests for buildOriginHref — the helper that reconstructs a listing's
// relative URL (pathname + active filters) for threading onto card links
// as ?from=. Both clusters depend on it producing a clean, replayable URL.

import { describe, expect, it } from "vitest";
import { buildOriginHref } from "./origin-href";

describe("buildOriginHref", () => {
  it("returns the bare pathname when there are no params", () => {
    expect(buildOriginHref("/films/reviews", {})).toBe("/films/reviews");
  });

  it("appends active filter params as a query string", () => {
    expect(buildOriginHref("/films/reviews", { rating: "5" })).toBe(
      "/films/reviews?rating=5",
    );
  });

  it("drops the back-nav markers ref and from (no nested origins)", () => {
    expect(
      buildOriginHref("/films/reviews", {
        ref: "internal",
        from: "/somewhere",
        genre: "Drama",
      }),
    ).toBe("/films/reviews?genre=Drama");
  });

  it("ignores undefined values", () => {
    expect(
      buildOriginHref("/television/genre/drama", { rating: undefined }),
    ).toBe("/television/genre/drama");
  });

  it("takes the first value of a repeated (array) param", () => {
    expect(buildOriginHref("/films/reviews", { rating: ["5", "4"] })).toBe(
      "/films/reviews?rating=5",
    );
  });

  it("preserves a CSV multi-select param whole (single string)", () => {
    // The CSV filters (?genre=Drama,Comedy) arrive as one string, so they
    // survive intact — only repeated keys collapse to their first value.
    expect(buildOriginHref("/films/reviews", { genre: "Drama,Comedy" })).toBe(
      "/films/reviews?genre=Drama%2CComedy",
    );
  });
});
