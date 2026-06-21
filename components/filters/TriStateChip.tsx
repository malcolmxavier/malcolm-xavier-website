// ─────────────────────────────────────────────────────────────────
// TriStateChip — the stats-page filter control (STATS-FILTERS-SPEC §2,
// Style A). One control per value; clicking cycles
// neutral → include → exclude → neutral. This is the bounded-rail
// affordance only; high-cardinality values are excluded through the
// summary chips (§3/§4), never a rail.
//
// Why this isn't the reviews Chip: the reviews rails are binary
// include-only and carry aria-pressed. Three states can't ride on
// aria-pressed, so this is a plain <button> whose aria-label names the
// current state AND the next action (§8), and exclude carries a
// non-color cue (a leading "−" and a strikethrough) so the state never
// rests on color alone.
//
// Visual language (all cluster-scoped tokens, so one definition renders
// inside either data-subbrand wrapper):
//   neutral  → transparent fill, body text, --border-interactive outline
//              (identical to the reviews Chip's inactive state)
//   include  → --text-action fill, inverted text (identical to Chip
//              active — the common, positive path reads the same as the
//              reviews surface)
//   exclude  → --text-error fill, inverted text, strikethrough label,
//              leading "−" (a distinct hue PLUS the non-color cue)
//
// include and exclude are both filled so they read as equally "active"
// against a neutral outline; the strike + "−" disambiguate the two
// without relying on the orange-vs-red distinction.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { chipBaseStyle } from "./filter-styles";
import { triStateAriaLabel, type TriState } from "@/lib/feeds/stats/tri-state";

export type TriStateChipProps = {
  /** Current state of this value. */
  state: TriState;
  /** Advance to the next state (parent owns the cycle via nextTriState). */
  onCycle: () => void;
  /** The visible value label, e.g. "Horror". */
  children: ReactNode;
  /** Plain value name for the accessible label, e.g. "Horror". */
  valueName: string;
  /** Cluster transition class — "film-filter-chip" or "show-filter-chip". */
  chipClassName: string;
};

export function TriStateChip({
  state,
  onCycle,
  children,
  valueName,
  chipClassName,
}: TriStateChipProps) {
  const isInclude = state === "include";
  const isExclude = state === "exclude";

  // Fill / text / border per state. Include mirrors the reviews Chip
  // active state exactly; exclude swaps the accent for the error hue but
  // keeps the same inverted-text contrast posture (--surface-page on a
  // text-weight token, the pairing Chip already proves clears SC 1.4.3).
  const background = isInclude
    ? "var(--text-action)"
    : isExclude
      ? "var(--text-error)"
      : "transparent";
  const color = isInclude || isExclude ? "var(--surface-page)" : "var(--text-body)";
  const borderColor = isInclude
    ? "var(--text-action)"
    : isExclude
      ? "var(--text-error)"
      : "var(--border-interactive)";

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={triStateAriaLabel(valueName, state)}
      style={{
        ...chipBaseStyle,
        background,
        color,
        borderColor,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
      className={`${chipClassName} hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2`}
    >
      {/* The non-color cue for exclude: a leading "−" glyph. aria-hidden
          because the aria-label already states "excluded". */}
      {isExclude && (
        <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
          −
        </span>
      )}
      {/* Strikethrough is the second, redundant non-color cue on exclude. */}
      <span style={{ textDecoration: isExclude ? "line-through" : "none" }}>
        {children}
      </span>
    </button>
  );
}
