import { describe, it, expect } from "vitest";
import { nextTriState, triStateAriaLabel, type TriState } from "./tri-state";

describe("nextTriState", () => {
  it("cycles neutral → include → exclude → neutral (Style A)", () => {
    expect(nextTriState("neutral")).toBe("include");
    expect(nextTriState("include")).toBe("exclude");
    expect(nextTriState("exclude")).toBe("neutral");
  });

  it("returns to the start after a full three-click cycle", () => {
    let s: TriState = "neutral";
    s = nextTriState(s);
    s = nextTriState(s);
    s = nextTriState(s);
    expect(s).toBe("neutral");
  });
});

describe("triStateAriaLabel", () => {
  it("names the current state AND the next action for each state", () => {
    expect(triStateAriaLabel("Horror", "neutral")).toBe(
      "Horror: not filtered — activate to include",
    );
    expect(triStateAriaLabel("Horror", "include")).toBe(
      "Horror: included — activate to exclude",
    );
    expect(triStateAriaLabel("Horror", "exclude")).toBe(
      "Horror: excluded — activate to clear",
    );
  });
});
