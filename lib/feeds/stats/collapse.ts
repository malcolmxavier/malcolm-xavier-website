// The recursive collapse system (STATS-FILTERS-SPEC §6).
//
// One rule applied at three altitudes — tile, band, page. Degradation is
// NOT a corpus-count floor; it's about *which tiles break*. Counters
// tolerate thinness; distributions don't. Each tile carries a robustness
// archetype (its floor) and a band membership; the engine takes the
// per-tile surviving-n (after the existing min-count + Bayesian-shrinkage
// gates upstream) and emits, for every tile, its ladder rung; for every
// band, its state; and a single page verdict.
//
// This module is pure and data-only — no React, no DOM. The dashboards
// compute the collapse decisions server-side from the narrowed result and
// bake them into the response (§9), so the UI never flashes a broken chart.

// ---------------------------------------------------------------------------
// Archetypes and their floors
// ---------------------------------------------------------------------------

// The robustness archetype of a tile's primary chart. A composite
// "counter+bar" tile is classified by its more fragile sub-component (the
// bar) for the floor; its counter portion may still survive for
// band-readout purposes (see `tileOwnsRobustCounter`).
export type Archetype =
  | "counter"
  | "single-axis-bar"
  | "donut"
  | "versus"
  | "diverging"
  | "dumbbell"
  | "stacked-by-year"
  | "heatmap"
  | "line";

// Minimum surviving n in the tile's primary axis below which the chart is
// noise. EXACTLY per spec §6. For "donut" the floor is in categories; for
// "versus" it is per-column; for "dumbbell" it is shared rows.
export const ARCHETYPE_FLOORS: Record<Archetype, number> = {
  counter: 1,
  "single-axis-bar": 5,
  donut: 2,
  versus: 3,
  diverging: 15,
  dumbbell: 8,
  "stacked-by-year": 10,
  heatmap: 25,
  line: 20,
};

// A counter is the only archetype robust enough to anchor a band-readout
// when the rest of the band's charts fold (spec §6 altitude 2).
const ROBUST_COUNTER: Archetype = "counter";

// Films / television hand off to the reviews list only when the filtered
// corpus is this small or smaller (count of surviving films / shows). Below
// this the slice is too thin to populate even a single honest chart, so the
// dashboard adds nothing the reviews list doesn't say better. Above it we
// keep the dashboard — the analysis over 39 real filter slices showed the
// page is never barren above N≈1 (min 12 click-targets, 5 live bands even at
// N=1), so a low, raw-N gate is the honest trigger. Replaces the earlier
// escaped-genre signal, which ejected rich dashboards because it tracked one
// tile's statistical viability rather than whole-page value.
const HANDOFF_MAX_N = 3;

// ---------------------------------------------------------------------------
// The degradation ladder (per tile)
// ---------------------------------------------------------------------------

// T0 Full → T1 Thinned → T2 Skeletal → T3 Empty.
// - T0: n comfortably clears the floor — render the chart.
// - T1: n near the floor — still renders the chart, with NO caption. "Few
//       surviving categories" isn't "few entries" (3.5★ can sit on hundreds
//       of films), so it makes no thinness claim; visually identical to T0
//       today, kept distinct for an optional future near-floor treatment.
// - T2: below floor OR self-referenced to a single value — collapse to a
//       readout (the headline number, no chart).
// - T3: zero surviving values — suppress entirely (no empty stub; rolls
//       into the band footnote).
export type LadderRung = "T0" | "T1" | "T2" | "T3";

// The band a tile in the page belongs to. Bands are the §6 altitude-2 unit
// (`StatsSection`). Labels match the page sources / spec §5.
export type BandId = string;

// ---------------------------------------------------------------------------
// Tile and band catalog
// ---------------------------------------------------------------------------

// Static description of a tile: its archetype, the band it sits in, and an
// optional flag that this tile is the band's robust counter (the one whose
// survival lets the band degrade to a band-readout rather than a footnote).
export interface TileSpec {
  id: string;
  archetype: Archetype;
  band: BandId;
  // True for the tile that anchors a band-readout when the band collapses.
  // Only meaningful for `counter` archetype tiles. Spec §6 names "Lifetime"
  // for the corpus band and "World cinema lean" for the where-it-comes-from
  // band as the canonical robust counters.
  bandCounter?: boolean;
  // Navigational tiles whose every surviving category is a click-through into
  // reviews (a rating bar → reviews at that rating; a genre bar → reviews in
  // that genre). These never collapse to a readout below their chart floor or
  // under self-reference — a single clickable bar still earns its place. They
  // ride the T0/T1 boundary down to one value and only vanish (T3) at zero.
  // (The chart-to-navigate decision: a thin bar chart is a poor distribution
  // but a perfectly good set of links.)
  immortal?: boolean;
  // Per-tile floor override. When set, replaces ARCHETYPE_FLOORS[archetype]
  // for this tile — used where a tile's surviving-n is measured on a bespoke
  // axis. genres-vs-baseline counts genres that have escaped shrinkage (not
  // the raw corpus), so its floor is a small genre count, not the diverging 15.
  floor?: number;
}

// Runtime input: how many items survived in this tile's primary axis under
// the active predicate, plus whether the active filter self-references this
// tile (its primary axis IS the filtered dimension, so it goes degenerate
// to one value → forced T2 Skeletal readout, spec §5/§6).
export interface TileSurvival {
  id: string;
  survivingN: number;
  // Set when the filtered dimension is this tile's primary axis. Forces T2
  // regardless of survivingN — a genre-filtered Genres tile is a readout,
  // not a one-bar chart.
  selfReferenced?: boolean;
  // Set when a composite tile's SECONDARY axis fell below floor — e.g. a
  // versus tile whose "highest-rated" column emptied while "most-logged"
  // survives. Forces the tile to degrade to a readout (T2) of the surviving
  // axis rather than render a lopsided chart. Unlike a below-floor PRIMARY
  // axis it does NOT suppress: `survivingN` still reflects the surviving
  // column, so a non-zero survivor reads out instead of vanishing.
  degradeToReadout?: boolean;
}

// ---------------------------------------------------------------------------
// Page identity and verdict
// ---------------------------------------------------------------------------

export type PageId = "films" | "television" | "connected";

// The load-bearing band (spec §6 altitude 3). Films / television no longer
// hand off to reviews on a Taste-claim signal — the page verdict is now a
// raw corpus-size gate (see HANDOFF_MAX_N). This name is retained for
// Connected's fallback "thinned out" detection: it has no
// single Taste band and never hands off to one reviews query (its figures
// blend both libraries), so it routes to connected-thin instead.
export const TASTE_BAND: BandId = "Taste";

// Per-tile decision: the ladder rung the tile renders at, plus a snapshot
// of why (handy for the band-footnote rollup and for tests).
export interface TileDecision {
  id: string;
  band: BandId;
  archetype: Archetype;
  rung: LadderRung;
  // True when the tile vanished into the band footnote (T3) or folded under
  // a band collapse — used to compose the footnote's "what was hidden" list.
  suppressed: boolean;
  // True for a versus tile rendering only its surviving PRIMARY column: its
  // secondary axis (the gated "highest-rated" side) fell below floor while the
  // primary held. The tile keeps its chart — the surviving column plus a short
  // "why the other side is withheld" panel — instead of collapsing to a bare
  // readout, so a healthy most-logged ranking isn't thrown away for want of a
  // rankable second column. It still renders a chart, so it counts as a
  // surviving chart for the band-collapse trigger.
  soloColumn?: boolean;
}

// A band's resolved state. One of:
// - "full": at least half its chart tiles survive — render normally.
// - "band-readout": collapsed, but it owns a surviving robust counter, so
//   the counter stays and the charts fold away.
// - "footnote": collapsed with no robust counter — degrades to a one-line
//   footnote naming the hidden breakdowns.
export type BandState = "full" | "band-readout" | "footnote";

export interface BandDecision {
  id: BandId;
  state: BandState;
  // Tiles (by id) that folded away and roll up into this band's footnote /
  // readout caption rather than rendering per-tile stubs (locked: footnote
  // rollup, spec §6 + Locked decision 3).
  hiddenTileIds: string[];
}

// The page-level outcome.
// - "dashboard": render the dashboard with whatever bands survived.
// - "reviews-handoff": the Taste band collapsed; replace the dashboard with
//   a reviews-funnel panel (films / television only).
// - "connected-thin": connected thinned out; keep the head-to-head counter
//   and point to the two per-cluster dashboards. Connected NEVER shows the
//   reviews-funnel panel (spec §6 Connected exception).
export type PageVerdict = "dashboard" | "reviews-handoff" | "connected-thin";

export interface CollapseResult {
  tiles: TileDecision[];
  bands: BandDecision[];
  verdict: PageVerdict;
}

// ---------------------------------------------------------------------------
// Per-tile ladder decision
// ---------------------------------------------------------------------------

// Decide a single tile's ladder rung from its surviving-n and floor.
//
// Rules (spec §6):
// - selfReferenced → T2 (degenerate to one value → readout).
// - survivingN === 0 → T3 (suppress).
// - survivingN < floor → T2 (below floor → readout).
// - survivingN within the "near floor" band → T1 (thinned). We treat
//   "near floor" as [floor, floor + thinMargin) where thinMargin scales
//   with the floor; counters (floor 1) never thin — a counter is either
//   present (T0) or absent (T3).
// - otherwise → T0 (full).
function decideRung(
  survivingN: number,
  archetype: Archetype,
  floor: number,
  selfReferenced: boolean,
  degradeToReadout: boolean,
  immortal: boolean,
): { rung: LadderRung; soloColumn: boolean } {
  // Immortal (navigational) tiles never collapse to a readout: each surviving
  // category is a click-through into reviews, useful even below the chart
  // floor or when the active filter self-references the tile. They render a
  // chart (T0/T1) down to a single value and only vanish (T3) when there is
  // nothing to plot or link. (decided for rating-distribution and genres.)
  if (immortal) {
    // Navigational tiles never read as "thin": their surviving-n counts
    // clickable categories (rating buckets, genres), not sample size — one bar
    // can stand for a large, concentrated corpus. So there's no honest thinning
    // signal to caption off the category count; render the chart (T0) whenever
    // there's anything to plot or link, and only an empty selection removes it
    // (T3). A genuine small-sample hint, if ever wanted, would key off the
    // corpus count (already shown by the lifetime counter), not bar-count.
    return { rung: survivingN > 0 ? "T0" : "T3", soloColumn: false };
  }

  // Self-reference collapses the tile to a single value regardless of n.
  if (selfReferenced) return { rung: "T2", soloColumn: false };
  // Zero surviving values: suppress, do not stub.
  if (survivingN <= 0) return { rung: "T3", soloColumn: false };

  // Below the floor: the chart would be noise — collapse to a readout.
  if (survivingN < floor) return { rung: "T2", soloColumn: false };

  // Past here the PRIMARY axis cleared its floor. A composite tile whose
  // SECONDARY axis fell below floor (e.g. a versus tile's emptied highest-rated
  // column) no longer collapses the whole tile to a readout — it keeps the
  // surviving primary column as a chart and flags `soloColumn` so the renderer
  // withholds the dead column behind an explanatory panel. This preserves a
  // healthy most-logged ranking instead of discarding it for a bare number.
  // (Checked after the primary-axis gates so a zero/below-floor primary still
  // wins T3/T2.)
  const soloColumn = degradeToReadout;

  // Counters don't have a "thinned" state — a single number is either there
  // or it isn't. (floor === 1 and we've already cleared 0.)
  if (archetype === "counter") return { rung: "T0", soloColumn: false };

  // "Near the floor" → thinned. The margin is a soft band just above the
  // floor; below `floor` is T2, at/above `floor + margin` is T0, and in
  // between is T1 with a thinning caption. Margin = ~40% of the floor
  // (min 1) so larger-floored charts get a proportionally wider warning
  // zone. This boundary is a presentation nicety, not a correctness gate;
  // tuned conservatively so a chart only claims "Full" when it has clear
  // headroom over its floor.
  const thinMargin = Math.max(1, Math.ceil(floor * 0.4));
  const rung: LadderRung = survivingN < floor + thinMargin ? "T1" : "T0";

  return { rung, soloColumn };
}

// A rung at which the tile still renders a chart (T0/T1). T2 is a readout
// (no chart) and T3 is suppressed — neither counts as a "surviving chart"
// for the band-collapse trigger.
function rungRendersChart(rung: LadderRung): boolean {
  return rung === "T0" || rung === "T1";
}

// The effective floor for a tile: its per-tile override if present, else the
// archetype default. The override exists for tiles whose surviving-n is on a
// bespoke axis (genres-vs-baseline's escaped-genre count, not the corpus).
function floorFor(tile: TileSpec): number {
  return tile.floor ?? ARCHETYPE_FLOORS[tile.archetype];
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

// Given the static tile catalog for a page and the per-tile surviving-n
// under the active predicate, decide every tile's rung, every band's state,
// and the page verdict.
//
// `tiles` is the catalog (order preserved in the output). `survival` is a
// map keyed by tile id; a missing entry is treated as zero surviving
// (defensive — an absent tile is the same as an empty one). `pageId`
// selects the page-verdict variant (connected has its own exception).
export function collapse(
  pageId: PageId,
  tiles: TileSpec[],
  survival: ReadonlyArray<TileSurvival>,
): CollapseResult {
  const survivalById = new Map<string, TileSurvival>();
  for (const s of survival) survivalById.set(s.id, s);

  // --- Altitude 1: per-tile ladder rung ----------------------------------
  const tileDecisions: TileDecision[] = tiles.map((tile) => {
    const s = survivalById.get(tile.id);
    const survivingN = s?.survivingN ?? 0;
    const selfReferenced = s?.selfReferenced ?? false;
    const degradeToReadout = s?.degradeToReadout ?? false;
    const { rung, soloColumn } = decideRung(
      survivingN,
      tile.archetype,
      floorFor(tile),
      selfReferenced,
      degradeToReadout,
      tile.immortal ?? false,
    );
    return {
      id: tile.id,
      band: tile.band,
      archetype: tile.archetype,
      rung,
      // Suppression (the "vanished into the footnote" flag) is finalized at
      // the band step below; T3 is suppressed up front, T2 readouts may also
      // be folded if their whole band collapses.
      suppressed: rung === "T3",
      soloColumn,
    };
  });

  const decisionById = new Map<string, TileDecision>();
  for (const d of tileDecisions) decisionById.set(d.id, d);

  // --- Altitude 2: per-band state ----------------------------------------
  // Group tiles by band, preserving first-seen order.
  const bandOrder: BandId[] = [];
  const bandTiles = new Map<BandId, TileSpec[]>();
  for (const tile of tiles) {
    if (!bandTiles.has(tile.band)) {
      bandTiles.set(tile.band, []);
      bandOrder.push(tile.band);
    }
    bandTiles.get(tile.band)!.push(tile);
  }

  const bandDecisions: BandDecision[] = [];
  const collapsedBands = new Set<BandId>();

  for (const band of bandOrder) {
    const members = bandTiles.get(band)!;

    // Chart-bearing tiles are the band's load-bearing charts. Counters are
    // not chart-bearing for the collapse trigger — a band of all counters
    // never "collapses" in the distribution sense. (This matches the spec's
    // framing: the trigger is about charts breaking.)
    const chartTiles = members.filter((t) => t.archetype !== "counter");
    const survivingCharts = chartTiles.filter((t) =>
      rungRendersChart(decisionById.get(t.id)!.rung),
    );

    // Band collapse trigger (LOCKED, spec Locked decision 2): collapses when
    // FEWER THAN HALF its chart-bearing tiles survive. With zero chart tiles
    // there is nothing to collapse (a pure-counter band stays "full").
    const collapsed =
      chartTiles.length > 0 && survivingCharts.length * 2 < chartTiles.length;

    if (!collapsed) {
      // Band survives. Suppressed (T3) tiles still roll into the band
      // footnote rather than rendering stubs (spec §6 altitude 1→2), so we
      // gather them even for a surviving band. T2 readouts render in place.
      const hidden = members
        .filter((t) => decisionById.get(t.id)!.rung === "T3")
        .map((t) => t.id);
      bandDecisions.push({ id: band, state: "full", hiddenTileIds: hidden });
      continue;
    }

    collapsedBands.add(band);

    // Collapsed band. If it owns a surviving robust counter, degrade to a
    // band-readout (the counter stays, the charts fold). Otherwise degrade
    // to a one-line footnote.
    const ownsRobustCounter = members.some((t) => {
      if (t.archetype !== ROBUST_COUNTER || !t.bandCounter) return false;
      // The counter must itself have survived (rung T0) to anchor a readout.
      return decisionById.get(t.id)!.rung === "T0";
    });

    // Everything that isn't the surviving anchor counter folds into the
    // band footnote / readout caption.
    const hidden: string[] = [];
    for (const t of members) {
      const d = decisionById.get(t.id)!;
      const isAnchor =
        ownsRobustCounter &&
        t.archetype === ROBUST_COUNTER &&
        t.bandCounter &&
        d.rung === "T0";
      if (isAnchor) continue;
      d.suppressed = true; // folded under the band collapse
      hidden.push(t.id);
    }

    bandDecisions.push({
      id: band,
      state: ownsRobustCounter ? "band-readout" : "footnote",
      hiddenTileIds: hidden,
    });
  }

  // --- Altitude 3: page verdict ------------------------------------------
  // Films / television hand off to reviews when the Taste band collapses.
  // Connected never hands off to a single reviews query: when it thins out
  // it keeps the head-to-head counter and points to the two per-cluster
  // dashboards (spec §6 Connected exception).
  let verdict: PageVerdict = "dashboard";

  if (pageId === "connected") {
    // Connected "thins out" when its Taste-equivalent band — the
    // film-vs-TV taste comparison — collapses. We reuse the same
    // load-bearing-band signal but route to the connected variant instead
    // of a reviews handoff. If the catalog has no Taste band (connected's
    // bands are named differently), fall back to: connected-thin when the
    // band that owns the head-to-head counter is the only one left standing.
    const tasteCollapsed = collapsedBands.has(TASTE_BAND);
    // Connected's load-bearing comparison band may be named for its content
    // rather than "Taste"; treat a collapse of any band flagged via the
    // catalog as load-bearing the same way. We detect "thinned out" as: more
    // than half of all chart-bearing bands collapsed.
    const chartBands = bandDecisions.filter((b) => b.state !== "full");
    const thinnedOut =
      tasteCollapsed ||
      (bandDecisions.length > 0 && chartBands.length * 2 > bandDecisions.length);
    if (thinnedOut) verdict = "connected-thin";
  } else {
    // Films / television hand off to the reviews list only when the filtered
    // corpus itself is tiny — N ≤ HANDOFF_MAX_N surviving films / shows. The
    // corpus count is the `lifetime` band-counter's surviving-n. This replaces
    // the earlier escaped-genre signal, which over-triggered: it ejected rich
    // dashboards (every band alive, 60–124 reviews click-targets) the moment
    // one diverging tile went flat, because that signal tracked a single
    // tile's statistical viability rather than whole-page value. A raw-N gate
    // keeps the dashboard whenever there's anything to explore — including
    // self-referenced slices (filter BY genre but still a deep corpus) and the
    // deep T-state readouts — and hands off only when the slice can't fill a
    // chart. Zero-corpus is subsumed (0 ≤ HANDOFF_MAX_N).
    const corpusN = survivalById.get("lifetime")?.survivingN ?? 0;
    if (corpusN <= HANDOFF_MAX_N) verdict = "reviews-handoff";
  }

  return { tiles: tileDecisions, bands: bandDecisions, verdict };
}

// ---------------------------------------------------------------------------
// Page tile catalogs (derived from the page sources per spec §5 + the
// tile→archetype→band map in the build brief). These are the static inputs
// to `collapse` — the runtime supplies only the per-tile surviving-n.
//
// Composite "counter+bar" tiles (Language × country) are recorded by their
// fragile sub-component (the bar → single-axis-bar) for the floor. Where the
// spec names a band's robust counter (Lifetime, World cinema lean), it is
// flagged `bandCounter: true` so the band can degrade to a band-readout.
// ---------------------------------------------------------------------------

export const FILMS_TILES: TileSpec[] = [
  // The corpus
  { id: "lifetime", archetype: "counter", band: "The corpus", bandCounter: true },
  // Navigational: each rating bar links to reviews at that rating → immortal.
  { id: "rating-distribution", archetype: "single-axis-bar", band: "The corpus", immortal: true },
  // Taste (load-bearing). genres is navigational (each bar → genre-filtered
  // reviews) → immortal. genres-vs-baseline is the taste CLAIM: it gates on its
  // escaped-genre count (floor 2), not the diverging archetype floor of 15.
  // (The page handoff is now a raw corpus-size gate, not this tile's floor.)
  { id: "genres", archetype: "single-axis-bar", band: "Taste", immortal: true },
  { id: "genres-vs-baseline", archetype: "diverging", band: "Taste", floor: 2 },
  // Cast, crew, and franchises — the entity breakdowns (versus charts).
  { id: "actors", archetype: "versus", band: "Cast, Crew, and Franchises" },
  { id: "writers", archetype: "versus", band: "Cast, Crew, and Franchises" },
  { id: "directors", archetype: "versus", band: "Cast, Crew, and Franchises" },
  { id: "collections", archetype: "versus", band: "Cast, Crew, and Franchises" },
  // How I stack up — the rating-gap counters live in their OWN band so they
  // survive a collapse of the entity charts above (a counters-only band can't
  // collapse: the trigger needs at least one chart tile). Filtering to one
  // director thins the charts but makes the comparison more interesting, not
  // less, so it must not be swept into the charts' footnote. Each counter gates
  // on its own score's coverage, set in filmTileSurvival.
  { id: "me-vs-critics", archetype: "counter", band: "How I Stack Up" },
  { id: "me-vs-people", archetype: "counter", band: "How I Stack Up" },
  // Where it comes from
  { id: "world-cinema-lean", archetype: "counter", band: "Where it comes from", bandCounter: true },
  // Language × country is a composite counter+bar → classified by the bar.
  { id: "language-x-country", archetype: "single-axis-bar", band: "Where it comes from" },
  { id: "languages", archetype: "versus", band: "Where it comes from" },
  { id: "countries", archetype: "versus", band: "Where it comes from" },
  // Distribution
  { id: "theatrical-vs-streaming", archetype: "counter", band: "Distribution", bandCounter: true },
  { id: "studios", archetype: "versus", band: "Distribution" },
  { id: "by-conglomerate", archetype: "versus", band: "Distribution" },
  { id: "release-type-by-year", archetype: "stacked-by-year", band: "Distribution" },
  { id: "budget-tier-by-year", archetype: "stacked-by-year", band: "Distribution" },
  { id: "release-type-x-era", archetype: "heatmap", band: "Distribution" },
  { id: "budget-tier-x-era", archetype: "heatmap", band: "Distribution" },
  // When I watch
  { id: "watch-pace", archetype: "line", band: "When I watch" },
  { id: "watched-by-month", archetype: "stacked-by-year", band: "When I watch" },
  { id: "watched-by-weekday", archetype: "stacked-by-year", band: "When I watch" },
];

export const TV_TILES: TileSpec[] = [
  // The corpus
  { id: "lifetime", archetype: "counter", band: "The corpus", bandCounter: true },
  { id: "rating-distribution-by-level", archetype: "single-axis-bar", band: "The corpus" },
  { id: "type", archetype: "donut", band: "The corpus" },
  // Taste (load-bearing). NOTE: television's Taste tiles still use the original
  // floors/survival metric (genres floored, genres-vs-baseline on raw corpus)
  // pending the television section walkthrough. The page handoff is now a raw
  // corpus-size gate (HANDOFF_MAX_N), shared with films.
  { id: "genres", archetype: "single-axis-bar", band: "Taste" },
  { id: "genres-vs-baseline", archetype: "diverging", band: "Taste" },
  // People
  { id: "actors", archetype: "versus", band: "People" },
  { id: "creators", archetype: "versus", band: "People" },
  // Where it comes from
  { id: "world-cinema-lean", archetype: "counter", band: "Where it comes from", bandCounter: true },
  { id: "language-x-country", archetype: "single-axis-bar", band: "Where it comes from" },
  { id: "languages", archetype: "versus", band: "Where it comes from" },
  { id: "countries", archetype: "versus", band: "Where it comes from" },
  // How it reached me
  { id: "networks", archetype: "versus", band: "How it reached me" },
  { id: "by-conglomerate", archetype: "versus", band: "How it reached me" },
  { id: "shows-across-networks", archetype: "single-axis-bar", band: "How it reached me" },
  // When I watch
  { id: "season-pace", archetype: "line", band: "When I watch" },
  { id: "seasons-by-month", archetype: "stacked-by-year", band: "When I watch" },
  { id: "seasons-by-weekday", archetype: "stacked-by-year", band: "When I watch" },
  { id: "episodes-by-month", archetype: "single-axis-bar", band: "When I watch" },
];

export const CONNECTED_TILES: TileSpec[] = [
  // Head to head — the always-surviving counter (n≥1 per side) that
  // connected keeps when it thins out.
  { id: "films-vs-television", archetype: "counter", band: "Head to head", bandCounter: true },
  // Film vs. television
  { id: "genres-film-vs-tv", archetype: "dumbbell", band: "Film vs. television" },
  { id: "crossover-actors", archetype: "versus", band: "Film vs. television" },
  // Where it comes from
  { id: "world-cinema-lean", archetype: "counter", band: "Where it comes from", bandCounter: true },
  { id: "languages", archetype: "versus", band: "Where it comes from" },
  { id: "countries", archetype: "versus", band: "Where it comes from" },
  { id: "language-x-country", archetype: "single-axis-bar", band: "Where it comes from" },
  // The industry
  { id: "by-conglomerate", archetype: "stacked-by-year", band: "The industry" },
  // When I watch
  { id: "film-and-tv-by-month", archetype: "stacked-by-year", band: "When I watch" },
  { id: "by-weekday", archetype: "stacked-by-year", band: "When I watch" },
];
