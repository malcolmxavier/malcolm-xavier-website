// ─────────────────────────────────────────────────────────────────
// FilterRail — one bounded dimension's tri-state rail
// (STATS-FILTERS-SPEC §3). Wraps FilterRow (the labelled role="group"
// wrapper the reviews shell already uses) around a flex-wrap of
// TriStateChips, one per value.
//
// This is presentational: the parent owns the {value → TriState} map and
// the cycle handler, so the same rail renders identically in the desktop
// sidebar and the mobile drawer (the shells render their filter content
// twice, exactly as the reviews FilterContent does). High-cardinality
// dimensions never use this rail — they go through the omnibox + summary
// chips (§3/§4).
// ─────────────────────────────────────────────────────────────────

import { FilterRow } from "./FilterRow";
import { TriStateChip } from "./TriStateChip";
import type { TriState } from "@/lib/feeds/stats/tri-state";

// One selectable value on the rail. `slug` is the stable URL token;
// `label` is the human-readable chip text (already Title-Cased upstream).
export type FilterRailValue = {
  slug: string;
  label: string;
  state: TriState;
};

export type FilterRailProps = {
  /** Rail heading, e.g. "Genre". */
  label: string;
  /** Cluster id namespace for FilterRow's generated labelId. */
  idPrefix: string;
  /** Cluster transition class — "film-filter-chip" or "show-filter-chip". */
  chipClassName: string;
  /** The rail's values, in display order. */
  values: ReadonlyArray<FilterRailValue>;
  /** Advance one value to its next tri-state. */
  onCycle: (slug: string) => void;
};

export function FilterRail({
  label,
  idPrefix,
  chipClassName,
  values,
  onCycle,
}: FilterRailProps) {
  // A dimension with no values (e.g. the corpus has none after an upstream
  // narrowing) renders nothing rather than an empty labelled group.
  if (values.length === 0) return null;

  return (
    <FilterRow label={label} idPrefix={idPrefix}>
      {values.map((v) => (
        <TriStateChip
          key={v.slug}
          state={v.state}
          onCycle={() => onCycle(v.slug)}
          valueName={v.label}
          chipClassName={chipClassName}
        >
          {v.label}
        </TriStateChip>
      ))}
    </FilterRow>
  );
}
