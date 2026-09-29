import { describe, expect, it } from "vitest";
import { ESSAYS } from "@/lib/writing/essays";
import { CASE_STUDIES } from "@/app/resume/resume-data";
import { READ_TIMES, readMinutes, WORDS_PER_MINUTE } from "./read-times";

// These tests are the loud failure for a stale generated file. Adding an
// essay or a case study without running `npm run readtimes:build` fails
// here, with the slug named, rather than shipping a page whose reading
// time is quietly absent.
describe("reading times", () => {
  it("covers every registered essay", () => {
    const missing = ESSAYS.filter((e) => !READ_TIMES.essay[e.slug]).map((e) => e.slug);
    expect(missing).toEqual([]);
  });

  it("covers every registered case study", () => {
    const missing = CASE_STUDIES.filter((s) => !READ_TIMES["case-study"][s.slug]).map(
      (s) => s.slug,
    );
    expect(missing).toEqual([]);
  });

  it("throws on an unknown slug rather than returning nothing", () => {
    expect(() => readMinutes("essay", "not-an-essay")).toThrow(/readtimes:build/);
  });

  it("never reports less than a minute", () => {
    const all = Object.values(READ_TIMES).flatMap((byKind) => Object.values(byKind));
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((e) => e.minutes >= 1)).toBe(true);
  });

  it("derives minutes from words at the stated rate", () => {
    const all = Object.values(READ_TIMES).flatMap((byKind) => Object.values(byKind));
    for (const e of all) {
      expect(e.minutes).toBe(Math.max(1, Math.round(e.words / WORDS_PER_MINUTE)));
    }
  });
});
