import { describe, it, expect } from "vitest";
import {
  dimensionState,
  setDimensionValue,
  cycleDimensionValue,
} from "./filter-url-state";

describe("dimensionState", () => {
  it("reports include / exclude / neutral from a param string", () => {
    expect(dimensionState("horror,!comedy", "horror")).toBe("include");
    expect(dimensionState("horror,!comedy", "comedy")).toBe("exclude");
    expect(dimensionState("horror,!comedy", "drama")).toBe("neutral");
    expect(dimensionState(undefined, "horror")).toBe("neutral");
  });
});

describe("setDimensionValue", () => {
  it("adds an include, an exclude, and removes via neutral", () => {
    expect(setDimensionValue("", "horror", "include")).toBe("horror");
    expect(setDimensionValue("", "horror", "exclude")).toBe("!horror");
    expect(setDimensionValue("horror", "horror", "neutral")).toBe("");
  });

  it("moves a value across buckets without duplicating it", () => {
    // horror is currently included; excluding it must drop the include.
    expect(setDimensionValue("horror,thriller", "horror", "exclude")).toBe(
      "thriller,!horror",
    );
  });

  it("preserves the other values in the dimension", () => {
    expect(setDimensionValue("horror,!comedy", "drama", "include")).toBe(
      "horror,drama,!comedy",
    );
  });
});

describe("cycleDimensionValue (Style A)", () => {
  it("walks neutral → include → exclude → neutral", () => {
    let raw = "";
    raw = cycleDimensionValue(raw, "horror"); // → include
    expect(raw).toBe("horror");
    raw = cycleDimensionValue(raw, "horror"); // → exclude
    expect(raw).toBe("!horror");
    raw = cycleDimensionValue(raw, "horror"); // → neutral
    expect(raw).toBe("");
  });

  it("cycles one value while leaving siblings untouched", () => {
    // thriller stays included while comedy cycles neutral → include.
    expect(cycleDimensionValue("thriller", "comedy")).toBe("thriller,comedy");
  });
});
