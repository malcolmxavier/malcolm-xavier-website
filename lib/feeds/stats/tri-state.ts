// ─────────────────────────────────────────────────────────────────
// Tri-state filter vocabulary (STATS-FILTERS-SPEC §2).
//
// A stats-page filter value is one of three states. Unlike the reviews
// rails (binary include-only, expressed with aria-pressed), the stats
// filters are a boolean expression: a value can be required present
// (include → OR within its dimension) or required absent (exclude →
// AND NOT). "neutral" means the value is not part of the query.
//
// This module is the single source of truth for the state vocabulary and
// the Style-A cycle order. It is pure and client-safe — the chip
// component drives the visual; the URL layer (filter-url.ts) maps these
// states onto the include/exclude slug arrays.
// ─────────────────────────────────────────────────────────────────

export type TriState = "neutral" | "include" | "exclude";

// Style A (locked): one control per value, click cycles
// neutral → include → exclude → neutral. Exclusion is the rarer third
// stop, reached deliberately by clicking through include.
export function nextTriState(current: TriState): TriState {
  switch (current) {
    case "neutral":
      return "include";
    case "include":
      return "exclude";
    case "exclude":
      return "neutral";
  }
}

// The accessible-name fragment for the current state plus the action the
// next click performs (STATS-FILTERS-SPEC §8 — aria-pressed cannot carry
// three states, so the label must name the state and the next action).
// `value` is the human-readable value name (e.g. "Horror").
export function triStateAriaLabel(value: string, current: TriState): string {
  switch (current) {
    case "neutral":
      return `${value}: not filtered — activate to include`;
    case "include":
      return `${value}: included — activate to exclude`;
    case "exclude":
      return `${value}: excluded — activate to clear`;
  }
}
