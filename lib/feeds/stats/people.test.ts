// Unit tests for the actor/creator eligibility rules.

import { describe, expect, it } from "vitest";
import {
  creatorNames,
  filmActorNames,
  isActingShow,
  tvActorNames,
} from "./people";

describe("filmActorNames", () => {
  it("takes the top-10 billed names", () => {
    const cast = Array.from({ length: 14 }, (_, i) => ({ id: i, name: `A${i}` }));
    const out = filmActorNames({ cast });
    expect(out).toHaveLength(10);
    expect(out[0]).toBe("A0");
    expect(out.at(-1)).toBe("A9");
  });
});

describe("tvActorNames", () => {
  it("keeps top-10 billed with ≥3 episodes (slice THEN filter)", () => {
    const cast = [
      { id: 1, name: "Lead", eps: 50 },
      { id: 2, name: "Recurring", eps: 3 },
      { id: 3, name: "Guest", eps: 1 },
    ];
    expect(tvActorNames({ cast })).toEqual(["Lead", "Recurring"]);
  });
  it("drops a top-billed one-off guest (eps < 3)", () => {
    expect(tvActorNames({ cast: [{ id: 1, name: "OneOff", eps: 1 }] })).toEqual(
      [],
    );
  });
});

describe("isActingShow", () => {
  it("excludes non-acting types and genres", () => {
    expect(isActingShow({ type: "Reality", genres: [] })).toBe(false);
    expect(isActingShow({ type: "Scripted", genres: ["Drama"] })).toBe(true);
    // Reality typed as Miniseries still caught via the genre net (ANTM).
    expect(isActingShow({ type: "Miniseries", genres: ["Reality"] })).toBe(
      false,
    );
  });
});

describe("creatorNames", () => {
  it("demotes pure source-material authors", () => {
    const creators = [
      { id: 1, name: "Ryan Condal" },
      { id: 2, name: "George R.R. Martin" },
    ];
    expect(creatorNames({ creators })).toEqual(["Ryan Condal"]);
  });
});
