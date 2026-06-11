// ─────────────────────────────────────────────────────────────────
// TV network canonicalization — shared source of truth.
//
// Ported verbatim from the stats sketch (_private/_sketches/
// build-stats-sketch.mjs) so production reviews/landing surfaces and
// the future stats dashboards agree on one network vocabulary. Before
// this existed, raw TMDB network strings rendered directly, so "HBO",
// "HBO Max", and "Max" read as three separate destinations.
//
// This file is the first occupant of lib/feeds/stats/ — the COMPUTE
// layer Workstream 4 fills out with the rest of the ported math
// (shrinkage, franchise families, studio canon, etc.). It lives here,
// not in serializd-utils.ts, because it's stats-domain logic that
// reviews happens to also consume, and WS4/WS5 import it from here.
//
// Pure data + pure functions, zero deps and no server-only barrier —
// safe to import from Server Components (the reviews pages, the detail
// page) and from client components alike.
// ─────────────────────────────────────────────────────────────────

/**
 * Brand-variant → canonical network name. Collapses the same
 * destination's multiple TMDB labels into one: HBO / HBO Max / Max
 * all read as "HBO / Max"; Showtime folds into Paramount+ (its
 * current streaming home). Anything not listed passes through
 * unchanged via canonNet().
 */
export const NETWORK_ALIAS: Record<string, string> = {
  HBO: "HBO / Max",
  "HBO Max": "HBO / Max",
  Max: "HBO / Max",
  "Apple TV": "Apple TV+",
  Showtime: "Paramount+",
  "Paramount+ with Showtime": "Paramount+",
};

/** Canonicalize a single raw TMDB network name. Unknown names pass through. */
export function canonNet(network: string): string {
  return NETWORK_ALIAS[network] || network;
}

/**
 * Canonical network → parent conglomerate. Used by the stats
 * "by conglomerate" rollups (not by WS3's filter/badge work, but
 * ported now so the file is complete for WS4/WS5). Unmapped networks
 * (BBC, ITV, Channel 4, AMC, MUBI, Nippon TV, Crave, Lifetime, etc.)
 * fall to "Independent / other" via conglomerateOfNet().
 */
export const NETWORK_PARENT: Record<string, string> = {
  Netflix: "Netflix",
  "HBO / Max": "Warner Bros. Discovery",
  Discovery: "Warner Bros. Discovery",
  "Investigation Discovery": "Warner Bros. Discovery",
  "Adult Swim": "Warner Bros. Discovery",
  Hulu: "Disney",
  ABC: "Disney",
  FX: "Disney",
  "Disney Channel": "Disney",
  "Disney XD": "Disney",
  Peacock: "NBCUniversal",
  NBC: "NBCUniversal",
  Bravo: "NBCUniversal",
  "E!": "NBCUniversal",
  "Sky Atlantic": "NBCUniversal",
  "Prime Video": "Amazon",
  "Apple TV+": "Apple",
  "Paramount+": "Paramount",
};

/**
 * Roll a show up to the conglomerate that owns one of its networks.
 * Iterates the show's networks, canonicalizing each, and returns the
 * first mapped parent — short-circuit so the primary broadcaster
 * wins. Returns "Independent / other" when nothing maps.
 */
export function conglomerateOfNet(networks: string[]): string {
  for (const n of networks) {
    const parent = NETWORK_PARENT[canonNet(n)];
    if (parent) return parent;
  }
  return "Independent / other";
}

/**
 * Curated direction-of-travel overrides for the few shows that
 * genuinely moved networks. TMDB's network array order isn't
 * reliably chronological, so these are hand-maintained. Carried for
 * completeness (the stats multi-network tile consumes them); WS3's
 * filter/badge work doesn't read this map.
 */
export const NETWORK_MOVES: Record<string, string> = {
  "9-1-1": "Fox → ABC",
  You: "Lifetime → Netflix",
  Girls5eva: "Peacock → Netflix",
};

/**
 * The show's primary network, canonicalized — TMDB lists the
 * primary (original) broadcaster first, so we take networks[0] and
 * canonicalize it. This is the single rule both the detail-page
 * network line and the TV-reviews network filter call, so a show
 * appears under exactly one network destination (never several) and
 * the displayed label always matches the filter chip. Returns null
 * for a show with no networks.
 */
export function primaryNetwork(networks: string[]): string | null {
  const first = networks[0];
  return first ? canonNet(first) : null;
}
