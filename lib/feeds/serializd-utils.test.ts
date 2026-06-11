// ─────────────────────────────────────────────────────────────────
// Tests for the WS3 network + type card filters in serializd-utils.ts.
//
// Focused on the two new predicates in applyCompletedCardFilters and
// their parsing in parseShowFilters. The network predicate matches on
// the canonical PRIMARY network (so an "HBO / Max" filter catches a
// show whose TMDB primary broadcaster is raw "HBO"), and a show lands
// under exactly one network — never several.
//
// Card/show objects are minimal partials cast to the public types:
// the predicates touch only tmdb.networks, tmdb.type, premiereYear,
// and review.reviewDate (for the sort), so a full snapshot fixture
// would be noise here.
// ─────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  applyCompletedCardFilters,
  parseShowFilters,
  type CompletedCard,
  type Review,
  type Show,
} from "./serializd-utils";

/** Minimal completed card for the network/type predicate tests. */
function makeCard(
  id: string,
  networks: string[],
  type: string,
): CompletedCard {
  const review = {
    id: 1,
    level: "show",
    rating: 4,
    reviewDate: "2026-01-01",
    watchedDate: "2026-01-01",
  } as unknown as Review;
  const show = {
    id,
    name: id,
    premiereYear: 2020,
    reviews: [review],
    tmdb: { networks, type, genres: [] },
  } as unknown as Show;
  return { show, review, cardKind: "show", seasonNumber: null };
}

describe("applyCompletedCardFilters — network", () => {
  it("matches on the canonical primary network (HBO → HBO / Max)", () => {
    const cards = [
      makeCard("a", ["HBO"], "Scripted"),
      makeCard("b", ["Netflix"], "Scripted"),
    ];
    const result = applyCompletedCardFilters(cards, {
      networks: ["HBO / Max"],
    });
    expect(result.map((c) => c.show.id)).toEqual(["a"]);
  });

  it("matches the primary network only, not secondary ones", () => {
    // Fox → ABC: the show's primary is Fox, so an ABC filter must NOT
    // catch it (one show, one network).
    const cards = [makeCard("a", ["Fox", "ABC"], "Scripted")];
    expect(
      applyCompletedCardFilters(cards, { networks: ["ABC"] }),
    ).toHaveLength(0);
    expect(
      applyCompletedCardFilters(cards, { networks: ["Fox"] }),
    ).toHaveLength(1);
  });

  it("ORs within the facet across canonical names", () => {
    const cards = [
      makeCard("a", ["HBO"], "Scripted"),
      makeCard("b", ["Netflix"], "Scripted"),
      makeCard("c", ["Hulu"], "Scripted"),
    ];
    const result = applyCompletedCardFilters(cards, {
      networks: ["HBO / Max", "Netflix"],
    });
    expect(result.map((c) => c.show.id).sort()).toEqual(["a", "b"]);
  });
});

describe("applyCompletedCardFilters — type", () => {
  it("keeps only the selected TMDB series types", () => {
    const cards = [
      makeCard("a", ["HBO"], "Miniseries"),
      makeCard("b", ["HBO"], "Scripted"),
      makeCard("c", ["HBO"], "Reality"),
    ];
    const result = applyCompletedCardFilters(cards, {
      types: ["Miniseries", "Reality"],
    });
    expect(result.map((c) => c.show.id).sort()).toEqual(["a", "c"]);
  });
});

describe("parseShowFilters — network + type", () => {
  it("parses CSV network and type params", () => {
    const filters = parseShowFilters({
      network: "HBO / Max,Netflix",
      type: "Scripted",
    });
    expect(filters.networks).toEqual(["HBO / Max", "Netflix"]);
    expect(filters.types).toEqual(["Scripted"]);
  });

  it("omits the keys entirely when absent", () => {
    const filters = parseShowFilters({});
    expect(filters.networks).toBeUndefined();
    expect(filters.types).toBeUndefined();
  });
});
