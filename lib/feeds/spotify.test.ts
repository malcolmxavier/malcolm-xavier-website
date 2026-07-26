// ─────────────────────────────────────────────────────────────────
// Tests for the brittle correctness paths in lib/feeds/spotify.ts
// flagged in the 2026-04-28 follow-up audit's
// cv-test-coverage-on-new-paths finding.
//
// What's covered:
//   • endpointFamily() — Spotify URL bucket-grouping heuristic
//   • cooldown map — set/get/expire/delete behavior
//   • getMusicData() — snapshot fallback (offline-mode path)
//   • transient 5xx retry — spotifyFetch's backoff and the health
//     probe's single re-probe (added 2026-07-26; mocks global fetch
//     including the token mint)
//
// What's NOT covered (left as known unknowns):
//   • The 429 branch of spotifyFetch — the cooldown test below
//     covers the OBSERVABLE state-management surface directly via
//     __testCooldowns, which is the part that matters for the
//     rate-limit hardening shipped 2026-04-28.
//   • PreviewRow rendering, JSX components — no jsdom configured.
// ─────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  endpointFamily,
  __testCooldowns,
  getMusicData,
  getOwnedPlaylists,
  pingSpotifyHealth,
} from "./spotify";

describe("endpointFamily", () => {
  it("strips the /v1 prefix and groups by static path", () => {
    expect(endpointFamily("https://api.spotify.com/v1/me")).toBe("/me");
    expect(endpointFamily("https://api.spotify.com/v1/me/playlists")).toBe(
      "/me/playlists",
    );
  });

  it("ignores query strings", () => {
    expect(
      endpointFamily(
        "https://api.spotify.com/v1/me/playlists?limit=50&offset=0",
      ),
    ).toBe("/me/playlists");
  });

  it("collapses 22-char base62 IDs to :id", () => {
    expect(
      endpointFamily(
        "https://api.spotify.com/v1/playlists/4OoqZqp9I5LBxs1kcWvbxZ",
      ),
    ).toBe("/playlists/:id");
    expect(
      endpointFamily(
        "https://api.spotify.com/v1/playlists/4OoqZqp9I5LBxs1kcWvbxZ/tracks",
      ),
    ).toBe("/playlists/:id/tracks");
    expect(
      endpointFamily(
        "https://api.spotify.com/v1/playlists/4OoqZqp9I5LBxs1kcWvbxZ/items",
      ),
    ).toBe("/playlists/:id/items");
  });

  it("groups two different playlist IDs under one family", () => {
    const a = endpointFamily(
      "https://api.spotify.com/v1/playlists/4OoqZqp9I5LBxs1kcWvbxZ",
    );
    const b = endpointFamily(
      "https://api.spotify.com/v1/playlists/5fsW8MAh5XzOHI0W9Wml0R",
    );
    expect(a).toBe(b);
  });

  it("does NOT collapse non-22-char segments", () => {
    expect(
      endpointFamily("https://api.spotify.com/v1/users/short/playlists"),
    ).toBe("/users/short/playlists");
  });

  it("handles a 22-char numeric-style segment (still base62)", () => {
    // All-digit 22-char strings still match the heuristic; this is
    // a known corner of the regex but unlikely to appear in real
    // Spotify URLs (their IDs are mixed alphanumeric).
    expect(
      endpointFamily("https://api.spotify.com/v1/users/1234567890123456789012"),
    ).toBe("/users/:id");
  });

  it("handles trailing slashes by ignoring them", () => {
    expect(endpointFamily("https://api.spotify.com/v1/me/")).toBe("/me");
  });
});

describe("cooldown map (__testCooldowns)", () => {
  beforeEach(() => {
    __testCooldowns.clear();
  });

  it("stores and retrieves a cooldown timestamp", () => {
    const future = Date.now() + 10_000;
    __testCooldowns.set("/me/playlists", future);
    expect(__testCooldowns.get("/me/playlists")).toBe(future);
  });

  it("returns undefined for a family with no cooldown", () => {
    expect(__testCooldowns.get("/never-set")).toBeUndefined();
  });

  it("delete removes a single family without affecting others", () => {
    __testCooldowns.set("/me/playlists", 1);
    __testCooldowns.set("/me", 2);
    __testCooldowns.delete("/me/playlists");
    expect(__testCooldowns.get("/me/playlists")).toBeUndefined();
    expect(__testCooldowns.get("/me")).toBe(2);
  });

  it("clear empties the map", () => {
    __testCooldowns.set("/a", 1);
    __testCooldowns.set("/b", 2);
    __testCooldowns.clear();
    expect(__testCooldowns.size()).toBe(0);
  });

  it("treats families as independent — /me clear ≠ /me/playlists clear", () => {
    // The whole reason the cooldown map is keyed by family is
    // that Spotify's rate limits are per-family. This test just
    // affirms the data structure preserves that independence.
    __testCooldowns.set("/me/playlists", Date.now() + 60_000);
    expect(__testCooldowns.get("/me")).toBeUndefined();
    expect(__testCooldowns.get("/me/playlists")).toBeGreaterThan(Date.now());
  });
});

describe("getMusicData (snapshot fallback path)", () => {
  // Save and restore the env var around each test so we don't
  // bleed offline mode into other tests in the suite.
  const originalOffline = process.env.SPOTIFY_OFFLINE;

  beforeEach(() => {
    process.env.SPOTIFY_OFFLINE = "1";
  });
  afterEach(() => {
    if (originalOffline === undefined) {
      delete process.env.SPOTIFY_OFFLINE;
    } else {
      process.env.SPOTIFY_OFFLINE = originalOffline;
    }
  });

  it("returns source: 'snapshot' and a capturedAt when offline mode is set", async () => {
    const result = await getMusicData(
      "malcolmxevans",
      new Set<string>(),
      [],
      [],
    );
    expect(result.source).toBe("snapshot");
    expect(result.capturedAt).toBeTypeOf("string");
    expect(result.playlists.length).toBeGreaterThan(0);
  });

  it("filters out IDs in excludeIds", async () => {
    const all = await getMusicData(
      "malcolmxevans",
      new Set<string>(),
      [],
      [],
    );
    if (all.playlists.length === 0) return; // can't run if snapshot is empty

    const firstId = all.playlists[0].id;
    const excluded = await getMusicData(
      "malcolmxevans",
      new Set<string>([firstId]),
      [],
      [],
    );
    expect(excluded.playlists.find((p) => p.id === firstId)).toBeUndefined();
    expect(excluded.playlists.length).toBe(all.playlists.length - 1);
  });

  it("respects MANUAL_ORDER for top placement", async () => {
    // Pin the second playlist to first via MANUAL_ORDER and verify
    // it floats up.
    const all = await getMusicData(
      "malcolmxevans",
      new Set<string>(),
      [],
      [],
    );
    if (all.playlists.length < 2) return;

    const wantedFirst = all.playlists[1].id;
    const reordered = await getMusicData(
      "malcolmxevans",
      new Set<string>(),
      [wantedFirst],
      [],
    );
    expect(reordered.playlists[0].id).toBe(wantedFirst);
  });
});

// ─────────────────────────────────────────────────────────────────
// Transient 5xx retry (added 2026-07-26).
//
// Spotify's edge intermittently returns 503 with a completely empty
// body on valid requests — no Retry-After, no error envelope. Before
// this handling, one such blip anywhere in a ~100-request snapshot
// capture aborted the whole run, and the refresh script reported it
// as a rate limit, sending the operator off to wait out a cool-down
// that was never running.
//
// These tests DO mock global fetch (both the token mint and the API
// call), which the header note above previously listed as not-covered.
// ─────────────────────────────────────────────────────────────────

describe("transient 5xx handling", () => {
  const savedEnv = { ...process.env };

  /** A well-formed token-mint response, so getAccessToken() succeeds. */
  const tokenResponse = () =>
    new Response(
      JSON.stringify({
        access_token: "test-access-token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  /** An empty-body 503 — exactly the shape observed from Spotify. */
  const transient503 = () => new Response("", { status: 503 });

  /** A valid single-page /me/playlists listing with no items. */
  const emptyListing = () =>
    new Response(JSON.stringify({ items: [], next: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  beforeEach(() => {
    // Live path only — offline mode short-circuits before any fetch.
    delete process.env.SPOTIFY_OFFLINE;
    process.env.SPOTIFY_CLIENT_ID = "test-id";
    process.env.SPOTIFY_CLIENT_SECRET = "test-secret";
    process.env.SPOTIFY_REFRESH_TOKEN = "test-refresh";
    __testCooldowns.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    process.env = { ...savedEnv };
    __testCooldowns.clear();
  });

  /**
   * Stub global fetch: token mints always succeed; API calls replay
   * the supplied queue of responses in order. Returns the recorded
   * API URLs so a test can assert how many real attempts happened.
   */
  function stubFetch(apiResponses: Array<() => Response>) {
    const apiCalls: string[] = [];
    let i = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("accounts.spotify.com")) return tokenResponse();
        apiCalls.push(url);
        const next = apiResponses[Math.min(i, apiResponses.length - 1)];
        i++;
        return next();
      }),
    );
    return apiCalls;
  }

  it("retries a 503 and succeeds when the blip clears", async () => {
    const apiCalls = stubFetch([transient503, emptyListing]);

    const result = await getOwnedPlaylists("malcolmxevans");

    expect(result).toEqual([]);
    // One failed attempt plus one successful retry.
    expect(apiCalls).toHaveLength(2);
  });

  it("retries a 503 up to the budget, then throws with the real status", async () => {
    const apiCalls = stubFetch([transient503]);

    await expect(getOwnedPlaylists("malcolmxevans")).rejects.toThrow(/503/);

    // Initial attempt + TRANSIENT_MAX_RETRIES (3) = 4 total. Asserting
    // the exact count is the point: an unbounded retry would hang the
    // capture instead of failing it.
    expect(apiCalls).toHaveLength(4);
  });

  it("does not retry a 404 — only transient statuses get a second chance", async () => {
    const apiCalls = stubFetch([() => new Response("", { status: 404 })]);

    await expect(getOwnedPlaylists("malcolmxevans")).rejects.toThrow(/404/);
    expect(apiCalls).toHaveLength(1);
  });

  it("health re-probes once on a 503 and reports ok when it clears", async () => {
    // /me blips then clears; /me/playlists is clean on first try.
    stubFetch([transient503, emptyListing, emptyListing]);

    const health = await pingSpotifyHealth();

    expect(health.ok).toBe(true);
    expect(health.probes.every((p) => p.ok)).toBe(true);
  });

  it("health reports a persistent 503 honestly rather than papering over it", async () => {
    stubFetch([transient503]);

    const health = await pingSpotifyHealth();

    expect(health.ok).toBe(false);
    const failed = health.probes.find((p) => !p.ok);
    expect(failed?.status).toBe(503);
    // Not a rate limit — nothing should suggest a cool-down to wait out.
    expect(health.worstRetryAfterSeconds).toBe(0);
  });
});
