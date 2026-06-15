// ─────────────────────────────────────────────────────────────────
// Chip — a toggle button for a single filter value (rating, genre,
// facet option). Shared by both cluster shells; each binds its own
// `chipClassName` (film-filter-chip / show-filter-chip) which carries
// the transition + prefers-reduced-motion override in components.css.
//
// Active state fills with --text-action (the cluster's contrast-safe
// interactive accent) and flips text to --surface-page; inactive keeps
// a --border-interactive outline (the sole SC 1.4.11 boundary).
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { chipBaseStyle } from "./filter-styles";

export type ChipProps = {
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
  ariaLabel?: string;
  /** Cluster transition class — "film-filter-chip" or "show-filter-chip". */
  chipClassName: string;
};

export function Chip({
  isActive,
  onClick,
  children,
  ariaLabel,
  chipClassName,
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={ariaLabel}
      style={{
        ...chipBaseStyle,
        background: isActive ? "var(--text-action)" : "transparent",
        color: isActive ? "var(--surface-page)" : "var(--text-body)",
        // Inactive borderColor mirrors chipBaseStyle's border — both
        // must be --border-interactive for SC 1.4.11.
        borderColor: isActive
          ? "var(--text-action)"
          : "var(--border-interactive)",
      }}
      className={`${chipClassName} hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2`}
    >
      {children}
    </button>
  );
}
