// ─────────────────────────────────────────────────────────────────
// Route tests for /api/cron/enrich-refresh.
//
// The dangerous part of this route is that, on the happy path, it
// commits to `main` via the GitHub API — so we never curl it live.
// Instead we mock node:fs (the bundled snapshots + fixture), the global
// fetch (MDBList/TMDB/GitHub), and the env, and assert each branch:
// auth rejection, the no-op short-circuit, the graceful no-keys skip,
// and the commit path (with a mocked GitHub PUT, so nothing real is
// written).
// ─────────────────────────────────────────────────────────────────

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// node:fs is mocked so readFileSync serves crafted fixtures by path.
const h = vi.hoisted(() => ({ files: {} as Record<string, string> }));
vi.mock("node:fs", () => ({
  readFileSync: (p: string) => {
    const key = Object.keys(h.files).find((k) => String(p).includes(k));
    if (key) return h.files[key];
    throw new Error("ENOENT (mock): " + p);
  },
  writeFileSync: () => {},
  existsSync: () => true,
}));

import { GET } from "./route";

/** A fetch Response stand-in covering both getJson and the GitHub push. */
function res(json: unknown, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => null },
    json: async () => json,
    text: async () => JSON.stringify(json),
  };
}

/** Captures the GitHub PUT body so a test can inspect what was committed. */
let lastPutBody: string | null = null;

function routeFetch(url: string, init?: RequestInit) {
  // MDBList daily-window probe (mdbRemaining).
  if (url.includes("api.mdblist.com/user")) {
    return Promise.resolve(res({ rate_limit_remaining: 100 }));
  }
  if (url.includes("api.mdblist.com/tmdb/movie/")) {
    return Promise.resolve(
      res({
        ratings: [{ source: "imdb", value: 7.5 }],
        production_companies: [{ name: "A24" }],
        country: "US",
        language: "en",
        budget: 1_000_000,
      }),
    );
  }
  if (url.includes("api.themoviedb.org/3/movie/") && url.includes("release_dates")) {
    return Promise.resolve(
      res({ results: [{ iso_3166_1: "US", release_dates: [{ type: 3, release_date: "2024-01-01" }] }] }),
    );
  }
  if (url.includes("api.themoviedb.org/3/movie/")) {
    return Promise.resolve(
      res({
        credits: { cast: [{ id: 1, name: "Lead Actor", order: 0 }], crew: [] },
        belongs_to_collection: null,
      }),
    );
  }
  // GitHub contents API: GET current sha, PUT the new file.
  if (url.includes("api.github.com")) {
    if (init?.method === "PUT") {
      lastPutBody = String(init.body);
      return Promise.resolve(res({ commit: { sha: "deadbeef" } }));
    }
    return Promise.resolve(res({ sha: "base-sha" }));
  }
  return Promise.resolve(res(null, { ok: false, status: 404 }));
}

/** Build a request with (or without) the cron bearer token. */
function req(token?: string) {
  return new Request("http://local/api/cron/enrich-refresh", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const completeFilm = () => ({
  ratings: { imdb: 7 },
  cast: [{ id: 1, name: "X" }],
  writers: [],
  collection: null,
  release: { cls: "theatrical" },
});

beforeEach(() => {
  lastPutBody = null;
  vi.stubGlobal("fetch", vi.fn(routeFetch));
  vi.stubEnv("CRON_SECRET", "secret");
  // One film in the snapshot; shows empty. Tests vary the fixture.
  h.files["letterboxd-snapshot.json"] = JSON.stringify({ films: [{ tmdb: { id: 100 } }] });
  h.files["serializd-snapshot.json"] = JSON.stringify({ shows: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("enrich-refresh route — auth", () => {
  it("401s without a valid bearer token", async () => {
    h.files["enrichment-snapshot.json"] = JSON.stringify({ films: {}, shows: {}, collectionDetails: {} });
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("wrong"))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("enrich-refresh route — no-op", () => {
  it("returns no-op and makes no network call when the fixture is complete", async () => {
    h.files["enrichment-snapshot.json"] = JSON.stringify({
      films: { "100": completeFilm() },
      shows: {},
      collectionDetails: {},
    });
    const body = await (await GET(req("secret"))).json();
    expect(body.action).toBe("no-op");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("enrich-refresh route — graceful no-keys skip", () => {
  it("skips (data untouched) when the API keys are unset, even with work pending", async () => {
    h.files["enrichment-snapshot.json"] = JSON.stringify({ films: {}, shows: {}, collectionDetails: {} });
    // CRON_SECRET set; MDBLIST/TMDB intentionally not stubbed.
    const body = await (await GET(req("secret"))).json();
    expect(body.action).toBe("skipped-no-keys");
    expect(body.pending.films).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("enrich-refresh route — commit path", () => {
  it("enriches the pending film and commits the fixture to GitHub", async () => {
    h.files["enrichment-snapshot.json"] = JSON.stringify({ films: {}, shows: {}, collectionDetails: {} });
    vi.stubEnv("MDBLIST_API_KEY", "m");
    vi.stubEnv("TMDB_API_KEY", "t");
    vi.stubEnv("GITHUB_REPO_TOKEN", "ghp_test");

    const body = await (await GET(req("secret"))).json();
    expect(body.action).toBe("fixture-updated");
    expect(body.githubCommitSha).toBe("deadbeef");

    // The committed (base64) content should carry the newly enriched film.
    expect(lastPutBody).toBeTruthy();
    const put = JSON.parse(lastPutBody as string);
    const committed = Buffer.from(put.content, "base64").toString("utf-8");
    const fixture = JSON.parse(committed);
    expect(fixture.films["100"].ratings.imdb).toBe(7.5);
    expect(fixture.films["100"].cast[0].name).toBe("Lead Actor");
  });
});
