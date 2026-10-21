import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isTextlessEntry,
  refreshSnapshotIncremental,
} from "./incremental-rss-refresh.mjs";

const item = (o: {
  guid: string;
  title: string;
  year: number;
  date: string;
  rating?: string;
  prose: string;
}) => `
  <item>
    <title>${o.title}, ${o.year}</title>
    <link>https://letterboxd.com/malxavi/film/${o.guid}/</link>
    <guid isPermaLink="false">${o.guid}</guid>
    <pubDate>Sat, 18 Oct 2026 20:00:00 +1300</pubDate>
    <letterboxd:watchedDate>${o.date}</letterboxd:watchedDate>
    <letterboxd:rewatch>No</letterboxd:rewatch>
    <letterboxd:filmTitle>${o.title}</letterboxd:filmTitle>
    <letterboxd:filmYear>${o.year}</letterboxd:filmYear>
    <letterboxd:memberRating>${o.rating ?? "4.0"}</letterboxd:memberRating>
    <description><![CDATA[<p><img src="https://a.ltrbxd.com/p.jpg"/></p> <p>${o.prose}</p>]]></description>
  </item>`;

const feed = (...items: string[]) =>
  `<?xml version="1.0"?><rss xmlns:letterboxd="https://letterboxd.com" xmlns:tmdb="https://themoviedb.org"><channel>${items.join("")}</channel></rss>`;

const snapshotWith = () => ({
  capturedAt: "2026-10-01T00:00:00Z",
  summary: { totalReviews: 1 },
  films: [
    {
      id: "alpha-2020",
      letterboxdSlug: "alpha",
      letterboxdUrl: "",
      title: "Alpha",
      releaseYear: 2020,
      liked: false,
      reviews: [
        {
          guid: "g1",
          watchedDate: "2026-10-01",
          reviewDate: "2026-10-01",
          rating: 4,
          rewatch: false,
          reviewText: "Good.",
        },
      ],
      tmdb: null,
    },
  ],
  filmById: {},
});

describe("isTextlessEntry", () => {
  it("reads Letterboxd's generated line as no review", () => {
    expect(isTextlessEntry({ reviewText: "Watched on Saturday October 18, 2026." })).toBe(true);
    expect(isTextlessEntry({ reviewText: "Rewatched on Monday January 5, 2026." })).toBe(true);
    expect(isTextlessEntry({ reviewText: "" })).toBe(true);
  });

  it("keeps real prose, including prose that starts the same way", () => {
    expect(isTextlessEntry({ reviewText: "Sorry, no." })).toBe(false);
    expect(
      isTextlessEntry({ reviewText: "Watched on a plane, which did it no favours." }),
    ).toBe(false);
  });
});

describe("refreshSnapshotIncremental — logs with no review", () => {
  afterEach(() => vi.unstubAllGlobals());
  const stubFeed = (xml: string) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(xml)));

  it("records a text-less log instead of publishing it, and creates no film", async () => {
    stubFeed(
      feed(
        item({ guid: "g1", title: "Alpha", year: 2020, date: "2026-10-01", prose: "Good." }),
        item({
          guid: "g2",
          title: "Beta",
          year: 2021,
          date: "2026-10-18",
          rating: "3.5",
          prose: "Watched on Saturday October 18, 2026.",
        }),
      ),
    );
    const result = await refreshSnapshotIncremental({ prevSnapshot: snapshotWith() });
    expect(result.changed).toBe(true);
    expect(result.newFilms).toEqual([]);
    expect(result.newReviews).toEqual([]);
    expect(result.unreviewedChanges).toBe(1);
    const snap = result.snapshot as {
      films: { reviews: unknown[] }[];
      unreviewedLogs: Record<string, unknown>[];
    };
    expect(snap.films).toHaveLength(1);
    expect(snap.unreviewedLogs).toEqual([
      expect.objectContaining({ key: "g2", filmTitle: "Beta", filmYear: 2021, rating: 3.5 }),
    ]);
  });

  it("is a no-op when the same text-less log is seen again", async () => {
    const prev = { ...snapshotWith(), unreviewedLogs: [] as unknown[] };
    const xml = feed(
      item({ guid: "g2", title: "Alpha", year: 2020, date: "2026-10-18", prose: "Watched on Saturday October 18, 2026." }),
    );
    stubFeed(xml);
    const first = await refreshSnapshotIncremental({ prevSnapshot: prev });
    stubFeed(xml);
    const second = await refreshSnapshotIncremental({ prevSnapshot: first.snapshot });
    expect(second.changed).toBe(false);
  });

  it("publishes the review and clears the record once prose is added", async () => {
    const prev = {
      ...snapshotWith(),
      unreviewedLogs: [{ key: "g2", filmTitle: "Alpha", filmYear: 2020 }],
    };
    stubFeed(
      feed(
        item({ guid: "g2", title: "Alpha", year: 2020, date: "2026-10-18", prose: "Better the second time." }),
      ),
    );
    const result = await refreshSnapshotIncremental({ prevSnapshot: prev });
    const snap = result.snapshot as {
      films: { reviews: { reviewText: string }[] }[];
      unreviewedLogs: unknown[];
    };
    expect(snap.unreviewedLogs).toEqual([]);
    expect(snap.films[0].reviews.map((r) => r.reviewText)).toContain(
      "Better the second time.",
    );
  });
});
