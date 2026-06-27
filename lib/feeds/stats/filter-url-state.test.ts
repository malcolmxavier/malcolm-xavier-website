import { describe, it, expect } from "vitest";
import {
  dimensionState,
  setDimensionValue,
  cycleDimensionValue,
  withCarriedFilters,
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

describe("withCarriedFilters", () => {
  it("carries the page's other filters onto a canonical facet route, dropping the pinned key", () => {
    // Clicking a studio tile while filtered by rating + decade lands on the
    // studio route still scoped by rating + decade; the old studio value (if
    // any) is replaced by the route's own slug, so it's dropped from the carry.
    const active = new URLSearchParams("rating=4&studio=old&decade=2010s");
    expect(withCarriedFilters("/films/studio/a24", active, ["studio"])).toBe(
      "/films/studio/a24?rating=4&decade=2010s",
    );
  });

  it("auto-drops a ?param= builder's own key, no explicit pin needed", () => {
    // A rating bar emits ?rating=; the page's genre filter rides along, and the
    // clicked rating wins over any active rating.
    const active = new URLSearchParams("genre=horror&rating=3");
    expect(withCarriedFilters("/films/reviews?rating=4", active)).toBe(
      "/films/reviews?genre=horror&rating=4",
    );
  });

  it("preserves an exclude-mirrored dimension value verbatim", () => {
    // The "!comedy" exclude is encoded inside the genre param value, so carrying
    // the whole param carries the exclusion too (decoded round-trip).
    const active = new URLSearchParams("genre=horror,!comedy");
    const href = withCarriedFilters("/films/studio/a24", active, ["studio"]);
    const carried = new URLSearchParams(href.split("?")[1]);
    expect(carried.get("genre")).toBe("horror,!comedy");
  });

  it("is a no-op when no filters are active", () => {
    expect(withCarriedFilters("/films/reviews?rating=4", new URLSearchParams())).toBe(
      "/films/reviews?rating=4",
    );
    expect(
      withCarriedFilters("/films/studio/a24", new URLSearchParams(), ["studio"]),
    ).toBe("/films/studio/a24");
  });

  it("never mutates the active params it reads", () => {
    const active = new URLSearchParams("rating=4&studio=old");
    withCarriedFilters("/films/studio/a24", active, ["studio"]);
    expect(active.toString()).toBe("rating=4&studio=old");
  });
});
