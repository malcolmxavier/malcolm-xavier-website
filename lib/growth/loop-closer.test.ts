// Tests for the share-loop-closer resolution logic. The load-bearing
// rules: (1) it fires ONLY for warm share-arrivals (utm_medium=share),
// (2) it is a personal-only surface — the professional /case-studies/*
// cluster and the cross-cluster /stats/connected page are excluded, and
// (3) each personal cluster resolves to the right public-follow platform
// with a real URL from lib/elsewhere.ts.

import { describe, expect, it } from "vitest";

import { resolveLoopCloser } from "./loop-closer";
import { ELSEWHERE } from "@/lib/elsewhere";

const href = (label: string) =>
  ELSEWHERE.find((l) => l.label === label)?.href;

describe("resolveLoopCloser — the share-arrival gate", () => {
  it("returns null when utm_medium is absent (direct / search traffic)", () => {
    expect(
      resolveLoopCloser({
        pathname: "/films/some-film",
        utmMedium: null,
        utmSource: null,
      }),
    ).toBeNull();
  });

  it("returns null for owner announcements (utm_medium=social, not share)", () => {
    // Malcolm's own LinkedIn posts tag utm_medium=social — the loop
    // closer must never fire on those, only on visitor ShareBar links.
    expect(
      resolveLoopCloser({
        pathname: "/films/some-film",
        utmMedium: "social",
        utmSource: "linkedin",
      }),
    ).toBeNull();
  });

  it("fires only when utm_medium is exactly 'share'", () => {
    expect(
      resolveLoopCloser({
        pathname: "/films/some-film",
        utmMedium: "share",
        utmSource: "reddit",
      }),
    ).not.toBeNull();
  });
});

describe("resolveLoopCloser — personal-only surface", () => {
  it("excludes the professional case-study cluster (it closes its own loop)", () => {
    expect(
      resolveLoopCloser({
        pathname: "/case-studies/user-interviews",
        utmMedium: "share",
        utmSource: "linkedin",
      }),
    ).toBeNull();
  });

  it("excludes /stats/connected (cross-cluster, no single follow target)", () => {
    expect(
      resolveLoopCloser({
        pathname: "/stats/connected",
        utmMedium: "share",
        utmSource: "messages",
      }),
    ).toBeNull();
  });

  it("excludes recruiter / home surfaces", () => {
    for (const pathname of ["/", "/resume", "/about", "/contact"]) {
      expect(
        resolveLoopCloser({ pathname, utmMedium: "share", utmSource: "email" }),
      ).toBeNull();
    }
  });
});

describe("resolveLoopCloser — cluster → platform mapping", () => {
  it("maps the films cluster (root, detail, stats, lists) to Letterboxd", () => {
    for (const pathname of [
      "/films",
      "/films/some-film",
      "/films/stats",
      "/films/lists/best-of-2025",
    ]) {
      const target = resolveLoopCloser({
        pathname,
        utmMedium: "share",
        utmSource: "reddit",
      });
      expect(target?.section).toBe("films");
      expect(target?.platform).toBe("Letterboxd");
      expect(target?.href).toBe(href("Letterboxd"));
    }
  });

  it("maps the television cluster to Serializd", () => {
    const target = resolveLoopCloser({
      pathname: "/television/some-show",
      utmMedium: "share",
      utmSource: "whatsapp",
    });
    expect(target?.section).toBe("television");
    expect(target?.platform).toBe("Serializd");
    expect(target?.href).toBe(href("Serializd"));
  });

  it("maps the music cluster to Spotify", () => {
    const target = resolveLoopCloser({
      pathname: "/music/some-playlist",
      utmMedium: "share",
      utmSource: "copy",
    });
    expect(target?.section).toBe("music");
    expect(target?.platform).toBe("Spotify");
    expect(target?.href).toBe(href("Spotify"));
  });
});

describe("resolveLoopCloser — analytics channel passthrough", () => {
  it("carries utm_source through as the channel dimension", () => {
    const target = resolveLoopCloser({
      pathname: "/films/some-film",
      utmMedium: "share",
      utmSource: "reddit",
    });
    expect(target?.channel).toBe("reddit");
  });

  it("falls back to 'unknown' when utm_source is absent", () => {
    const target = resolveLoopCloser({
      pathname: "/films/some-film",
      utmMedium: "share",
      utmSource: null,
    });
    expect(target?.channel).toBe("unknown");
  });
});
