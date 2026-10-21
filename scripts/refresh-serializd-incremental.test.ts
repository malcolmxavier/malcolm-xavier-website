import { afterEach, describe, expect, it, vi } from "vitest";

import {
  editedFields,
  probeForNewReviews,
} from "./refresh-serializd-incremental.mjs";

// A raw Serializd diary entry, in the API's own shape.
const raw = (over: Record<string, unknown> = {}) => ({
  id: 7,
  showId: 1,
  seasonId: 10,
  rating: 8,
  like: false,
  reviewText: "",
  containsSpoiler: false,
  isRewatch: false,
  isLog: true,
  backdate: "2026-10-16T12:00:00Z",
  dateAdded: "2026-10-16T18:09:56Z",
  ...over,
});

// The same entry as the snapshot stores it after normalizeReview.
const known = {
  id: 7,
  rating: 4,
  liked: false,
  reviewText: "",
  containsSpoiler: false,
  isRewatch: false,
  watchedDate: "2026-10-16T12:00:00Z",
};

describe("editedFields", () => {
  it("reads an unchanged review as unedited despite the reshaped fields", () => {
    expect(editedFields(known, raw())).toEqual([]);
  });

  it("names each field an edit moved", () => {
    expect(editedFields(known, raw({ reviewText: "Added later." }))).toEqual([
      "reviewText",
    ]);
    expect(
      editedFields(known, raw({ rating: 9, backdate: "2024-01-01T00:00:00Z" })),
    ).toEqual(["rating", "watchedDate"]);
    expect(editedFields(known, raw({ like: true }))).toEqual(["liked"]);
  });
});

describe("probeForNewReviews", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubDiary = (reviews: unknown[]) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ reviews }))),
    );
  const snapshot = { shows: [{ reviews: [known] }] };

  it("is a no-op when every probed review is known and unedited", async () => {
    stubDiary([raw()]);
    const probe = await probeForNewReviews(snapshot);
    expect(probe.hasNew).toBe(false);
    expect(probe.editedReviews).toEqual([]);
  });

  it("asks for a rewrite when a known review was edited", async () => {
    stubDiary([raw({ reviewText: "Added later." })]);
    const probe = await probeForNewReviews(snapshot);
    expect(probe.hasNew).toBe(true);
    expect(probe.newReviews).toEqual([]);
    expect(probe.editedReviews).toEqual([{ id: 7, fields: ["reviewText"] }]);
  });
});
