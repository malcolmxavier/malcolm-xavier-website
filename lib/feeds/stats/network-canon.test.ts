// ─────────────────────────────────────────────────────────────────
// Tests for the network canonicalization ported from the stats
// sketch into lib/feeds/stats/network-canon.ts.
//
// The port must be provably faithful to the sketch — these lock the
// brand merges (HBO / HBO Max / Max → "HBO / Max"; Showtime →
// Paramount+), the primary-network rule, and the conglomerate
// rollup + "Independent / other" fallback.
// ─────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  canonNet,
  conglomerateOfNet,
  primaryNetwork,
} from "./network-canon";

describe("canonNet", () => {
  it("merges HBO, HBO Max, and Max into one canonical destination", () => {
    expect(canonNet("HBO")).toBe("HBO / Max");
    expect(canonNet("HBO Max")).toBe("HBO / Max");
    expect(canonNet("Max")).toBe("HBO / Max");
  });

  it("folds Showtime (and its bundle) into Paramount+", () => {
    expect(canonNet("Showtime")).toBe("Paramount+");
    expect(canonNet("Paramount+ with Showtime")).toBe("Paramount+");
  });

  it("normalizes Apple TV to Apple TV+", () => {
    expect(canonNet("Apple TV")).toBe("Apple TV+");
  });

  it("passes unknown networks through unchanged", () => {
    expect(canonNet("Netflix")).toBe("Netflix");
    expect(canonNet("BBC One")).toBe("BBC One");
  });
});

describe("primaryNetwork", () => {
  it("takes the first network and canonicalizes it", () => {
    // A show whose TMDB primary broadcaster is HBO surfaces under the
    // merged "HBO / Max" destination, not raw "HBO".
    expect(primaryNetwork(["HBO"])).toBe("HBO / Max");
  });

  it("ignores non-primary networks (only networks[0] counts)", () => {
    // 9-1-1 (Fox → ABC): the first entry wins so the show lands under
    // exactly one network, never both.
    expect(primaryNetwork(["Fox", "ABC"])).toBe("Fox");
  });

  it("returns null for a show with no networks", () => {
    expect(primaryNetwork([])).toBeNull();
  });
});

describe("conglomerateOfNet", () => {
  it("rolls a canonical network up to its parent conglomerate", () => {
    expect(conglomerateOfNet(["HBO"])).toBe("Warner Bros. Discovery");
    expect(conglomerateOfNet(["Hulu"])).toBe("Disney");
    expect(conglomerateOfNet(["Prime Video"])).toBe("Amazon");
  });

  it("short-circuits on the first mapped network", () => {
    // First network maps → its parent wins even if later ones also map.
    expect(conglomerateOfNet(["NBC", "Netflix"])).toBe("NBCUniversal");
  });

  it("falls back to Independent / other when nothing maps", () => {
    expect(conglomerateOfNet(["BBC One"])).toBe("Independent / other");
    expect(conglomerateOfNet([])).toBe("Independent / other");
  });
});
