// ─────────────────────────────────────────────────────────────────
// SummaryFilterChip — the high-cardinality value chip that lives in the
// stats active-filter summary (STATS-FILTERS-SPEC §3/§4, Style B).
//
// High-cardinality dimensions (people, studios, networks, collections)
// have no rail — they're selected by name through the omnibox and land
// here as chips. Style B (the locked split — cycling Style A stays on the
// bounded rails) here means:
//   • clicking the PILL BODY toggles include ⇄ exclude (one large target
//     for the common act)
//   • a circular × floated over the pill's top-right corner removes the
//     value entirely (a removable-tag idiom that keeps the body a clean
//     toggle target)
// There is no +/− control: the body is the toggle.
//
// This is a sibling of DismissableChip, NOT an extension of it: the
// reviews "Active filters" rail still uses the single-button
// DismissableChip and must stay binary/untouched (locked decision §11
// #6). Sharing chipBaseStyle keeps the two visually consistent.
//
// The × is a SEPARATE sibling button (you can't nest a button in a
// button), positioned over the corner so it doesn't swallow body clicks.
//
// State cue matches TriStateChip: include → accent fill; exclude →
// error-hue fill, strikethrough label, leading "−" (a non-color cue, so
// exclude never rests on color alone — §8).
// ─────────────────────────────────────────────────────────────────

import { chipBaseStyle } from "./filter-styles";

export type SummaryFilterChipProps = {
  /** Human-readable value, e.g. "United States" or "Christopher Nolan". */
  label: string;
  /** true = excluded (AND NOT); false = included (OR). */
  excluded: boolean;
  /** Flip include ⇄ exclude (fired by clicking the pill body). */
  onToggle: () => void;
  /** Drop the value from the query entirely (fired by the ×). */
  onRemove: () => void;
  /** Cluster transition class — "film-filter-chip" or "show-filter-chip". */
  chipClassName: string;
};

// Remove-button sizing: WCAG 2.2 SC 2.5.8 wants ≥24px targets.
const REMOVE_TARGET = 24;

export function SummaryFilterChip({
  label,
  excluded,
  onToggle,
  onRemove,
  chipClassName,
}: SummaryFilterChipProps) {
  // Fill + text mirror TriStateChip's include/exclude treatment so the two
  // surfaces read as one system. Both states are filled (the value is
  // active either way); strike + leading "−" disambiguate exclude.
  const background = excluded ? "var(--text-error)" : "var(--text-action)";

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        // The corner bubble overflows the body; don't clip it.
        overflow: "visible",
      }}
    >
      {/* The pill body — the whole thing is the include⇄exclude toggle. */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={
          excluded
            ? `${label}: excluded — activate to include`
            : `${label}: included — activate to exclude`
        }
        style={{
          ...chipBaseStyle,
          background,
          color: "var(--surface-page)",
          borderColor: background,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          // The bubble's inner ~16px sits over the pill's right edge, so the
          // body needs enough right padding that the × never covers the last
          // characters of the label.
          paddingRight: 18,
        }}
        className={`${chipClassName} hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2`}
      >
        {/* Leading "−": the non-color exclude cue, shown only when excluded. */}
        {excluded && (
          <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
            −
          </span>
        )}
        <span style={{ textDecoration: excluded ? "line-through" : "none" }}>
          {label}
        </span>
      </button>

      {/* The remove × — a circular "cutout" badge (page-surface fill +
          interactive border + body-color glyph) floated over the top-right
          corner so it reads as a distinct affordance on the colored pill. */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        style={{
          position: "absolute",
          top: -8,
          right: -8,
          width: REMOVE_TARGET,
          height: REMOVE_TARGET,
          borderRadius: 999,
          background: "var(--surface-page)",
          border: "1px solid var(--border-interactive)",
          color: "var(--text-body)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          lineHeight: 1,
          padding: 0,
          outlineColor: "var(--border-focus)",
        }}
        className="hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span aria-hidden="true" style={{ fontSize: 13 }}>
          ✕
        </span>
      </button>
    </span>
  );
}
