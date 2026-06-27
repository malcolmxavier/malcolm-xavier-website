// ─────────────────────────────────────────────────────────────────
// DismissableChip — a filled pill with a trailing × that removes one
// active filter dimension. Single-button affordance (tapping anywhere
// removes it). Visual treatment matches Chip's active state so the user
// reads these as "currently applied."
//
// The fill uses --text-action (not --primary-default): the film cluster
// bumps --text-action to --primary-700 so white-on-fill clears SC 1.4.3,
// and using --primary-default would both re-introduce the contrast bug
// and visually fork the cluster accent (the "two oranges" problem). The
// shared definition inherits whichever the active cluster scopes.
// ─────────────────────────────────────────────────────────────────

import { chipBaseStyle } from "./filter-styles";

export type DismissableChipProps = {
  label: string;
  ariaLabel: string;
  onDismiss: () => void;
  /** Cluster transition class — "film-filter-chip" or "show-filter-chip". */
  chipClassName: string;
};

export function DismissableChip({
  label,
  ariaLabel,
  onDismiss,
  chipClassName,
}: DismissableChipProps) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label={ariaLabel}
      style={{
        ...chipBaseStyle,
        background: "var(--text-action)",
        color: "var(--surface-page)",
        borderColor: "var(--text-action)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
      className={`${chipClassName} hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2`}
    >
      <span>{label}</span>
      <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
        ✕
      </span>
    </button>
  );
}
