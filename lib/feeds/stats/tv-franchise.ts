// ─────────────────────────────────────────────────────────────────
// TV franchise families — the curated spinoff/universe map (WS7).
//
// Unlike film (where TMDB ships a `collection` per franchise), TMDB has
// NO show-family concept: 9-1-1 / Lone Star / Nashville don't self-group,
// and the Bravo reality universe certainly doesn't. So TV families are a
// fully HAND-CURATED map (Malcolm, 2026-06-13) — there's no external
// signal to fall back on, which also means no padding noise to guard
// against (the reason the film route floor is 3; TV's is 2).
//
// Two-level hierarchy. A family may declare a `parent`, so a show in a
// subcollection is ALSO a member of the parent collection:
//
//   Bravo                         (parent collection — the Bravo-verse)
//   ├── The Real Housewives       (subcollection)
//   └── Vanderpump Rules          (subcollection — incl. The Valley)
//
// Membership is curated at the SUBcollection level only (TV_FAMILY_BY_SHOW
// maps a show to its most specific family); parent membership is derived by
// walking `parent` links in familiesOfShow. That keeps the curated surface
// small and the hierarchy single-sourced.
//
// Ship-and-flag (defaults, easily redlined — they're just this config):
//   • Bravo is two-tier (see `network` below + showsAttributedToTvFamily).
//     The HUB + counts stay the curated connected universe: exactly the
//     Real Housewives + Vanderpump families. The Bravo LEAF page is the
//     catch-all — it additionally surfaces every other show that aired on
//     the Bravo network, so a network-only title (e.g. Watch What Happens
//     Live) is discoverable there even though it isn't curated.
//   • Real Housewives = the direct RH franchises only. It EXCLUDES spinoff
//     specials (the RHOA "Porsha's Having a Baby" special) and crossovers
//     ("Wife Swap: The Real Housewives Edition") — those still appear on the
//     network-backed Bravo leaf, just not in the curated RH sub-collection.
//   • Vanderpump Rules = Vanderpump Rules + The Valley. It excludes
//     "Vanderpump Villa" (a separate Vanderpump-brand show on Hulu).
//   • "The Valley: Persian Style" is standalone (no family) per Malcolm.
//
// Pure functions, zero deps — safe for the client-safe facet-index to import.
// ─────────────────────────────────────────────────────────────────

/** One curated TV family. `parent` (optional) is the family key of the
 *  collection this one rolls up into (the Bravo-verse hierarchy). `network`
 *  (optional) opts the family's LEAF page into network attribution: the
 *  collection page additionally surfaces every logged show that aired on
 *  that network, even ones outside the curated map (see
 *  showsAttributedToTvFamily). The hub + counts stay curated regardless. */
export type TvFamily = { name: string; parent?: string; network?: string };

/** Family key → display name (+ parent). Keys are stable internal handles;
 *  `name` is what the route slug + copy use. */
export const TV_FAMILIES: Record<string, TvFamily> = {
  // Bravo declares `network: "Bravo"` so its LEAF page is the catch-all for
  // the Bravo-verse: the curated Real Housewives + Vanderpump families PLUS
  // any other show that aired on Bravo (e.g. Watch What Happens Live, which
  // is only reviewed at the episode level and so has no other home). The hub
  // still renders Bravo as exactly its two curated sub-collections.
  bravo: { name: "Bravo", network: "Bravo" },
  "real-housewives": { name: "The Real Housewives", parent: "bravo" },
  "vanderpump-rules": { name: "Vanderpump Rules", parent: "bravo" },
  "9-1-1": { name: "9-1-1" },
  "greys-anatomy": { name: "Grey's Anatomy" },
  selling: { name: "Selling" },
  "game-of-thrones": { name: "Game of Thrones" },
  "interview-with-the-vampire": { name: "Interview with the Vampire" },
};

/**
 * Show TMDB id → its MOST SPECIFIC curated family key(s). Parent
 * collections (Bravo) are NOT listed here — they're derived from the
 * subcollection's `parent` link in familiesOfShow. A show absent from this
 * map belongs to no family.
 */
export const TV_FAMILY_BY_SHOW: Record<number, string[]> = {
  // 9-1-1 universe
  75219: ["9-1-1"], // 9-1-1
  89393: ["9-1-1"], // 9-1-1: Lone Star
  284838: ["9-1-1"], // 9-1-1: Nashville

  // Bravo › The Real Housewives — direct franchises only. The RHOA
  // "Porsha's Having a Baby" spinoff special (104756) is deliberately NOT
  // here (per Malcolm, editorial: sub-collection = direct franchises, not
  // spinoffs); it still surfaces on the network-backed Bravo leaf.
  17380: ["real-housewives"], // The Real Housewives of Atlanta
  32390: ["real-housewives"], // The Real Housewives of Beverly Hills
  14808: ["real-housewives"], // The Real Housewives of New York City
  290883: ["real-housewives"], // The Real Housewives of Rhode Island
  110381: ["real-housewives"], // The Real Housewives of Salt Lake City

  // Bravo › Vanderpump Rules. Vanderpump Villa airs on Hulu, not Bravo —
  // membership is by show, not network, so it folds in regardless (per
  // Malcolm, 2026-06-13).
  61581: ["vanderpump-rules"], // Vanderpump Rules
  247758: ["vanderpump-rules"], // The Valley
  245263: ["vanderpump-rules"], // Vanderpump Villa (Hulu)

  // Grey's Anatomy
  1416: ["greys-anatomy"], // Grey's Anatomy
  76773: ["greys-anatomy"], // Station 19

  // Selling
  87826: ["selling"], // Selling Sunset
  139566: ["selling"], // Selling the OC

  // Game of Thrones (the original isn't logged; the family is the two
  // descendant series Malcolm has reviewed).
  94997: ["game-of-thrones"], // House of the Dragon
  224372: ["game-of-thrones"], // A Knight of the Seven Kingdoms

  // Interview with the Vampire (Anne Rice's Immortal Universe). The Vampire
  // Lestat premiered 2026-06-07 — its first-episode review lands in the next
  // snapshot refresh, at which point this family clears the 2-show floor and
  // its route + hub card light up automatically.
  128098: ["interview-with-the-vampire"], // Interview with the Vampire
  323411: ["interview-with-the-vampire"], // The Vampire Lestat
};

/**
 * The full set of family keys a show belongs to — its curated
 * subcollection key(s) plus every ancestor (parent) collection. e.g. The
 * Valley → ["vanderpump-rules", "bravo"]. Order is specific → general.
 */
export function familiesOfShow(tmdbId: number): string[] {
  const direct = TV_FAMILY_BY_SHOW[tmdbId] ?? [];
  const out: string[] = [];
  for (const key of direct) {
    let k: string | undefined = key;
    while (k && !out.includes(k)) {
      out.push(k);
      k = TV_FAMILIES[k]?.parent;
    }
  }
  return out;
}

/** Display name for a family key (falls back to the key if unknown). */
export function tvFamilyName(key: string): string {
  return TV_FAMILIES[key]?.name ?? key;
}

/** The immediate subcollection keys of a family (its direct children in the
 *  hierarchy) — for the parent route + hub to list what's nested inside. */
export function tvSubfamilies(parentKey: string): string[] {
  return Object.entries(TV_FAMILIES)
    .filter(([, v]) => v.parent === parentKey)
    .map(([k]) => k);
}
